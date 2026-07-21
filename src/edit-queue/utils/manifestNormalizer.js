/**
 * Normalizes a parsed manifest to the canonical formats documented in
 * docs/MANIFEST_REFERENCE.md, so the rest of the editor can rely on one shape:
 *  - position.x / position.y  -> percent strings ("50%")
 *  - position.scale           -> number (percent, 100 = normal)
 *  - position.rotation        -> number (degrees)
 *  - startInSeconds / durationInSeconds -> rounded to 2 decimals
 *
 * Values already in canonical form pass through untouched, so this is safe
 * to run on every load.
 */

const round2 = (n) => (typeof n === 'number' && isFinite(n) ? Math.round(n * 100) / 100 : n);

const toPercentString = (v) => {
  if (typeof v === 'number' && isFinite(v)) return `${v}%`;
  return v;
};

const toNumber = (v, fallback) => {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};

export function normalizeManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.overlays)) return manifest;

  manifest.overlays.forEach((o) => {
    if (o.startInSeconds !== undefined) o.startInSeconds = round2(o.startInSeconds);
    if (o.durationInSeconds !== undefined) o.durationInSeconds = round2(o.durationInSeconds);

    if (o.position && typeof o.position === 'object') {
      if (o.position.x !== undefined) o.position.x = toPercentString(o.position.x);
      if (o.position.y !== undefined) o.position.y = toPercentString(o.position.y);
      if (o.position.scale !== undefined) o.position.scale = toNumber(o.position.scale, 100);
      if (o.position.rotation !== undefined) o.position.rotation = toNumber(o.position.rotation, 0);
    }
  });

  return manifest;
}
