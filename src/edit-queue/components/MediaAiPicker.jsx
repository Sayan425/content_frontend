import React from 'react';
import { createPortal } from 'react-dom';

export const ICON_BASE = 'https://pub-345e8414642f4b00859c994c81be94de.r2.dev/icons';

// External services for generating image/video assets. We never generate on
// our end — clicking just opens the tool in a new tab; the user creates the
// asset there, then comes back and uploads it. Shared by the overlay editor
// and the cover-image panel.
export const MEDIA_AI_PROVIDERS = [
    { name: 'ChatGPT', kind: 'Image', icon: `${ICON_BASE}/ChatGPT%20logo.svg`, url: 'https://chatgpt.com/' },
    { name: 'Google Flow', kind: 'Image & Video', icon: `${ICON_BASE}/google%20flow%20logo.png`, url: 'https://labs.google/flow/' },
    { name: 'Higgsfield', kind: 'Video', icon: `${ICON_BASE}/higgsfield%20icon.jpg`, url: 'https://higgsfield.ai/' },
    { name: 'Midjourney', kind: 'Image', icon: `${ICON_BASE}/midjourney%20icon.webp`, url: 'https://www.midjourney.com/' },
    { name: 'Leonardo AI', kind: 'Image', icon: `${ICON_BASE}/leonardo%20ai%20icon.jpg`, url: 'https://leonardo.ai/' },
    { name: 'Runway', kind: 'Video', icon: `${ICON_BASE}/runway%20ml%20icon.png`, url: 'https://runwayml.com/' },
];

export function MediaAiPicker({ open, onClose }) {
    if (!open) return null;

    const openProvider = (p) => {
        window.open(p.url, '_blank', 'noopener,noreferrer');
        onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-surface-container-highest w-full max-w-[440px] rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-white/5">
                    <h3 className="text-on-surface font-bold text-base flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                        Where do you want to create the media?
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                        Opens the tool in a new tab. Create your asset there, then come back and upload it.
                    </p>
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
            </div>
        </div>,
        document.body
    );
}
