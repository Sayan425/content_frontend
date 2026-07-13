import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { markLocalSave } from '../utils/localSaveTracker';
import { showCustomConfirm } from '../../../components/notifications.js';

// Reusing generic input components
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

const NumberInput = ({ label, value, onChange, min, max, step }) => {
  const displayValue = typeof value === 'number' ? parseFloat(value.toFixed(2)) : (value !== undefined ? value : '');
  return (
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-sm font-medium text-on-surface-variant">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="bg-surface-container-high border border-white/10 text-on-surface rounded-lg p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
      />
    </div>
  );
};

const RangeInput = ({ label, value, onChange, min, max, step }) => (
  <div className="flex flex-col gap-2 mb-4">
    <label className="text-sm font-medium text-on-surface-variant flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value || 0}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full accent-primary"
    />
  </div>
);

const isHexColor = (v) =>
  typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());

const prettyLabel = (k) =>
  k.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();

const ColorInput = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2 mb-4">
    <label className="text-sm font-medium text-on-surface-variant">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#([0-9a-fA-F]{6})$/.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer p-0 shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-surface-container-high border border-white/10 text-on-surface rounded-lg p-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
      />
    </div>
  </div>
);

// Editor for an array of like-shaped objects (e.g. chart data: [{label, value}]).
function ArrayField({ label, value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const subKeys = items.length ? Object.keys(items[0]) : [];

  const setItem = (idx, k, v) => onChange(items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));
  const addItem = () =>
    onChange([
      ...items,
      subKeys.length
        ? Object.fromEntries(subKeys.map((k) => [k, typeof items[0][k] === 'number' ? 0 : '']))
        : {},
    ]);

  return (
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-sm font-medium text-on-surface-variant">{label}</label>
      <div className="flex flex-col gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-end gap-2 bg-surface-container-high/50 p-2 rounded-lg border border-white/5">
            {subKeys.map((k) => (
              <div key={k} className="flex-1 min-w-0">
                <label className="text-[10px] uppercase tracking-wider text-on-surface-variant/70">{k}</label>
                <input
                  type={typeof it[k] === 'number' ? 'number' : 'text'}
                  value={it[k]}
                  onChange={(e) =>
                    setItem(idx, k, typeof it[k] === 'number' ? parseFloat(e.target.value) : e.target.value)
                  }
                  className="w-full bg-surface-container border border-white/10 text-on-surface rounded-md p-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
            ))}
            <button
              onClick={() => removeItem(idx)}
              className="text-error hover:bg-error/10 rounded-md p-1.5 shrink-0"
              title="Remove item"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addItem}
        className="self-start text-xs text-primary hover:bg-primary/10 rounded-md px-2 py-1 flex items-center gap-1 mt-1"
      >
        <span className="material-symbols-outlined text-[16px]">add</span> Add item
      </button>
    </div>
  );
}

// Fallback editor for nested objects / anything we can't render as a simple field.
function JsonField({ label, value, onChange }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState(false);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  return (
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-sm font-medium text-on-surface-variant">{label}</label>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setErr(false);
          } catch {
            setErr(true);
          }
        }}
        className={`bg-surface-container-high border ${err ? 'border-error' : 'border-white/10'} text-on-surface rounded-lg p-2 text-xs font-mono min-h-[100px] outline-none focus:border-primary`}
      />
      {err && <span className="text-error text-xs">Invalid JSON — not saved</span>}
    </div>
  );
}

// Picks the right editor for a single motion-graphic prop based on its value.
function PropField({ propKey, value, onChange }) {
  const label = prettyLabel(propKey);
  if (isHexColor(value)) return <ColorInput label={label} value={value} onChange={onChange} />;
  if (typeof value === 'number')
    return <NumberInput label={label} value={value} onChange={onChange} step={1} />;
  if (typeof value === 'boolean')
    return (
      <SelectInput
        label={label}
        value={String(value)}
        onChange={(v) => onChange(v === 'true')}
        options={[{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }]}
      />
    );
  if (Array.isArray(value)) return <ArrayField label={label} value={value} onChange={onChange} />;
  if (value && typeof value === 'object')
    return <JsonField label={label} value={value} onChange={onChange} />;
  return <TextInput label={label} value={value} onChange={onChange} />;
}

