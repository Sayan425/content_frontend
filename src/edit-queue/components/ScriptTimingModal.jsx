import React, { useState, useMemo, useRef, useEffect } from 'react';

export function ScriptTimingModal({ isOpen, onClose, subtitleData, onSelectRange }) {
  const [selectedRange, setSelectedRange] = useState(null);
  const containerRef = useRef(null);

  // Flatten all timestamped words from subtitleData
  const allWords = useMemo(() => {
    if (!subtitleData || !Array.isArray(subtitleData)) return [];
    const words = [];
    subtitleData.forEach((seg, segIdx) => {
      if (seg.words && Array.isArray(seg.words) && seg.words.length > 0) {
        seg.words.forEach((w, wIdx) => {
          words.push({
            id: `w-${segIdx}-${wIdx}`,
            word: w.word || w.text || '',
            start: typeof w.start === 'number' ? w.start : (seg.start || 0),
            end: typeof w.end === 'number' ? w.end : (seg.end || 0),
          });
        });
      } else if (seg.text) {
        const tokens = seg.text.trim().split(/\s+/).filter(Boolean);
        const segStart = typeof seg.start === 'number' ? seg.start : 0;
        const segEnd = typeof seg.end === 'number' ? seg.end : (segStart + 2);
        const span = (segEnd - segStart) / Math.max(1, tokens.length);
        tokens.forEach((t, tIdx) => {
          words.push({
            id: `w-${segIdx}-${tIdx}`,
            word: t,
            start: Math.round((segStart + tIdx * span) * 100) / 100,
            end: Math.round((segStart + (tIdx + 1) * span) * 100) / 100,
          });
        });
      }
    });
    return words;
  }, [subtitleData]);

  // Handle native text selection (Word-style drag select)
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;
    
    // Ensure the selection occurred within our container
    if (!containerRef.current.contains(sel.anchorNode) && !containerRef.current.contains(sel.focusNode)) {
      return;
    }

    const spans = containerRef.current.querySelectorAll('span[data-word-index]');
    const selectedIndices = [];

    spans.forEach((span) => {
      if (sel.containsNode(span, true)) {
        const idx = parseInt(span.getAttribute('data-word-index'), 10);
        if (!isNaN(idx)) selectedIndices.push(idx);
      }
    });

    if (selectedIndices.length > 0) {
      const minIdx = Math.min(...selectedIndices);
      const maxIdx = Math.max(...selectedIndices);
      const startWord = allWords[minIdx];
      const endWord = allWords[maxIdx];

      if (startWord && endWord) {
        const sTime = Math.round(startWord.start * 100) / 100;
        const eTime = Math.round(endWord.end * 100) / 100;
        const dur = Math.max(0.1, Math.round((eTime - sTime) * 100) / 100);
        
        setSelectedRange({
          start: sTime,
          duration: dur,
          minIdx,
          maxIdx,
          text: allWords.slice(minIdx, maxIdx + 1).map(w => w.word).join(' ')
        });
      }
    }
  };

  const handleApply = () => {
    if (selectedRange && onSelectRange) {
      onSelectRange(selectedRange.start, selectedRange.duration);
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedRange(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">description</span>
            <h3 className="text-lg font-semibold text-on-surface">Select Timing from Script</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-white/10 transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Instructions Banner */}
        <div className="px-6 py-3 bg-primary/10 border-b border-primary/20 text-xs text-primary-light flex items-center gap-2">
          <span className="material-symbols-outlined text-base">mouse</span>
          <span>Highlight/drag with your mouse over the text below (like MS Word) to select the timing range.</span>
        </div>

        {/* Script Content Area */}
        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          className="p-6 overflow-y-auto custom-scrollbar flex-1 select-text cursor-text"
        >
          {allWords.length === 0 ? (
            <p className="text-on-surface-variant text-center py-8">No transcript script available for this video.</p>
          ) : (
            <div className="text-base text-on-surface leading-relaxed font-sans space-y-4">
              <p className="inline">
                {allWords.map((w, idx) => {
                  const isSelected = selectedRange && idx >= selectedRange.minIdx && idx <= selectedRange.maxIdx;
                  return (
                    <span
                      key={w.id}
                      data-word-index={idx}
                      className={`inline-block px-0.5 py-0.5 transition-colors rounded ${
                        isSelected 
                          ? 'bg-primary text-on-primary font-medium shadow-sm' 
                          : 'hover:bg-white/10'
                      }`}
                    >
                      {w.word}{' '}
                    </span>
                  );
                })}
              </p>
            </div>
          )}
        </div>

        {/* Footer with Selected Range & Apply Button */}
        <div className="px-6 py-4 border-t border-white/10 bg-surface-container flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {selectedRange ? (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-3 text-xs text-on-surface">
                  <span className="bg-primary/20 text-primary font-mono px-2 py-0.5 rounded border border-primary/30">
                    Start: <strong>{selectedRange.start}s</strong>
                  </span>
                  <span className="bg-primary/20 text-primary font-mono px-2 py-0.5 rounded border border-primary/30">
                    Duration: <strong>{selectedRange.duration}s</strong>
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant truncate italic mt-1">
                  "{selectedRange.text}"
                </p>
              </div>
            ) : (
              <span className="text-xs text-on-surface-variant italic">
                No text selected yet. Highlight any text above.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedRange}
              className={`px-5 py-2 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-lg ${
                selectedRange
                  ? 'bg-primary text-on-primary hover:bg-primary-hover shadow-primary/20 cursor-pointer'
                  : 'bg-white/10 text-on-surface-variant opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-base">check</span>
              Apply Timing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
