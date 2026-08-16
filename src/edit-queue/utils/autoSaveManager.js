import { supabase } from '../../lib/supabase';
import { markLocalSave } from './localSaveTracker';

let saveTimeout = null;

/**
 * Centralized, debounced auto-save manager for the Video Editor.
 * Guarantees a single unified auto-save timer across all editor panels
 * so panel-level race conditions cannot overwrite the database manifest.
 */
export function queueAutoSave(editId, newConfig, delayMs = 500) {
  if (!editId || !newConfig) return;

  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  saveTimeout = setTimeout(async () => {
    try {
      markLocalSave();
      const updatePayload = { manifest: newConfig };
      if (newConfig.subtitleData) {
        updatePayload.subtitle = newConfig.subtitleData;
      }

      const { error } = await supabase
        .from('edit_queue')
        .update(updatePayload)
        .eq('content_id', editId);

      if (error) {
        console.error('Central auto-save error:', error);
      } else {
        console.log('Central auto-save succeeded for content_id:', editId);
      }
    } catch (err) {
      console.error('Failed central auto-save execution:', err);
    } finally {
      saveTimeout = null;
    }
  }, delayMs);
}

/**
 * Immediately flushes any pending auto-save and performs a synchronous save to Supabase.
 * Used during Finalize & Save flow to guarantee zero data loss.
 */
export async function flushAutoSave(editId, newConfig) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  if (!editId || !newConfig) return;

  markLocalSave();
  const updatePayload = { manifest: newConfig };
  if (newConfig.subtitleData) {
    updatePayload.subtitle = newConfig.subtitleData;
  }

  const { error } = await supabase
    .from('edit_queue')
    .update(updatePayload)
    .eq('content_id', editId);

  if (error) {
    console.error('Explicit flushAutoSave error:', error);
    throw error;
  }
}