export function OverlaysPanel({ config, setConfig, editId }) {
    const [selectedOverlayIndex, setSelectedOverlayIndex] = useState('');
    const saveTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [showAIPrompt, setShowAIPrompt] = useState(false);
    const [aiSize, setAiSize] = useState('1024x1024');
    const [generatedImages, setGeneratedImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const overlays = config?.overlays || [];
    
    const autoSaveToSupabase = (newConfig) => {
        if (!editId) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                markLocalSave();
                const { error } = await supabase.from('edit_queue').update({ manifest: newConfig }).eq('content_id', editId);
                if (error) console.error('Supabase update returned an error:', error);
            } catch (err) {
                console.error('Failed to auto-save to Supabase:', err);
            }
        }, 500);
    };

    const updateOverlay = (key, value) => {
        if (selectedOverlayIndex === '') return;
        
        setConfig(prev => {
            const updated = { ...prev };
            const index = parseInt(selectedOverlayIndex);
            
            if (key.includes('.')) {
                // Nested update like "position.x"
                const [parent, child] = key.split('.');
                if (!updated.overlays[index][parent]) {
                    updated.overlays[index][parent] = {};
                }
                updated.overlays[index][parent][child] = value;
            } else {
                updated.overlays[index][key] = value;
            }
            
            autoSaveToSupabase(updated);
            return updated;
        });
    };

    const updateOverlayProp = (key, value) => {
        if (selectedOverlayIndex === '') return;
        setConfig(prev => {
            const updated = { ...prev };
            const index = parseInt(selectedOverlayIndex);
            if (!updated.overlays[index].props) updated.overlays[index].props = {};
            updated.overlays[index].props[key] = value;
            autoSaveToSupabase(updated);
            return updated;
        });
    }

    if (!config || overlays.length === 0) {
        return <div className="p-6 text-on-surface-variant">No overlays found in manifest.</div>;
    }

    const selectedOverlay = selectedOverlayIndex !== '' ? overlays[selectedOverlayIndex] : null;

    const deleteOverlay = async () => {
        if (selectedOverlayIndex === '') return;
        const index = parseInt(selectedOverlayIndex);
        const confirmed = await showCustomConfirm(
            'This overlay will be permanently deleted and cannot be restored. Delete it?',
            'Delete Overlay'
        );
        if (!confirmed) return;

        setConfig(prev => {
            const updated = { ...prev, overlays: (prev.overlays || []).filter((_, i) => i !== index) };
            autoSaveToSupabase(updated);
            return updated;
        });
        setSelectedOverlayIndex('');
    };

    const handleSelectOverlay = (val) => {
        setSelectedOverlayIndex(val);
        if (val !== '') {
            const index = parseInt(val);
            const overlay = config?.overlays?.[index];
            if (overlay && overlay.startInSeconds !== undefined && overlay.durationInSeconds !== undefined) {
                const middleTime = overlay.startInSeconds + (overlay.durationInSeconds / 2);
                window.dispatchEvent(new CustomEvent('remotionSeekToTime', { 
                    detail: { timeInSeconds: middleTime } 
                }));
            }
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto custom-scrollbar">
            {/* Overlay Selector */}
            <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
                <SelectInput
                    label="Active Overlay"
                    value={selectedOverlayIndex}
                    onChange={handleSelectOverlay}
                    options={[
                        { value: '', label: 'Select an overlay...' },
                        ...overlays.map((o, i) => {
                            const start = typeof o.startInSeconds === 'number' ? o.startInSeconds : 0;
                            const duration = typeof o.durationInSeconds === 'number' ? o.durationInSeconds : 0;
                            return {
                                value: i.toString(),
                                label: `${o.type} (${parseFloat(start.toFixed(2))}s - ${parseFloat((start + duration).toFixed(2))}s)`
                            };
                        })
                    ]}
                />
            </section>

            {selectedOverlay && (
                <>
                    {/* Asset / Text Content */}
                    <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
                        {selectedOverlay.type === 'Text' || selectedOverlay.type === 'TextOverlay' ? (
                            <>
                                <h4 className="text-on-surface font-semibold mb-4 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[18px]">text_fields</span>
                                    Text Content
                                </h4>
                                <TextInput
                                    label="Text"
                                    value={selectedOverlay.props?.text || ''}
                                    onChange={v => updateOverlayProp('text', v)}
                                    placeholder="Enter text..."
                                />
                            </>
                        ) : selectedOverlay.type === 'MotionGraphic' ? (
                            <>
                                <h4 className="text-on-surface font-semibold mb-1 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome_motion</span>
                                    Motion Graphic
                                </h4>
                                {selectedOverlay.templateId && (
                                    <p className="text-[11px] text-on-surface-variant/70 mb-4 font-mono">{selectedOverlay.templateId}</p>
                                )}
                                <div className="flex flex-col gap-1">
                                    {selectedOverlay.props && Object.keys(selectedOverlay.props).length > 0 ? (
                                        Object.entries(selectedOverlay.props).map(([key, value]) => (
                                            <PropField
                                                key={key}
                                                propKey={key}
                                                value={value}
                                                onChange={(v) => updateOverlayProp(key, v)}
                                            />
                                        ))
                                    ) : (
                                        <p className="text-xs text-on-surface-variant">This graphic has no editable properties.</p>
                                    )}
                                </div>
                                <div className="mt-2 pt-4 border-t border-white/5">
                                    <RangeInput
                                        label="Opacity (%)"
                                        value={selectedOverlay.opacity !== undefined ? selectedOverlay.opacity : 100}
                                        onChange={v => updateOverlay('opacity', v)}
                                        min={0}
                                        max={100}
                                        step={1}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <h4 className="text-on-surface font-semibold mb-4 text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[18px]">imagesmode</span>
                                    Replace Media
                                </h4>
                                <div className="flex items-center gap-3 h-20">
                                    {/* Tiny Preview */}
                                    <div className="w-20 h-20 bg-black/50 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center shrink-0 shadow-inner relative group">
                                        {(selectedOverlay.props?.src || selectedOverlay.props?.url) ? (
                                            (selectedOverlay.props?.src?.match(/\.(mp4|webm)$/i) || selectedOverlay.props?.url?.match(/\.(mp4|webm)$/i)) ? (
                                                <video src={selectedOverlay.props?.src || selectedOverlay.props?.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={selectedOverlay.props?.src || selectedOverlay.props?.url} className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <span className="material-symbols-outlined text-white/20 text-2xl">image</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-bold text-white tracking-widest uppercase">Current</span>
                                        </div>
                                    </div>

                                    {/* Exchange Icon */}
                                    <div className="flex flex-col items-center justify-center text-primary/60">
                                        <span className="material-symbols-outlined text-[24px]">sync_alt</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex-1 flex gap-2 h-full">
                                        {/* Upload Action */}
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*,video/*"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                try {
                                                    let customBucket = 'video-folder';
                                                    let customPath = '';
                                                    let customPublicUrlBase = 'https://pub-2003936f6b0342a8afd9e538b2f27d12.r2.dev';

                                                    if (config.videoUrl) {
                                                        const urlObj = new URL(config.videoUrl);
                                                        customPublicUrlBase = urlObj.origin;
                                                        const parts = urlObj.pathname.split('/').filter(Boolean);
                                                        if (parts.length >= 2) {
                                                            const mediaType = file.type.startsWith('video') ? 'videos' : 'images';
                                                            customPath = `${parts[0]}/${parts[1]}/${mediaType}/`;
                                                        }
                                                    }

                                                    const res = await fetch('/api/get-r2-upload-url', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            fileName: file.name,
                                                            contentType: file.type || 'application/octet-stream',
                                                            type: 'overlay',
                                                            customBucket,
                                                            customPath,
                                                            customPublicUrlBase
                                                        })
                                                    });
                                                    
                                                    const data = await res.json();
                                                    if(!res.ok) throw new Error(data.error);
                                                    
                                                    const uploadRes = await fetch(data.signedUrl, {
                                                        method: 'PUT',
                                                        body: file,
                                                        headers: { 'Content-Type': file.type || 'application/octet-stream' }
                                                    });
                                                    
                                                    if(!uploadRes.ok) throw new Error('Upload to R2 failed');
                                                    
                                                    updateOverlayProp('src', data.publicUrl);
                                                    updateOverlayProp('url', data.publicUrl);
                                                } catch(err) {
                                                    alert("Upload Error: " + err.message);
                                                }
                                            }}
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 h-full bg-surface-container border border-dashed border-white/20 rounded-xl text-on-surface-variant hover:text-white hover:border-white/40 hover:bg-surface-container-high transition flex flex-col items-center justify-center gap-1 group"
                                        >
                                            <span className="material-symbols-outlined text-[24px] group-hover:-translate-y-1 transition-transform">upload</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Upload File</span>
                                        </button>

                                        {/* AI Generate Toggle */}
                                        <button 
                                            onClick={() => setShowAIPrompt(true)}
                                            className="flex-1 h-full bg-primary/5 border border-dashed border-primary/30 rounded-xl text-primary/80 hover:text-primary hover:border-primary hover:bg-primary/10 transition flex flex-col items-center justify-center gap-1 group"
                                        >
                                            <span className="material-symbols-outlined text-[24px] group-hover:rotate-12 transition-transform">auto_awesome</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">AI Gen</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    {/* Premium AI Generation Modal */}
                    {/* Premium AI Generation Modal */}
                    {showAIPrompt && createPortal(
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-surface-container-highest w-full max-w-[600px] h-[600px] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-on-surface tracking-tight">Generate Image with AI</h2>
                                            <p className="text-xs text-on-surface-variant mt-0.5">Create unique, high-quality visuals instantly.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowAIPrompt(false)} className="text-on-surface-variant hover:text-white transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>
                                
                                <div className="p-6 flex flex-col flex-1 overflow-y-auto">
                                    {generatedImages.length > 0 ? (
                                        <div className="flex flex-col h-full">
                                            <h3 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">photo_library</span>
                                                Select an image to use
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4 flex-1">
                                                {generatedImages.map((b64, idx) => (
                                                    <button 
                                                        key={idx}
                                                        onClick={async () => {
                                                            setIsUploading(true);
                                                            try {
                                                                let customBucket = 'video-folder';
                                                                let customPath = '';
                                                                let customPublicUrlBase = 'https://pub-2003936f6b0342a8afd9e538b2f27d12.r2.dev';

                                                                if (config.videoUrl) {
                                                                    const urlObj = new URL(config.videoUrl);
                                                                    customPublicUrlBase = urlObj.origin;
                                                                    const parts = urlObj.pathname.split('/').filter(Boolean);
                                                                    if (parts.length >= 2) {
                                                                        customPath = `${parts[0]}/${parts[1]}/images/`;
                                                                    }
                                                                }

                                                                const res = await fetch('/api/upload-overlay-image', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        imageBase64: b64,
                                                                        customBucket,
                                                                        customPath,
                                                                        customPublicUrlBase
                                                                    })
                                                                });
                                                                const data = await res.json();
                                                                if(!res.ok) throw new Error(data.error);
                                                                
                                                                updateOverlayProp('src', data.publicUrl);
                                                                updateOverlayProp('url', data.publicUrl);
                                                                setAiPrompt('');
                                                                setGeneratedImages([]);
                                                                setShowAIPrompt(false);
                                                            } catch (err) {
                                                                alert("Upload Error: " + err.message);
                                                            } finally {
                                                                setIsUploading(false);
                                                            }
                                                        }}
                                                        disabled={isUploading}
                                                        className={`relative rounded-xl overflow-hidden border-2 transition-all group aspect-square bg-black/50 ${isUploading ? 'opacity-50 cursor-not-allowed border-transparent' : 'border-transparent hover:border-primary'}`}
                                                    >
                                                        <img src={`data:image/jpeg;base64,${b64}`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="bg-primary text-on-primary text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                                Use Image
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="pt-4 mt-4 flex items-center justify-between border-t border-white/5 shrink-0">
                                                <button 
                                                    onClick={() => setGeneratedImages([])}
                                                    disabled={isUploading}
                                                    className="px-5 py-2 text-xs font-medium text-on-surface-variant hover:text-white transition rounded-lg hover:bg-white/5 flex items-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                                    Back to Prompt
                                                </button>
                                                {isUploading && (
                                                    <span className="text-primary text-xs flex items-center gap-2 font-semibold">
                                                        <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                                                        Applying image to video...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Dimensions */}
                                            <div className="flex items-center justify-between mb-4 shrink-0">
                                                <label className="text-sm font-semibold text-on-surface flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary text-[18px]">aspect_ratio</span>
                                                    Dimensions
                                                </label>
                                                <div className="flex items-center gap-2 bg-surface-container p-1 rounded-lg border border-white/5">
                                                    {['1024x1024', '1024x1792', '1792x1024'].map(dim => {
                                                        const labels = {
                                                            '1024x1024': 'Square',
                                                            '1024x1792': 'Portrait',
                                                            '1792x1024': 'Landscape'
                                                        };
                                                        return (
                                                            <button
                                                                key={dim}
                                                                onClick={() => setAiSize(dim)}
                                                                className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-bold transition flex items-center justify-center ${aiSize === dim ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}
                                                            >
                                                                {labels[dim]}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Prompt Area */}
                                            <div className="flex flex-col flex-1 gap-2 mb-4">
                                                <label className="text-sm font-semibold text-on-surface flex items-center gap-2 shrink-0">
                                                    <span className="material-symbols-outlined text-primary text-[18px]">edit_note</span>
                                                    Your Prompt
                                                </label>
                                                <textarea
                                                    value={aiPrompt}
                                                    onChange={(e) => setAiPrompt(e.target.value)}
                                                    placeholder="A highly detailed futuristic city at sunset, neon lights reflecting on wet streets, cinematic lighting, photorealistic..."
                                                    className="w-full flex-1 bg-surface-container-high border-2 border-transparent text-on-surface rounded-xl p-4 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none shadow-inner"
                                                />
                                            </div>

                                            {/* Best Practices */}
                                            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 shrink-0 mb-6 flex gap-4 text-[12px] text-on-surface-variant">
                                                <div className="flex-1">
                                                    <strong className="text-primary block mb-1.5 uppercase tracking-wider text-[10px]">Do:</strong>
                                                    <ul className="list-disc pl-4 space-y-1">
                                                        <li>Be highly descriptive (lighting, mood)</li>
                                                        <li>Clearly specify the main subject</li>
                                                        <li>Use modifiers like "4k", "detailed"</li>
                                                    </ul>
                                                </div>
                                                <div className="flex-1">
                                                    <strong className="text-orange-400 block mb-1.5 uppercase tracking-wider text-[10px]">Don't:</strong>
                                                    <ul className="list-disc pl-4 space-y-1">
                                                        <li>Request exact text or typography</li>
                                                        <li>Use vague or conflicting phrases</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Buttons */}
                                            <div className="pt-4 flex items-center justify-end gap-3 shrink-0 border-t border-white/5">
                                                <button 
                                                    onClick={() => setShowAIPrompt(false)}
                                                    className="px-5 py-2 text-xs font-medium text-on-surface-variant hover:text-white transition rounded-lg hover:bg-white/5"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    disabled={!aiPrompt || isGenerating}
                                                    onClick={async () => {
                                                        if (!aiPrompt) return;
                                                        setIsGenerating(true);
                                                        try {
                                                            const res = await fetch('/api/generate-overlay-image', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    prompt: aiPrompt,
                                                                    size: aiSize
                                                                })
                                                            });
                                                            
                                                            const data = await res.json();
                                                            if(!res.ok) throw new Error(data.error);
                                                            
                                                            if (data.images && data.images.length > 0) {
                                                                setGeneratedImages(data.images);
                                                            } else {
                                                                throw new Error("No images were returned from Gemini.");
                                                            }
                                                        } catch(err) {
                                                            alert("Generation Error: " + err.message);
                                                        } finally {
                                                            setIsGenerating(false);
                                                        }
                                                    }}
                                                    className={`px-6 py-2 rounded-lg text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 min-w-[140px] ${isGenerating ? 'bg-primary/50 cursor-not-allowed text-white' : 'bg-primary text-on-primary hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(177,156,217,0.3)]'}`}
                                                >
                                                    <span className={`material-symbols-outlined text-[16px] ${isGenerating ? 'animate-spin' : ''}`}>
                                                        {isGenerating ? 'sync' : 'auto_awesome'}
                                                    </span>
                                                    {isGenerating ? 'Generating...' : 'Generate Options'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Timing */}
                    <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
                        <h4 className="text-on-surface font-semibold mb-4 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
                            Timing
                        </h4>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <NumberInput
                                    label="Start (sec)"
                                    value={selectedOverlay.startInSeconds}
                                    onChange={v => updateOverlay('startInSeconds', v)}
                                    min={0}
                                    step={0.1}
                                />
                            </div>
                            <div className="flex-1">
                                <NumberInput
                                    label="Duration (sec)"
                                    value={selectedOverlay.durationInSeconds}
                                    onChange={v => updateOverlay('durationInSeconds', v)}
                                    min={0.1}
                                    step={0.1}
                                />
                            </div>
                        </div>
                    </section>

                    {selectedOverlay.type !== 'MotionGraphic' && (
                        <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
                            <h4 className="text-on-surface font-semibold mb-4 text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px]">animation</span>
                                Animations & Styles
                            </h4>
                            <SelectInput
                                label="In Animation"
                                value={selectedOverlay.animationIn || 'none'}
                                onChange={v => updateOverlay('animationIn', v)}
                                options={['none', 'fade', 'pop', 'slide_left', 'slide_right', 'slide_up', 'slide_down', 'zoom_in', 'spin_in', 'drop_down', 'blur_in', 'flip_in'].map(val => ({
                                    value: val,
                                    label: val === 'none' ? 'None' : val.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                }))}
                            />
                            <SelectInput
                                label="Out Animation"
                                value={selectedOverlay.animationOut || 'none'}
                                onChange={v => updateOverlay('animationOut', v)}
                                options={['none', 'fade', 'pop', 'slide_left', 'slide_right', 'slide_up', 'slide_down', 'zoom_out', 'spin_out', 'fly_away', 'blur_out', 'flip_out'].map(val => ({
                                    value: val,
                                    label: val === 'none' ? 'None' : val.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                }))}
                            />
                            <SelectInput
                                label="Border Preset"
                                value={selectedOverlay.borderPreset || 'none'}
                                onChange={v => updateOverlay('borderPreset', v)}
                                options={[
                                    { value: 'none', label: 'None' },
                                    { value: 'photographic', label: 'Photographic (Classic)' },
                                    { value: 'polaroid_modern', label: 'Polaroid (Modern)' },
                                    { value: 'neon', label: 'Neon Glow' },
                                    { value: 'cyberpunk', label: 'Cyberpunk Red' },
                                    { value: 'cinematic', label: 'Cinematic Minimalist' },
                                    { value: 'minimal_shadow', label: 'Minimal Drop Shadow' },
                                    { value: 'glass', label: 'Soft Glass' },
                                    { value: 'gold_frame', label: 'Luxurious Gold' },
                                    { value: 'comic_book', label: 'Comic Book Halftone' },
                                    { value: 'retro_vhs', label: 'Retro VHS Glitch' }
                                ]}
                            />
                            <RangeInput
                                label="Opacity (%)"
                                value={selectedOverlay.opacity !== undefined ? selectedOverlay.opacity : 100}
                                onChange={v => updateOverlay('opacity', v)}
                                min={0}
                                max={100}
                                step={1}
                            />
                        </section>
                    )}

                    {/* Spatial Controls */}
                    <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
                        <h4 className="text-on-surface font-semibold mb-4 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">transform</span>
                            Transform & Position
                        </h4>
                        <RangeInput
                            label="Position X (%)"
                            value={selectedOverlay.position?.x ? (!isNaN(parseFloat(selectedOverlay.position.x)) ? parseFloat(selectedOverlay.position.x) : 50) : 50}
                            onChange={v => updateOverlay('position.x', `${v}%`)}
                            min={0}
                            max={100}
                            step={0.5}
                        />
                        <RangeInput
                            label="Position Y (%)"
                            value={selectedOverlay.position?.y ? (!isNaN(parseFloat(selectedOverlay.position.y)) ? parseFloat(selectedOverlay.position.y) : 50) : 50}
                            onChange={v => updateOverlay('position.y', `${v}%`)}
                            min={0}
                            max={100}
                            step={0.5}
                        />
                        <RangeInput
                            label="Scale (%)"
                            value={selectedOverlay.position?.scale !== undefined ? selectedOverlay.position.scale : 100}
                            onChange={v => updateOverlay('position.scale', v)}
                            min={0}
                            max={300}
                            step={1}
                        />
                        <RangeInput
                            label="Rotation (°)"
                            value={selectedOverlay.position?.rotation || 0}
                            onChange={v => updateOverlay('position.rotation', v)}
                            min={-180}
                            max={180}
                            step={1}
                        />
                    </section>

                    {/* Danger Zone */}
                    <section className="bg-surface p-4 rounded-xl border border-error/20 shadow-sm">
                        <h4 className="text-error font-semibold mb-2 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                            Danger Zone
                        </h4>
                        <p className="text-xs text-on-surface-variant mb-4">
                            Deleting an overlay is permanent — it cannot be restored.
                        </p>
                        <button
                            onClick={deleteOverlay}
                            className="w-full px-4 py-2.5 bg-error/10 hover:bg-error/20 text-error border border-error/30 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                            Delete This Overlay
                        </button>
                    </section>
                </>
            )}
        </div>
    );
}
