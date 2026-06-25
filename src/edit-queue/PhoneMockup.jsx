import React, { useEffect, useState, useRef } from 'react';
import { Player } from '@remotion/player';
import { RemotionVideo } from './RemotionVideo';
import { resolveAssetUrl } from './utils/assetResolver';
import { getVideoMetadata } from '@remotion/media-utils';
import { supabase } from '../lib/supabase';
import { preloadVideo, preloadImage, preloadAudio } from '@remotion/preload';

export function PhoneMockup({ config, setConfig, editId }) {
  const videoWidth = 1080;
  const videoHeight = 1920;
  
  const [durationInFrames, setDurationInFrames] = useState(1702); // Fallback to 68s at 25fps
  const [loading, setLoading] = useState(!config);
  const playerRef = useRef(null);

  useEffect(() => {
    const handleSeek = (e) => {
      if (playerRef.current && e.detail && e.detail.timeInSeconds !== undefined) {
        // Find fps from config if possible, else default to 25
        const fps = 25; 
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

    console.log("Loading video manifest from Supabase for edit_id:", editId);
    
    // Function to parse and set config from raw database data
    const processAndSetConfig = async (data) => {
      let manifestData = {};
      try {
        manifestData = typeof data.manifest === 'string' ? JSON.parse(data.manifest) : (data.manifest || {});
      } catch (e) {
        console.error("Error parsing manifest:", e);
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
      
      const hasMotionGraphic = manifestData.overlays.some(o => o.type === 'MotionGraphic');
      if (!hasMotionGraphic) {
        manifestData.overlays.push({
          type: 'MotionGraphic',
          startInSeconds: 1,
          durationInSeconds: 10,
          position: { x: 50, y: 50, scale: 100, rotation: 0 },
          props: {
            prompt: 'A glowing AI text that scales up with a spring animation and bounces up and down smoothly.',
            code: `
              const scale = spring({
                fps,
                frame,
                config: { damping: 10, stiffness: 100 }
              });
              const yOffset = Math.sin(frame / 10) * 50;
              return (
                <div style={{
                  color: '#00ffff',
                  fontSize: '120px',
                  fontWeight: 'bold',
                  textShadow: '0 0 40px rgba(0, 255, 255, 0.8)',
                  transform: \`scale(\${scale}) translateY(\${yOffset}px)\`
                }}>
                  AI
                </div>
              );
            `
          }
        });
      }

      // Preload assets to prevent white flashes
      try {
        if (manifestData.videoUrl) preloadVideo(resolveAssetUrl(manifestData.videoUrl));
        if (manifestData.backgroundMusicUrl) preloadAudio(resolveAssetUrl(manifestData.backgroundMusicUrl));
        
        manifestData.overlays.forEach(overlay => {
            const url = resolveAssetUrl(overlay.props.src || overlay.props.url);
            if (url) {
                if (overlay.type === 'Video') preloadVideo(url);
                if (overlay.type === 'Image') preloadImage(url);
            }
        });
      } catch (preloadErr) {
        console.warn("Preloading error:", preloadErr);
      }

      setConfig(manifestData);
      setLoading(false);
      
      try {
        const resolvedVideo = resolveAssetUrl(manifestData.videoUrl);
        const metadata = await getVideoMetadata(resolvedVideo);
        const frames = Math.ceil(metadata.durationInSeconds * 25);
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
          if (payload.new) {
            await processAndSetConfig(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log("Supabase Realtime subscription status:", status);
      });

    return () => {
      console.log("Removing Supabase Realtime subscription");
      supabase.removeChannel(channel);
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
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
              <span className="text-sm font-mono-label">Loading Video Config...</span>
            </div>
          ) : (
            <Player
              ref={playerRef}
              component={RemotionVideo}
              inputProps={{ config }}
              durationInFrames={durationInFrames}
              compositionWidth={videoWidth}
              compositionHeight={videoHeight}
              fps={25}
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
