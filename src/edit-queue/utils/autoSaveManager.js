import { supabase } from '../../lib/supabase';
import { markLocalSave } from './localSaveTracker';
import { isManifestSafeToSave } from './manifestGuard';

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
      // Never write a manifest built from a read that was incomplete or
      // unparseable — that is how a good row gets replaced by an empty one.
      if (!isManifestSafeToSave(editId)) {
        console.warn('Auto-save skipped: manifest was not loaded cleanly for', editId);
        return;
      }

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

  // Same protection as the debounced path, but the user is explicitly saving
  // here, so fail loudly instead of silently doing nothing — the caller aborts
  // the finalize flow and shows an error rather than rendering a stale edit.
  if (!isManifestSafeToSave(editId)) {
    console.error('Refusing to save: manifest was not loaded cleanly for', editId);
    throw new Error('The manifest could not be loaded safely. Reload the editor before finalizing.');
  }

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
