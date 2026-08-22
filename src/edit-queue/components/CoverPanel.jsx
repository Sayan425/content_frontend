import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/apiFetch';
import { showCustomAlert } from '../../../components/notifications.js';
import { MediaAiPicker } from './MediaAiPicker';
import { markLocalSave } from '../utils/localSaveTracker';

/**
 * Cover Image panel: shows the current cover (9:16 thumbnail) for this content
 * and lets the user replace it. The cover lives in
 * content_pipeline.cover_image (a URL), separate from the edit_queue manifest.
 */
export function CoverPanel({ config, editId }) {
    const [coverUrl, setCoverUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showMediaAi, setShowMediaAi] = useState(false);
    const fileRef = React.useRef(null);

    useEffect(() => {
        if (!editId) return;
        let alive = true;
        setLoading(true);
        (async () => {
            const { data, error } = await supabase
                .from('content_pipeline')
                .select('cover_image')
                .eq('content_id', editId)
                .single();
            if (!alive) return;
            let url = data?.cover_image || null;
            if (!url) {
                const { data: eq } = await supabase
                    .from('edit_queue')
                    .select('cover_image')
                    .eq('content_id', editId)
                    .single();
                if (!alive) return;
                url = eq?.cover_image || null;
            }
            if (error && !url) console.error('Failed to load cover image:', error);
            setCoverUrl(url);
            setLoading(false);
        })();
        return () => { alive = false; };
    }, [editId]);

    const uploadCover = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            // Destination: <avatar>/<topic>/cover/ in the video-folder bucket,
            // derived from the main video URL (same convention as overlays).
            let customBucket = 'video-folder';
            let customPath = '';
            let customPublicUrlBase = 'https://videos.youravatarstudio.com';

            if (config?.videoUrl) {
                const urlObj = new URL(config.videoUrl);
                customPublicUrlBase = urlObj.origin;
                const parts = urlObj.pathname.split('/').filter(Boolean);
                if (parts.length >= 2) {
                    customPath = `${decodeURIComponent(parts[0])}/${decodeURIComponent(parts[1])}/cover/`;
                }
            }

            const res = await apiFetch('/api/get-r2-upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || 'image/jpeg',
                    type: 'overlay',
                    customBucket,
                    customPath,
                    customPublicUrlBase,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const uploadRes = await fetch(data.signedUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type || 'image/jpeg' },
            });
            if (!uploadRes.ok) throw new Error('Upload to R2 failed');

            // This tab is about to write edit_queue. Flag it so PhoneMockup's
            // realtime subscription treats the resulting event as an echo of
            // our own save instead of an external change worth reloading from.
            markLocalSave();

            const [{ error: cpError }, { error: eqError }] = await Promise.all([
                supabase.from('content_pipeline').update({ cover_image: data.publicUrl }).eq('content_id', editId),
                supabase.from('edit_queue').update({ cover_image: data.publicUrl }).eq('content_id', editId),
            ]);
            if (cpError) throw cpError;
            if (eqError) throw eqError;

            setCoverUrl(data.publicUrl);
        } catch (err) {
            showCustomAlert(err.message, 'Cover Upload Error');
        } finally {
            setUploading(false);
        }
    };

    // Fetch into a blob first: the `download` attribute is ignored on
    // cross-origin URLs, which would open the image instead of saving it.
    const downloadCover = async () => {
        if (!coverUrl || downloading) return;
        setDownloading(true);
        let objectUrl = null;
        try {
            const res = await fetch(coverUrl);
            if (!res.ok) throw new Error(`Server responded ${res.status}`);
            const blob = await res.blob();
            objectUrl = URL.createObjectURL(blob);

            const ext = (coverUrl.split('?')[0].match(/\.(jpe?g|png|webp)$/i) || [null, 'jpg'])[1];
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `cover-${editId || 'video'}.${ext.toLowerCase()}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            showCustomAlert(`Could not download the cover: ${err.message}`, 'Download Error');
        } finally {
            // Always release the blob so it is not held for the whole session.
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto custom-scrollbar">
            <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
                <h4 className="text-on-surface font-semibold mb-1 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">image</span>
                    Cover Image
                </h4>
                <p className="text-xs text-on-surface-variant mb-4">
                    The thumbnail shown for this video in Edit Suite and Completed Videos.
                </p>

                {/* Current cover preview (9:16) */}
                <div className="mx-auto w-[280px] max-w-full aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-black/50 flex items-center justify-center relative">
                    {loading ? (
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant animate-spin">progress_activity</span>
                    ) : coverUrl ? (
                        <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-on-surface-variant/50">
                            <span className="material-symbols-outlined text-4xl">broken_image</span>
                            <span className="text-[11px] uppercase tracking-widest">No cover yet</span>
                        </div>
                    )}
                    {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
                        </div>
                    )}
                </div>

                {/* Replace actions */}
                <input
                    type="file"
                    ref={fileRef}
                    className="hidden"
                    accept="image/*"
                    onChange={e => { const f = e.target.files[0]; if (f) uploadCover(f); e.target.value = ''; }}
                />
                <div className="grid grid-cols-3 gap-2 mt-5">
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="h-16 bg-surface-container border border-dashed border-white/20 rounded-xl text-on-surface-variant hover:text-white hover:border-white/40 transition flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[22px]">{uploading ? 'progress_activity' : 'upload'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{coverUrl ? 'Replace Cover' : 'Upload Cover'}</span>
                    </button>
                    <button
                        onClick={() => setShowMediaAi(true)}
                        className="h-16 bg-primary/5 border border-dashed border-primary/30 rounded-xl text-primary/80 hover:text-primary hover:border-primary hover:bg-primary/10 transition flex flex-col items-center justify-center gap-1 group"
                    >
                        <span className="material-symbols-outlined text-[22px] group-hover:rotate-12 transition-transform">auto_awesome</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">AI Gen</span>
                    </button>
                    <button
                        onClick={downloadCover}
                        disabled={!coverUrl || downloading}
                        title="Download cover image"
                        className="h-16 bg-surface-container border border-dashed border-white/20 rounded-xl text-on-surface-variant hover:text-white hover:border-white/40 transition flex flex-col items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-on-surface-variant disabled:hover:border-white/20"
                    >
                        <span className={`material-symbols-outlined text-[22px] ${downloading ? 'animate-spin' : ''}`}>
                            {downloading ? 'progress_activity' : 'download'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Download</span>
                    </button>
                </div>
            </section>

            <MediaAiPicker open={showMediaAi} onClose={() => setShowMediaAi(false)} editId={editId} />
        </div>
    );
}
