import React, { useEffect, useState, useRef } from 'react';
import { Player } from '@remotion/player';
import { RemotionVideo } from './RemotionVideo';
import { resolveAssetUrl } from './utils/assetResolver';
import { getVideoMetadata } from '@remotion/media-utils';
import { supabase } from '../lib/supabase';
import { isRecentLocalSave } from './utils/localSaveTracker';
import { prefetchAsset, waitForAllAssets, freeAllAssets } from './utils/assetPrefetcher';
import { normalizeManifest } from './utils/manifestNormalizer';
import { markManifestLoaded, markManifestUnsafe } from './utils/manifestGuard';

export function PhoneMockup({ config, setConfig, editId }) {
  const videoWidth = 1080;
  const videoHeight = 1920;
  
  const [durationInFrames, setDurationInFrames] = useState(1632); // Fallback to 68s at 24fps
  const [loading, setLoading] = useState(!config);
  // One-time buffer: true until the main video is fully downloaded into RAM.
  // The Player is only mounted after this, so playback can never stall on
  // the network — it reads entirely from memory.
  const [buffering, setBuffering] = useState(true);
  const playerRef = useRef(null);

  useEffect(() => {
    const handleSeek = (e) => {
      if (playerRef.current && e.detail && e.detail.timeInSeconds !== undefined) {
        // Find fps from config if possible, else default to 24
        const fps = 24;
        const frame = Math.floor(e.detail.timeInSeconds * fps);
        playerRef.current.seekTo(frame);
        playerRef.current.pause(); // Auto pause so they can see the start of the overlay
      }
    };
    window.addEventListener('remotionSeekToTime', handleSeek);
    return () => window.removeEventListener('remotionSeekToTime', handleSeek);
  }, []);

  useEffect(() => {
    if (!editId) return;

    // Reset the one-time buffer whenever we switch to a different video, so
    // the loading screen shows for the new video instead of briefly keeping
    // the previous player.
    setBuffering(true);

    // Nothing may be saved for this edit until we have read its manifest
    // cleanly at least once.
    markManifestUnsafe();

    console.log("Loading video manifest from Supabase for edit_id:", editId);

    // Function to parse and set config from raw database data
    const processAndSetConfig = async (data) => {
      let manifestData = {};
      let manifestReadOk = true;
      try {
        manifestData = typeof data.manifest === 'string' ? JSON.parse(data.manifest) : (data.manifest || {});
      } catch (e) {
        // A manifest we cannot parse must never become the basis for a save —
        // auto-save would write the empty fallback over the real row.
        console.error("Error parsing manifest:", e);
        manifestData = {};
        manifestReadOk = false;
      }

      if (data.raw_video_link && !manifestData.videoUrl) {
        manifestData.videoUrl = data.raw_video_link;
      }
      
      if (data.subtitle) {
        try {
          manifestData.subtitleData = typeof data.subtitle === 'string' ? JSON.parse(data.subtitle) : data.subtitle;
        } catch (e) {
          console.error("Error parsing subtitles:", e);
        }
      }

      if (!manifestData.overlays) {
        manifestData.overlays = [];
      }

      // Canonicalize position formats and float-noise durations
      // (see docs/MANIFEST_REFERENCE.md).
      normalizeManifest(manifestData);
      
      // Download every asset into RAM once (video, BGM, overlay media) so the
      // player never re-fetches from R2 — template switches become instant.
      try {
        if (manifestData.videoUrl) prefetchAsset(resolveAssetUrl(manifestData.videoUrl));
        if (manifestData.backgroundMusicUrl) prefetchAsset(resolveAssetUrl(manifestData.backgroundMusicUrl));

        manifestData.overlays.forEach(overlay => {
            const url = resolveAssetUrl(overlay.props?.src || overlay.props?.url);
            if (url && (overlay.type === 'Video' || overlay.type === 'Image')) {
                prefetchAsset(url);
            }
        });
      } catch (prefetchErr) {
        console.warn("Prefetching error:", prefetchErr);
      }

      setConfig(manifestData);
      setLoading(false);

      // Only now may auto-save write this edit's manifest back.
      if (manifestReadOk) {
        markManifestLoaded(editId);
      } else {
        markManifestUnsafe();
      }

      // Show "Loading" until EVERY asset (video, BGM, all overlay media) is
      // fully in memory, so nothing streams or pops in during playback.
      waitForAllAssets().finally(() => setBuffering(false));
      
      try {
        const resolvedVideo = resolveAssetUrl(manifestData.videoUrl);
        const metadata = await getVideoMetadata(resolvedVideo);
        const frames = Math.ceil(metadata.durationInSeconds * 24);
        setDurationInFrames(frames);
      } catch (metadataError) {
        console.warn("Failed to fetch video metadata, using fallback duration:", metadataError);
      }
    };

    // 1. Initial Fetch
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('edit_queue')
          .select('manifest, raw_video_link, subtitle')
          .eq('content_id', editId)
          .single();

        if (error) throw error;
        if (data) await processAndSetConfig(data);
      } catch (err) {
        console.error("Error fetching video manifest from Supabase:", err);
        setLoading(false);
      }
    };

    fetchConfig();

    // 2. Realtime Subscription
    const channel = supabase
      .channel(`edit_queue_${editId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to UPDATE, INSERT, etc.
          schema: 'public',
          table: 'edit_queue',
          filter: `content_id=eq.${editId}`
        },
        async (payload) => {
          console.log("Realtime update received for edit_queue:", payload);
          // Skip echoes of this tab's own auto-saves: local state is already
          // up to date, and rebuilding the config makes the player reload.
          if (isRecentLocalSave()) {
            console.log("Skipping realtime echo of local save");
            return;
          }

          // Postgres omits large, UNCHANGED columns from replication payloads.
          // An update that only touches e.g. cover_image or status therefore
          // arrives WITHOUT the manifest — rebuilding config from it would drop
          // every overlay, and the next auto-save would make that permanent.
          // Only rebuild from an event that actually carries a manifest.
          if (payload.errors) {
            console.warn("Ignoring realtime update with errors:", payload.errors);
            return;
          }
          if (payload.eventType !== 'UPDATE' && payload.eventType !== 'INSERT') {
            console.log("Ignoring realtime event:", payload.eventType);
            return;
          }
          const row = payload.new;
          if (!row || typeof row !== 'object' || row.manifest === undefined || row.manifest === null) {
            console.log("Ignoring realtime update that carries no manifest");
            return;
          }

          await processAndSetConfig(row);
        }
      )
      .subscribe((status) => {
        console.log("Supabase Realtime subscription status:", status);
      });

    return () => {
      console.log("Removing Supabase Realtime subscription");
      supabase.removeChannel(channel);
      // Leaving this edit: block any save that could still be queued.
      markManifestUnsafe();
      // Release the in-memory asset cache when leaving (or switching videos).
      freeAllAssets();
    };
  }, [editId, setConfig]);

  return (
    <div className="relative h-full max-h-[88vh] flex items-center justify-center py-4">
      {/* Phone Hardware Mockup */}
      <div className="relative rounded-[3rem] p-[12px] bg-gradient-to-b from-surface-container-highest to-surface-container border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_60px_-15px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] scale-[1.02] h-full aspect-[9/16] z-10">
        
        {/* Top Notch / Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[130px] h-[32px] bg-black rounded-full z-30 shadow-[0_5px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-between px-3">
            <div className="w-10 h-3 rounded-full bg-[#1a1a1a] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"></div>
            <div className="w-4 h-4 rounded-full bg-[#0a0a0a] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900/40 blur-[1px]"></div>
            </div>
        </div>

        {/* Side Buttons (Volume/Power) */}
        <div className="absolute top-32 -left-[14px] w-1.5 h-12 bg-gradient-to-r from-gray-600 to-gray-800 rounded-l-md border-y border-l border-white/10 shadow-[-2px_0_4px_rgba(0,0,0,0.5)]"></div>
        <div className="absolute top-48 -left-[14px] w-1.5 h-12 bg-gradient-to-r from-gray-600 to-gray-800 rounded-l-md border-y border-l border-white/10 shadow-[-2px_0_4px_rgba(0,0,0,0.5)]"></div>
        <div className="absolute top-40 -right-[14px] w-1.5 h-16 bg-gradient-to-l from-gray-600 to-gray-800 rounded-r-md border-y border-r border-white/10 shadow-[2px_0_4px_rgba(0,0,0,0.5)]"></div>

        {/* Screen Area */}
        <div className="rounded-[2.2rem] overflow-hidden bg-black relative h-full w-full flex items-center justify-center border-[4px] border-black shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
          {(loading || buffering) ? (
            /* One screen for both phases: fetching the manifest and loading
               every asset into memory. The player mounts only once all assets
               are in RAM, so playback never streams or pops in. */
            <div className="flex flex-col items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
              <span className="text-sm font-mono-label">Loading</span>
            </div>
          ) : (
            <Player
              ref={playerRef}
              component={RemotionVideo}
              inputProps={{ config }}
              durationInFrames={durationInFrames}
              compositionWidth={videoWidth}
              compositionHeight={videoHeight}
              fps={24}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              controls
              loop
            />
          )}
        </div>
        
        {/* Ambient Backlight (Always visible) */}
        <div className="absolute -inset-8 bg-gradient-to-tr from-primary/20 via-purple-500/10 to-secondary/20 rounded-[4rem] blur-3xl opacity-60 -z-10 pointer-events-none"></div>
        
        {/* Intense Glow (Always visible) */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-primary/40 via-purple-500/20 to-secondary/40 rounded-[3rem] blur-2xl opacity-100 -z-10 pointer-events-none mix-blend-screen"></div>
      </div>
    </div>
  );
}
