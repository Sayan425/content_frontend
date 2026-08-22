/**
 * Guards against saving a manifest that was never read cleanly.
 *
 * The editor auto-saves the WHOLE manifest on every change, so if the in-memory
 * config was ever built from an incomplete or unparseable read, the next edit
 * writes that gutted version over a perfectly good database row and the
 * overlays are gone for good.
 *
 * PhoneMockup marks the manifest "safe" only after a read where the manifest
 * column was actually present and parsed. autoSaveManager refuses to write
 * anything until that has happened for the edit currently open.
 */

let safeEditId = null;

/** Called after a clean manifest read for `editId`. */
export function markManifestLoaded(editId) {
  safeEditId = editId || null;
}

/** Called when loading starts, fails, or the editor tears down. */
export function markManifestUnsafe() {
  safeEditId = null;
}

/** True only when the manifest for THIS edit was read cleanly. */
export function isManifestSafeToSave(editId) {
  return Boolean(editId) && safeEditId === editId;
}
