import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as Styles from './Subtitles/StyleVariations';

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

const CustomStyleDropdown = ({ label, value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const MOCK_WORDS = [
        { text: "This", isActive: false },
        { text: "is", isActive: false },
        { text: "a", isActive: false },
        { text: "PREVIEW", isActive: true }
    ];

    return (
        <div className="flex flex-col gap-2 mb-4 relative" ref={dropdownRef}>
            <label className="text-sm font-medium text-on-surface-variant">{label}</label>
            <div 
                className="bg-surface-container-high border border-white/10 text-on-surface rounded-lg p-3 cursor-pointer flex justify-between items-center hover:border-primary/50 transition-all"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-semibold">{value}</span>
                <span className="material-symbols-outlined text-sm">{isOpen ? 'expand_less' : 'expand_more'}</span>
            </div>
            
            {isOpen && (
                <div className="absolute top-[100%] left-0 w-full mt-2 bg-surface-container border border-white/10 rounded-lg shadow-2xl z-50 max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col p-1" style={{ backdropFilter: 'blur(20px)' }}>
                    {options.map(opt => {
                        const StyleComp = Styles[opt];
                        return (
                            <div 
                                key={opt} 
                                className={`px-4 py-2 rounded-md cursor-pointer transition-all flex items-center justify-between gap-4 ${value === opt ? 'bg-primary/15' : 'hover:bg-white/5'}`}
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                            >
                                <div className="text-xs font-bold text-white/70 uppercase tracking-wide shrink-0">{opt}</div>
                                <div className="pointer-events-none flex justify-end items-center grow" style={{ fontSize: '13px' }}>
                                    <div style={{ transform: 'scale(0.8)', transformOrigin: 'right center' }}>
                                        {StyleComp ? <StyleComp text="This is a PREVIEW" words={MOCK_WORDS} scale={1} opacity={1} /> : opt}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const CustomBGMDropdown = ({ label, value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const audioRef = useRef(new Audio());
    const [playingUrl, setPlayingUrl] = useState(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const togglePlay = (e, url) => {
        e.stopPropagation();
        if (playingUrl === url) {
            audioRef.current.pause();
            setPlayingUrl(null);
        } else {
            audioRef.current.src = url;
            audioRef.current.play();
            setPlayingUrl(url);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', () => { setPlayingUrl(null); setProgress(0); });
        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', () => { setPlayingUrl(null); setProgress(0); });
        }
    }, []);

    const handleSeek = (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (audio && audio.duration) {
            const newTime = (parseFloat(e.target.value) / 100) * audio.duration;
            audio.currentTime = newTime;
            setProgress(parseFloat(e.target.value));
        }
    };

    const selectedLabel = options.find(o => o.value === value)?.label || (value ? value.split('/').pop() : 'Select a Track...');

    return (
        <div className="flex flex-col gap-2 mb-4 relative" ref={dropdownRef}>
            <label className="text-sm font-medium text-on-surface-variant">{label}</label>
            <div 
                className="bg-surface-container-high border border-white/10 text-on-surface rounded-lg p-3 cursor-pointer flex justify-between items-center hover:border-primary/50 transition-all"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-semibold text-sm truncate pr-4">{selectedLabel}</span>
                <span className="material-symbols-outlined text-sm shrink-0">{isOpen ? 'expand_less' : 'expand_more'}</span>
            </div>
            
            {isOpen && (
                <div className="absolute top-[100%] left-0 w-full mt-2 bg-surface-container border border-white/10 rounded-lg shadow-2xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col p-1" style={{ backdropFilter: 'blur(20px)' }}>
                    {options.length === 0 && (
                        <div className="p-3 text-xs text-white/50 text-center">No tracks found. Bucket listing may be disabled.</div>
                    )}
                    {options.map(opt => (
                        <div 
                            key={opt.value} 
                            className={`px-3 py-2 rounded-md cursor-pointer transition-all flex flex-col gap-2 ${value === opt.value ? 'bg-primary/15' : 'hover:bg-white/5'}`}
                            onClick={() => { onChange(opt.value); setIsOpen(false); audioRef.current.pause(); setPlayingUrl(null); }}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-white/90 truncate">{opt.label}</span>
                                <button 
                                    onClick={(e) => togglePlay(e, opt.value)}
                                    className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all ${playingUrl === opt.value ? 'bg-primary text-on-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">
                                        {playingUrl === opt.value ? 'pause' : 'play_arrow'}
                                    </span>
                                </button>
                            </div>
                            {playingUrl === opt.value && (
                                <div className="w-full mt-2" onClick={e => e.stopPropagation()}>
                                    <FakeWaveformPlayer 
                                        url={opt.value}
                                        progress={progress} 
                                        onSeek={handleSeek}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FakeWaveformPlayer = ({ progress, onSeek, url }) => {
    // Generate a static random height array based on the URL string so each track has a consistent but unique waveform design
    const [bars] = useState(() => {
        let seed = 0;
        if (url) {
            for (let i = 0; i < url.length; i++) {
                seed = (seed << 5) - seed + url.charCodeAt(i);
                seed |= 0;
            }
        }
        
        const random = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        // 80 thin bars tightly packed
        return Array.from({ length: 80 }).map(() => Math.max(10, random() * 100));
    });

    return (
        <div className="w-full relative h-8 flex items-center overflow-hidden bg-black/10 rounded-md mt-2">
            {/* Fake Waveform Bars */}
            <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none z-0">
                {bars.map((h, i) => {
                    const isPlayed = (i / bars.length) * 100 <= progress;
                    return (
                        <div 
                            key={i} 
                            className={`w-[2px] rounded-full transition-colors duration-200 ${isPlayed ? 'bg-primary shadow-[0_0_5px_rgba(177,156,217,0.5)]' : 'bg-white/20'}`} 
                            style={{ height: `${h}%` }}
                        />
                    );
                })}
            </div>
            
            {/* Range Input for seeking */}
            <input 
                type="range" 
                min="0" max="100" 
                value={progress} 
                onChange={onSeek}
                className="w-full h-full opacity-0 cursor-pointer absolute inset-0 z-10"
            />
            
            {/* Scrubber Head */}
            <div 
                className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none z-0 shadow-[0_0_8px_rgba(255,255,255,1)]"
                style={{ left: `${progress}%` }}
            />
        </div>
    );
};

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

const ToggleInput = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center mb-4">
    <label className="text-sm font-medium text-on-surface-variant">{label}</label>
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        checked={value}
        onChange={e => onChange(e.target.checked)} 
      />
      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
    </label>
  </div>
);

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

export function MainVideoPanel({ config, setConfig, editId }) {
  const saveTimeoutRef = useRef(null);
  const [bgmTracks, setBgmTracks] = useState([]);
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
      const fetchTracks = async () => {
          try {
              const response = await fetch('https://pub-345e8414642f4b00859c994c81be94de.r2.dev/editing-assets/bgm/bgm_registry.json');
              if (response.ok) {
                  const filenames = await response.json();
                  
                  const tracks = filenames.map(k => ({
                      value: `https://pub-345e8414642f4b00859c994c81be94de.r2.dev/editing-assets/bgm/${k}`,
                      label: k
                  }));
                  
                  if(tracks.length > 0) {
                      setBgmTracks(tracks);
                      if(!config.backgroundMusicUrl) {
                          updateConfig('backgroundMusicUrl', tracks[0].value);
                      }
                  }
              } else {
                  console.warn("Could not find bgm_registry.json in R2 bucket.");
              }
          } catch (error) {
              console.error('Error fetching tracks:', error);
          }
      };
      fetchTracks();
  }, []);

  const autoSaveToSupabase = (newConfig) => {
    if (!editId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase.from('edit_queue').update({ manifest: newConfig }).eq('edit_id', editId);
        if (error) console.error('Supabase update returned an error:', error);
      } catch (err) {
        console.error('Failed to auto-save to Supabase:', err);
      }
    }, 500);
  };

  const updateConfig = (key, value) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: value };
      autoSaveToSupabase(updated);
      return updated;
    });
  };

  const togglePreview = () => {
      if(isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
      } else {
          if(config.bgmUrl) {
              audioRef.current.src = config.bgmUrl;
              audioRef.current.volume = config.bgmVolume !== undefined ? config.bgmVolume : 0.35;
              audioRef.current.play();
              setIsPlaying(true);
          }
      }
  };

  if (!config) return null;

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto custom-scrollbar">
        {/* Template Section */}
        <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
            <h4 className="text-on-surface font-semibold mb-4 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">view_quilt</span>
                Global Template
            </h4>
            <SelectInput
                label="Select Template"
                value={config.templateId || 'BasicTemplate'}
                onChange={v => updateConfig('templateId', v)}
                options={[
                    { value: 'BasicTemplate', label: 'Basic (Scrapbook)' },
                    { value: 'FullScreenOverlayTemplate', label: 'Full Screen Overlay (B-Roll)' },
                    { value: 'SplitScreenTemplate', label: 'Split-Screen' },
                    { value: 'TransparentTemplate', label: 'Transparent Overlay' }
                ]}
            />
        </section>

        {/* Subtitles Section */}
        <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
            <h4 className="text-on-surface font-semibold mb-4 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">subtitles</span>
                Subtitles
            </h4>
            
            <ToggleInput 
                label="Show Subtitles"
                value={config.showSubtitles !== false} // Defaults to true
                onChange={v => updateConfig('showSubtitles', v)}
            />

            {config.showSubtitles !== false && (
                <>
                    <CustomStyleDropdown
                        label="Style Preset"
                        value={config.subtitleStyle || 'Classic'}
                        onChange={v => updateConfig('subtitleStyle', v)}
                        options={['Classic', 'Highlight', 'Glassmorphism', 'Sticker', 'Retro', 'Bubble', 'Cyberpunk', 'Minimalist', 'Press']}
                    />
                    <RangeInput
                        label="Font Size"
                        value={parseInt(config.subtitleSize || '65')}
                        onChange={v => updateConfig('subtitleSize', `${v}px`)}
                        min={20}
                        max={150}
                        step={1}
                    />
                    <RangeInput
                        label="Bottom Offset"
                        value={parseInt(config.subtitleBottom || '200')}
                        onChange={v => updateConfig('subtitleBottom', `${v}px`)}
                        min={0}
                        max={2000}
                        step={10}
                    />
                </>
            )}
        </section>

        {/* BGM Section */}
        <section className="bg-surface p-4 rounded-xl border border-white/5 shadow-sm">
            <h4 className="text-on-surface font-semibold mb-4 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">music_note</span>
                Background Music
            </h4>
            
            <ToggleInput 
                label="Enable Background Music"
                value={config.showBgm !== false}
                onChange={v => updateConfig('showBgm', v)}
            />

            {config.showBgm !== false && (
                <>
                    <CustomBGMDropdown
                        label="Select Track"
                        value={config.backgroundMusicUrl || ''}
                        onChange={v => updateConfig('backgroundMusicUrl', v)}
                        options={bgmTracks}
                    />
                    
                    <div className="flex flex-col gap-2 mb-4">
                        <label className="text-sm font-medium text-on-surface-variant flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">upload</span>
                            Upload Custom Track
                        </label>
                        <input 
                            type="file" 
                            accept="audio/*"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if(!file) return;
                                
                                try {
                                    // Dynamically extract the avatar folder and runpod ID from videoUrl
                                    let customBucket = 'video-folder';
                                    let customPath = '';
                                    let customPublicUrlBase = 'https://pub-2003936f6b0342a8afd9e538b2f27d12.r2.dev';

                                    if (config.videoUrl) {
                                        try {
                                            const urlObj = new URL(config.videoUrl);
                                            customPublicUrlBase = urlObj.origin;
                                            const parts = urlObj.pathname.split('/').filter(Boolean);
                                            if (parts.length >= 2) {
                                                customPath = `${parts[0]}/${parts[1]}/BGM_`;
                                            }
                                        } catch (e) {
                                            console.warn("Could not parse config.videoUrl for dynamic pathing", e);
                                        }
                                    }

                                    // 1. Get secure presigned upload URL from Vite local proxy
                                    const res = await fetch('/api/get-r2-upload-url', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            fileName: file.name,
                                            contentType: file.type || 'audio/mpeg',
                                            type: 'bgm',
                                            customBucket,
                                            customPath,
                                            customPublicUrlBase
                                        })
                                    });
                                    
                                    const data = await res.json();
                                    if(!res.ok) throw new Error(data.error || 'Failed to get upload URL');
                                    
                                    // 2. Upload file directly to R2 using the presigned URL
                                    const uploadRes = await fetch(data.signedUrl, {
                                        method: 'PUT',
                                        body: file,
                                        headers: { 'Content-Type': file.type || 'audio/mpeg' }
                                    });
                                    
                                    if(!uploadRes.ok) throw new Error('Failed to upload file to R2');
                                    
                                    // 3. Set the public R2 URL in the config!
                                    updateConfig('backgroundMusicUrl', data.publicUrl);
                                    
                                    // Optional: Also update the local bgmTracks state so it appears in the dropdown immediately
                                    setBgmTracks(prev => [...prev, { label: file.name, value: data.publicUrl }]);
                                    
                                } catch(err) {
                                    console.error("Upload error:", err);
                                    alert("Error uploading track: " + err.message);
                                }
                            }}
                            className="text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer"
                        />
                    </div>

                    <RangeInput
                        label="Volume (0-100)"
                        value={Math.round((config.bgmVolume !== undefined ? config.bgmVolume : 0.35) * 100)}
                        onChange={v => updateConfig('bgmVolume', v / 100)}
                        min={0}
                        max={100}
                        step={1}
                    />
                </>
            )}
        </section>
    </div>
  );
}
