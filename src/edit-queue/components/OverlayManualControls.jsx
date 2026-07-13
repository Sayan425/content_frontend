import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { markLocalSave } from '../utils/localSaveTracker';

export function OverlayManualControls({ selectedOverlayId, overlays, setConfig, editId }) {
  const [localPos, setLocalPos] = useState({ x: 50, y: 50, scale: 1, rotation: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Sync local state when a new overlay is selected
  useEffect(() => {
    const overlay = overlays.find(o => o.overlay_id === selectedOverlayId);
    if (overlay && overlay.position) {
      const pos = overlay.position;
      setLocalPos({
        x: pos.x ? parseFloat(pos.x) : 50,
        y: pos.y ? parseFloat(pos.y) : 50,
        scale: pos.scale !== undefined ? pos.scale : 1,
        rotation: pos.rotation || 0
      });
    } else {
      setLocalPos({ x: 50, y: 50, scale: 1, rotation: 0 });
    }
  }, [selectedOverlayId, overlays]);

  // Handle immediate visual update to React State
  const handleSliderChange = (axis, value) => {
    const newPos = { ...localPos, [axis]: parseFloat(value) };
    setLocalPos(newPos);
    
    // Update the visual preview instantly
    setConfig(prevConfig => {
        if (!prevConfig || !prevConfig.overlays) return prevConfig;
        
        const newOverlays = [...prevConfig.overlays];
        const overlayModel = overlays.find(o => o.overlay_id === selectedOverlayId);
        if(!overlayModel) return prevConfig;

        // Find match in manifest
        const manifestIndex = newOverlays.findIndex(item => {
            const typeMatch = (item.type === overlayModel.type) || 
                              (item.type === 'Text' && overlayModel.type === 'TextOverlay') ||
                              (item.type === 'TextOverlay' && overlayModel.type === 'Text');
            return typeMatch && Math.abs(item.startInSeconds - overlayModel.start_time) < 0.01;
        });

        if (manifestIndex !== -1) {
            newOverlays[manifestIndex] = {
                ...newOverlays[manifestIndex],
                position: {
                    x: `${newPos.x}%`,
                    y: `${newPos.y}%`,
                    scale: newPos.scale,
                    rotation: newPos.rotation
                }
            };
        }
        
        return { ...prevConfig, overlays: newOverlays };
    });
  };

  // Debounced database sync
  useEffect(() => {
    if (!isDragging || !selectedOverlayId) return;

    const timer = setTimeout(async () => {
      try {
        const formattedPos = {
            x: `${localPos.x}%`,
            y: `${localPos.y}%`,
            scale: localPos.scale,
            rotation: localPos.rotation
        };

        // 1. Update Overlays Table
        await supabase
          .from('overlays')
          .update({ position: formattedPos })
          .eq('overlay_id', selectedOverlayId);

        // 2. Fetch fresh queue to update manifest
        const { data: eqData } = await supabase
            .from('edit_queue')
            .select('manifest')
            .eq('content_id', editId)
            .single();

        if (eqData && eqData.manifest) {
            let manifest = typeof eqData.manifest === 'string' ? JSON.parse(eqData.manifest) : eqData.manifest;
            const overlayModel = overlays.find(o => o.overlay_id === selectedOverlayId);
            
            if (manifest.overlays && overlayModel) {
                const manifestIndex = manifest.overlays.findIndex(item => {
                    const typeMatch = (item.type === overlayModel.type) || 
                                      (item.type === 'Text' && overlayModel.type === 'TextOverlay') ||
                                      (item.type === 'TextOverlay' && overlayModel.type === 'Text');
                    return typeMatch && Math.abs(item.startInSeconds - overlayModel.start_time) < 0.01;
                });

                if (manifestIndex !== -1) {
                    manifest.overlays[manifestIndex].position = formattedPos;
                    markLocalSave();
                    await supabase
                        .from('edit_queue')
                        .update({ manifest: manifest })
                        .eq('content_id', editId);
                }
            }
        }
        setIsDragging(false);
      } catch (err) {
        console.error("Error syncing position to DB:", err);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [localPos, isDragging, selectedOverlayId, editId, overlays]);

  if (!selectedOverlayId) return null;

  return (
    <div className="p-4 bg-surface rounded-xl border border-white/5 space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-on-surface">Manual Controls</h3>
        <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-md border border-white/5">
            Real-time
        </span>
      </div>

      <div className="space-y-3">
        {/* X Position */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>X Position</span>
            <span>{localPos.x.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={localPos.x}
            onChange={(e) => {
              setIsDragging(true);
              handleSliderChange('x', e.target.value);
            }}
            className="w-full accent-primary h-1 bg-surface-container rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Y Position */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Y Position</span>
            <span>{localPos.y.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={localPos.y}
            onChange={(e) => {
              setIsDragging(true);
              handleSliderChange('y', e.target.value);
            }}
            className="w-full accent-primary h-1 bg-surface-container rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Scale */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Scale</span>
            <span>{localPos.scale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={localPos.scale}
            onChange={(e) => {
              setIsDragging(true);
              handleSliderChange('scale', e.target.value);
            }}
            className="w-full accent-primary h-1 bg-surface-container rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Rotation */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Rotation</span>
            <span>{localPos.rotation}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={localPos.rotation}
            onChange={(e) => {
              setIsDragging(true);
              handleSliderChange('rotation', e.target.value);
            }}
            className="w-full accent-primary h-1 bg-surface-container rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
