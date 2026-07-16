import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { markLocalSave } from '../utils/localSaveTracker';
import { RangeInput } from './RangeInput';

const SelectInput = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-2 mb-4">
    <label className="text-sm font-medium text-on-surface-variant">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-surface-container-high border border-white/10 text-on-surface rounded-lg p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
    >
      {options.map(opt => (
        <option key={opt.value || opt} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
  </div>
);

const TextInput = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-2 mb-4">
    <label className="text-sm font-medium text-on-surface-variant">{label}</label>
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-surface-container-high border border-white/10 text-on-surface rounded-lg p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
    />
  </div>
);


const ColorInput = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2 mb-4">
    <label className="text-sm font-medium text-on-surface-variant">{label}</label>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || '#00ff00'}
        onChange={e => onChange(e.target.value)}
        className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
      />
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-surface-container-high border border-white/10 text-on-surface rounded-lg p-2 font-mono text-sm focus:border-primary outline-none"
      />
    </div>
  </div>
);

export function VideoSettingsPanel({ config, setConfig, editId }) {
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = React.useRef(null);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-on-surface-variant">
        <p>Loading configuration...</p>
      </div>
    );
  }

  // Debounced auto-save directly to Supabase manifest
  const autoSaveToSupabase = (newConfig) => {
    if (!editId) return;
    
    setSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        markLocalSave();
        const { error } = await supabase
          .from('edit_queue')
          .update({ manifest: newConfig })
          .eq('content_id', editId);
          
        if (error) throw error;
        console.log('Auto-saved settings to Supabase directly!');
      } catch (err) {
        console.error('Failed to auto-save to Supabase:', err);
      } finally {
        setSaving(false);
      }
    }, 800); // 800ms debounce
  };

  const updateConfig = (key, value) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: value };
      autoSaveToSupabase(updated);
      return updated;
    });
  };

  const updateOverlayText = (newText) => {
    setConfig(prev => {
      const updated = { ...prev };
      if (!updated.overlays) updated.overlays = [];
      const textOverlayIndex = updated.overlays.findIndex(o => o.type === 'Text');
      if (textOverlayIndex !== -1) {
        if (!newText) {
          updated.overlays.splice(textOverlayIndex, 1);
        } else {
          updated.overlays[textOverlayIndex].props.text = newText;
        }
      } else if (newText) {
        updated.overlays.push({
          type: "Text",
          props: { text: newText },
          startInSeconds: 0,
          durationInSeconds: 10
        });
      }
      autoSaveToSupabase(updated);
      return updated;
    });
  };

  const currentTextOverlay = config.overlays?.find(o => o.type === 'Text')?.props?.text || '';

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 custom-scrollbar bg-surface-container-low/50">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-on-surface mb-1">Video Configuration</h3>
        <p className="text-sm text-on-surface-variant">Live edit the manifest properties</p>
      </div>

      <div className="space-y-6">
        {/* Layout & Template */}
        <section className="p-4 rounded-2xl bg-surface-container/50 border border-white/5">
          <h4 className="text-primary font-medium mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">view_quilt</span>
            Layout & Template
          </h4>
          <SelectInput
            label="Template Model"
            value={config.templateId || 'BasicTemplate'}
            onChange={v => updateConfig('templateId', v)}
            options={[
              { value: 'TransparentTemplate', label: 'Transparent Background (Chroma)' },
              { value: 'SplitScreenTemplate', label: 'Top Split-Screen' },
              { value: 'BRollTemplate', label: 'B-Roll Full Screen' },
              { value: 'StorytellingTemplate', label: 'Polaroid Storytelling' },
              { value: 'BasicTemplate', label: 'Basic Full Screen' }
            ]}
          />
          {config.templateId === 'TransparentTemplate' && (
            <ColorInput
              label="Chroma Key Color (Green Screen)"
              value={config.chromaKeyColor || '#00b140'}
              onChange={v => updateConfig('chromaKeyColor', v)}
            />
          )}
        </section>

        {/* Subtitles */}
        <section className="p-4 rounded-2xl bg-surface-container/50 border border-white/5">
          <h4 className="text-primary font-medium mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">subtitles</span>
            Subtitles
          </h4>
          <SelectInput
            label="Subtitle Style"
            value={config.subtitleStyle || 'Classic'}
            onChange={v => updateConfig('subtitleStyle', v)}
            options={['Classic', 'Highlight', 'Glassmorphism', 'Sticker', 'Retro', 'Bubble', 'Cyberpunk', 'Minimalist', 'Press']}
          />
          <TextInput
            label="Subtitle Size"
            value={config.subtitleSize || '65px'}
            onChange={v => updateConfig('subtitleSize', v)}
            placeholder="e.g. 65px"
          />
          <TextInput
            label="Bottom Offset"
            value={config.subtitleBottom || '200px'}
            onChange={v => updateConfig('subtitleBottom', v)}
            placeholder="e.g. 200px"
          />
        </section>

        {/* Text Overlay (Header) */}
        <section className="p-4 rounded-2xl bg-surface-container/50 border border-white/5">
          <h4 className="text-primary font-medium mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">title</span>
            Text Overlays
          </h4>
          <TextInput
            label="Header Text"
            value={currentTextOverlay}
            onChange={updateOverlayText}
            placeholder="Enter headline..."
          />
          <SelectInput
            label="Text Style"
            value={config.textOverlayStyle || 'Highlight'}
            onChange={v => updateConfig('textOverlayStyle', v)}
            options={['Highlight', 'Classic', 'Glassmorphism', 'Sticker', 'Retro', 'Bubble', 'Cyberpunk']}
          />
          <TextInput
            label="Text Size"
            value={config.textOverlaySize || '65px'}
            onChange={v => updateConfig('textOverlaySize', v)}
            placeholder="e.g. 65px"
          />
        </section>

        {/* Audio */}
        <section className="p-4 rounded-2xl bg-surface-container/50 border border-white/5">
          <h4 className="text-primary font-medium mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
            Audio Mix
          </h4>
          <RangeInput
            label="Background Music Volume"
            value={config.bgmVolume !== undefined ? config.bgmVolume : 0.35}
            onChange={v => updateConfig('bgmVolume', v)}
            min={0}
            max={1}
            step={0.05}
          />
        </section>

      </div>
    </div>
  );
}
