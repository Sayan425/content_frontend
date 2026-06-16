import React, { useState } from 'react';

export function SubtitlesPanel({ config, setConfig, editId }) {
    if (!config || !config.subtitleData) {
        return (
            <div className="flex flex-col h-full bg-surface-container/50">
                <div className="p-6">
                    <p className="text-on-surface-variant">No subtitles available in this manifest.</p>
                </div>
            </div>
        );
    }

    const { subtitleData } = config;

    const handleUpdateBlock = (index, field, value) => {
        const newData = [...subtitleData];
        newData[index] = { ...newData[index], [field]: value };
        
        // If text is updated, we must override the words array so the renderer matches
        if (field === 'text') {
            newData[index].words = [{
                start: newData[index].start,
                end: newData[index].end,
                text: value
            }];
        }
        
        // Also update timing of the single word if start/end changes and there's only one word
        if ((field === 'start' || field === 'end') && newData[index].words?.length === 1) {
            newData[index].words[0][field] = value;
        }

        updateConfigData(newData);
    };

    const updateConfigData = (newData) => {
        const newConfig = { ...config, subtitleData: newData };
        setConfig(newConfig);

        // Sync to Supabase via custom event or let a parent component handle it
        // The PhoneMockup or EditQueue wrapper usually listens to config changes or we can dispatch an event
        if (window.updateSupabaseManifest) {
            window.updateSupabaseManifest(newConfig);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-container sticky top-0 z-10">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">subtitles</span>
                    Subtitles Editor
                </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-2">
                <div className="flex flex-col relative">
                    {/* Vertical Timeline Line */}
                    <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-white/10" />
                    
                    {subtitleData.map((block, index) => (
                        <div key={index} className="relative flex items-center gap-3">
                            {/* Timeline Dot */}
                            <div className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center z-10">
                                <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface-container shadow-[0_0_10px_rgba(var(--color-primary),0.5)]" />
                            </div>

                            {/* Content Card (No Boxes) */}
                            <div className="flex-1 py-1 group relative">
                                <textarea 
                                    className="w-full bg-transparent text-xl font-['Caveat',cursive] text-on-surface focus:outline-none resize-none placeholder-on-surface-variant/50 leading-tight border-b border-dashed border-white/20 hover:border-white/40 focus:border-solid focus:border-primary/50 transition-colors py-1 pr-8"
                                    rows="1"
                                    value={block.text}
                                    placeholder="Subtitle text..."
                                    onChange={(e) => {
                                        handleUpdateBlock(index, 'text', e.target.value);
                                        // Auto-resize the textarea
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                />
                                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    edit
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
