import { prefetch } from 'remotion';

/**
 * In-memory asset cache for the editor session.
 *
 * Remotion's prefetch() downloads a file once into a blob (RAM) and every
 * <OffthreadVideo>/<Audio>/<Img> that later uses the same URL reads it from
 * memory instead of re-hitting R2. This is what makes template switches
 * instant after the initial one-time buffer.
 *
 * Each URL is only ever prefetched once per session, no matter how many times
 * the manifest is re-processed.
 */

// url -> { free, waitUntilDone } handle returned by prefetch()
const handles = new Map();

export function prefetchAsset(url, onProgress) {
  if (!url) return null;
  if (handles.has(url)) return handles.get(url);

  const handle = prefetch(url, {
    method: 'blob-url',
    onProgress: onProgress
      ? ({ loadedBytes, totalBytes }) => onProgress(loadedBytes, totalBytes)
      : undefined,
  });
  handles.set(url, handle);

  // A failed download shouldn't poison the cache — drop it so a later
  // attempt (e.g. after a network blip) can retry.
  handle.waitUntilDone().catch((err) => {
    console.warn('Prefetch failed for', url, err);
    handles.delete(url);
  });

  return handle;
}

/** Wait for one asset (typically the main video) to be fully in memory. */
export function waitForAsset(url) {
  const handle = handles.get(url);
  return handle ? handle.waitUntilDone() : Promise.resolve();
}

/** Release all cached blobs (called when the editor unmounts). */
export function freeAllAssets() {
  handles.forEach((h) => {
    try { h.free(); } catch { /* already freed */ }
  });
  handles.clear();
}
