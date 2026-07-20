import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';

export const ICON_BASE = 'https://assets.youravatarstudio.com/icons';

export const MEDIA_AI_PROVIDERS = [
    { name: 'ChatGPT', kind: 'Image', icon: `${ICON_BASE}/ChatGPT%20logo.svg`, url: 'https://chatgpt.com/' },
    { name: 'Google Flow', kind: 'Image & Video', icon: `${ICON_BASE}/google%20flow%20logo.png`, url: 'https://labs.google/flow/' },
    { name: 'Higgsfield', kind: 'Video', icon: `${ICON_BASE}/higgsfield%20icon.jpg`, url: 'https://higgsfield.ai/' },
    { name: 'Midjourney', kind: 'Image', icon: `${ICON_BASE}/midjourney%20icon.webp`, url: 'https://www.midjourney.com/' },
    { name: 'Leonardo AI', kind: 'Image', icon: `${ICON_BASE}/leonardo%20ai%20icon.jpg`, url: 'https://leonardo.ai/' },
    { name: 'Runway', kind: 'Video', icon: `${ICON_BASE}/runway%20ml%20icon.png`, url: 'https://runwayml.com/' },
];

export function MediaAiPicker({ open, onClose, editId }) {
    const [avatarLooks, setAvatarLooks] = useState(null);
    const [looksOpen, setLooksOpen] = useState(false);

    useEffect(() => {
        if (!open || !editId) return;
        let alive = true;
        (async () => {
            const { data: editData } = await supabase
                .from('edit_queue')
                .select('owner_avatar_id')
                .eq('content_id', editId)
                .single();
            if (!alive || !editData?.owner_avatar_id) return;

            const { data: avatarData } = await supabase
                .from('avatar_details')
                .select('name, base_look, other_looks')
                .eq('avatar_id', editData.owner_avatar_id)
                .single();
            if (!alive) return;
            if (avatarData) setAvatarLooks(avatarData);
        })();
        return () => { alive = false; };
    }, [open, editId]);

    if (!open) return null;

    const openProvider = (p) => {
        window.open(p.url, '_blank', 'noopener,noreferrer');
        onClose();
    };

    const allLooks = [];
    if (avatarLooks?.base_look) {
        allLooks.push({ name: 'Default Look', url: avatarLooks.base_look });
    }
    if (Array.isArray(avatarLooks?.other_looks)) {
        avatarLooks.other_looks.forEach((look, idx) => {
            const url = look.image_url || look.image || look.url || look.link || look.look;
            if (url) allLooks.push({ name: look.name || `Look ${idx + 1}`, url });
        });
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-surface-container-highest w-full max-w-[440px] rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-white/5 flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-on-surface font-bold text-base flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                            Where do you want to create the media?
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-1">
                            Opens the tool in a new tab. Create your asset there, then come back and upload it.
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">close</span>
                    </button>
                </div>

                <div className="p-3 grid grid-cols-1 gap-1.5 max-h-[60vh] overflow-y-auto">
                    {MEDIA_AI_PROVIDERS.map(p => (
                        <button
                            key={p.name}
                            onClick={() => openProvider(p)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-primary/10 transition-colors group"
                        >
                            <img src={p.icon} alt={p.name} className="w-9 h-9 rounded-lg object-cover bg-white/5 shrink-0" />
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm text-on-surface font-medium group-hover:text-primary">{p.name}</span>
                                <span className="block text-[11px] text-on-surface-variant">{p.kind} generation</span>
                            </span>
                            <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary">open_in_new</span>
                        </button>
                    ))}
                </div>

                {allLooks.length > 0 && (
                    <div className="border-t border-white/5 px-4 py-3">
                        <button
                            onClick={() => setLooksOpen(!looksOpen)}
                            className="w-full flex items-center gap-2 text-left group"
                        >
                            <span className="material-symbols-outlined text-primary text-[18px]">face</span>
                            <span className="flex-1 text-sm text-on-surface font-medium">
                                Need reference images of your character?
                            </span>
                            <span className="material-symbols-outlined text-sm text-on-surface-variant transition-transform" style={{ transform: looksOpen ? 'rotate(180deg)' : 'none' }}>
                                expand_more
                            </span>
                        </button>

                        {looksOpen && (
                            <div className="mt-3 grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                {allLooks.map((look, i) => (
                                    <button
                                        key={i}
                                        onClick={() => window.open(look.url, '_blank', 'noopener,noreferrer')}
                                        className="group/look flex flex-col items-center gap-1"
                                        title={look.name}
                                    >
                                        <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-white/10 group-hover/look:border-primary/50 transition-all">
                                            <img
                                                src={look.url}
                                                alt={look.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                style={{ imageRendering: 'auto' }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover/look:bg-black/30 transition-all flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-[18px] opacity-0 group-hover/look:opacity-100 transition-opacity">open_in_new</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-on-surface-variant truncate w-full text-center">{look.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
