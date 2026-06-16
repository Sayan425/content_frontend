import React, { useState } from 'react';
import { MainVideoPanel } from './components/MainVideoPanel';
import { OverlaysPanel } from './components/OverlaysPanel';
import { SubtitlesPanel } from './components/SubtitlesPanel';

export function EditorSidebar({ config, setConfig, editId }) {
  const [activeTab, setActiveTab] = useState('main'); // 'main' or 'overlays'

  return (
    <div className="flex flex-col h-full bg-surface-container/50">
      {/* Header & Tabs */}
      <div className="p-6 pb-0 border-b border-white/5">
        <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">edit_square</span>
            Video Editor
        </h2>

        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('main')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'main'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Main Video
          </button>
          <button
            onClick={() => setActiveTab('overlays')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'overlays'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Overlays
          </button>
          <button
            onClick={() => setActiveTab('subtitles')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'subtitles'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Subtitles
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'main' && (
          <MainVideoPanel config={config} setConfig={setConfig} editId={editId} />
        )}
        {activeTab === 'overlays' && (
          <OverlaysPanel config={config} setConfig={setConfig} editId={editId} />
        )}
        {activeTab === 'subtitles' && (
          <SubtitlesPanel config={config} setConfig={setConfig} editId={editId} />
        )}
      </div>
    </div>
  );
}
