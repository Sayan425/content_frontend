import React, { useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { markLocalSave } from '../utils/localSaveTracker';
import { queueAutoSave } from '../utils/autoSaveManager';

export function SubtitlesPanel({ config, setConfig, editId }) {
    const saveTimeoutRef = useRef(null);
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

    // Rebuild the per-word list from the edited text, spreading the segment's
    // [start, end] time evenly across each word so word-by-word highlighting
    // keeps working (instead of the whole line highlighting as one big word).
    const buildWords = (text, start, end) => {
        const tokens = (text || '').trim().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return [];
        const span = (end - start) / tokens.length;
        return tokens.map((word, i) => {
            const wStart = start + span * i;
            const wEnd = start + span * (i + 1);
            return {
                word,
                text: word,
                start: Math.round(wStart * 100) / 100,
                end: Math.round(wEnd * 100) / 100,
            };
        });
    };

    const handleUpdateBlock = (index, field, value) => {
        const newData = [...subtitleData];
        const block = { ...newData[index], [field]: value };

        // Re-spread word timings whenever the text or the segment timing changes.
        block.words = buildWords(block.text, block.start, block.end);
        newData[index] = block;

        updateConfigData(newData);
    };

    const updateConfigData = (newData) => {
        setConfig(prev => {
            const updated = { ...prev, subtitleData: newData };
            autoSaveToSupabase(updated);
            return updated;
        });
    };

    // Seconds -> clock time, e.g. 72.4 becomes 00:01:12
    const toClockTime = (seconds) => {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
    };

    const filledBlocks = () => subtitleData.filter(block => (block.text || '').trim());

    // One line per cue, timings in front, so the file reads cleanly as a
    // document rather than as player markup.
    const buildTimedText = () => filledBlocks()
        .map(block => `[${toClockTime(block.start)} - ${toClockTime(block.end)}] ${block.text.trim()}`)
        .join('\n') + '\n';

    // Just the words, as flowing paragraphs.
    const buildPlainText = () => filledBlocks()
        .map(block => block.text.trim())
        .join('\n') + '\n';

    const downloadText = (contents, suffix) => {
        const objectUrl = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
        try {
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `subtitles-${suffix}-${editId || 'video'}.txt`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    };

    const hasSubtitles = subtitleData.some(block => (block.text || '').trim());

    // Debounced auto-save of the manifest via central auto-saver.
    const autoSaveToSupabase = (newConfig) => {
        queueAutoSave(editId, newConfig, 500);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-container sticky top-0 z-10">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">subtitles</span>
                    Subtitles Editor
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => downloadText(buildTimedText(), 'with-timestamps')}
                        disabled={!hasSubtitles}
                        title="Download subtitles with timestamps"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-primary border border-white/20 hover:border-primary text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10 disabled:hover:border-white/20"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        With Timestamps
                    </button>
                    <button
                        onClick={() => downloadText(buildPlainText(), 'without-timestamps')}
                        disabled={!hasSubtitles}
                        title="Download subtitles without timestamps"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-primary border border-white/20 hover:border-primary text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10 disabled:hover:border-white/20"
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Without Timestamps
                    </button>
                </div>
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
