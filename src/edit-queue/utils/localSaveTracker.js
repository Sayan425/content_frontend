/**
 * Tracks when this browser tab last wrote the edit_queue manifest, so the
 * PhoneMockup realtime subscription can tell "echo of my own save" apart from
 * a genuine external update. Without this, every debounced auto-save bounces
 * back through Supabase Realtime and rebuilds the whole config, visibly
 * reloading the player mid-edit.
 */

let lastLocalSaveAt = 0;

export function markLocalSave() {
  lastLocalSaveAt = Date.now();
}

// Realtime echoes arrive well under a second after the write; 1.5s gives slack
// for slow connections without masking real external updates for long.
export function isRecentLocalSave(windowMs = 1500) {
  return Date.now() - lastLocalSaveAt < windowMs;
}
