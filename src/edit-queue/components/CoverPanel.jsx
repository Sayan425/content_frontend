import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { showCustomAlert } from '../../../components/notifications.js';
import { MediaAiPicker } from './MediaAiPicker';

/**
 * Cover Image panel: shows the current cover (9:16 thumbnail) for this content
 * and lets the user replace it. The cover lives in
 * content_pipeline.cover_image (a URL), separate from the edit_queue manifest.
 */
export function CoverPanel({ config, editId }) {
    const [coverUrl, setCoverUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
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
            if (error) console.error('Failed to load cover image:', error);
            setCoverUrl(data?.cover_image || null);
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
            let customPublicUrlBase = 'https://pub-2003936f6b0342a8afd9e538b2f27d12.r2.dev';

            if (config?.videoUrl) {
                const urlObj = new URL(config.videoUrl);
                customPublicUrlBase = urlObj.origin;
                const parts = urlObj.pathname.split('/').filter(Boolean);
                if (parts.length >= 2) {
                    customPath = `${decodeURIComponent(parts[0])}/${decodeURIComponent(parts[1])}/cover/`;
                }
            }

            const res = await fetch('/api/get-r2-upload-url', {
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

            const { error: dbError } = await supabase
                .from('content_pipeline')
                .update({ cover_image: data.publicUrl })
                .eq('content_id', editId);
            if (dbError) throw dbError;

            setCoverUrl(data.publicUrl);
        } catch (err) {
            showCustomAlert(err.message, 'Cover Upload Error');
        } finally {
            setUploading(false);
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
                <div className="mx-auto w-[200px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-black/50 flex items-center justify-center relative">
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
                <div className="flex gap-2 mt-5">
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 h-16 bg-surface-container border border-dashed border-white/20 rounded-xl text-on-surface-variant hover:text-white hover:border-white/40 transition flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[22px]">{uploading ? 'progress_activity' : 'upload'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{coverUrl ? 'Replace Cover' : 'Upload Cover'}</span>
                    </button>
                    <button
                        onClick={() => setShowMediaAi(true)}
                        className="flex-1 h-16 bg-primary/5 border border-dashed border-primary/30 rounded-xl text-primary/80 hover:text-primary hover:border-primary hover:bg-primary/10 transition flex flex-col items-center justify-center gap-1 group"
                    >
                        <span className="material-symbols-outlined text-[22px] group-hover:rotate-12 transition-transform">auto_awesome</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">AI Gen</span>
                    </button>
                </div>
            </section>

            <MediaAiPicker open={showMediaAi} onClose={() => setShowMediaAi(false)} />
        </div>
    );
}
