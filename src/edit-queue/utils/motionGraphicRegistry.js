import * as Babel from '@babel/standalone';
import React from 'react';
import * as Remotion from 'remotion';
import { supabase } from '../../lib/supabase';

/**
 * Motion Graphic Registry
 * ------------------------
 * Motion graphics are authored as standalone TypeScript React modules (.tsx)
 * stored in Cloudflare R2 under editing-assets/motion-graphics/. A manifest
 * overlay references one by `templateId` (== motion_graphics.composition_id).
 *
 * This module resolves templateId -> file_name (via the motion_graphics table),
 * fetches the .tsx source, transpiles it in the browser (Babel: TS + React,
 * classic runtime), executes it with a tiny module shim, and hands back the
 * exported React component. Everything is cached so repeated ids never re-fetch.
 */

// The motion-graphics bucket differs from the general asset bucket, so it is
// not covered by the existing assetResolver / `/r2-assets` proxy.
const R2_MG_BASE = 'https://pub-345e8414642f4b00859c994c81be94de.r2.dev';
const MG_DIR = 'editing-assets/motion-graphics';

// In dev we go through the `/mg-assets` Vite proxy to avoid browser CORS on the
// raw .tsx fetch; in prod we hit the public R2 URL directly.
const mgBaseUrl = () => (import.meta.env.DEV ? '/mg-assets' : R2_MG_BASE);

// templateId (composition_id) -> file_name
const fileNameCache = new Map();
// templateId -> Promise<React component>
const componentCache = new Map();

async function resolveFileName(templateId) {
  if (fileNameCache.has(templateId)) return fileNameCache.get(templateId);

  const { data, error } = await supabase
    .from('motion_graphics')
    .select('file_name')
    .eq('composition_id', templateId)
    .single();

  if (error) throw new Error(`Motion graphic "${templateId}" lookup failed: ${error.message}`);
  if (!data?.file_name) throw new Error(`No file_name for motion graphic "${templateId}"`);

  fileNameCache.set(templateId, data.file_name);
  return data.file_name;
}

// Minimal CommonJS require shim for the transpiled modules. Compositions only
// ever import from 'react' and 'remotion'.
function shimRequire(name) {
  if (name === 'react') return React;
  if (name === 'remotion') return Remotion;
  throw new Error(`Motion graphic tried to import unsupported module "${name}"`);
}

function compileSource(source, fileName) {
  const transpiled = Babel.transform(source, {
    filename: fileName,
    presets: [
      ['env', { modules: 'commonjs', targets: { esmodules: true } }],
      ['react', { runtime: 'classic' }],
      ['typescript', { isTSX: true, allExtensions: true }],
    ],
  }).code;

  const module = { exports: {} };
  const factory = new Function('require', 'module', 'exports', 'React', transpiled);
  factory(shimRequire, module, module.exports, React);

  const exported = module.exports || {};
  // Prefer a default export, otherwise the first exported function (component).
  const Component =
    exported.default ||
    Object.values(exported).find((v) => typeof v === 'function');

  if (!Component) throw new Error(`No component export found in "${fileName}"`);
  return Component;
}

/**
 * Load (and cache) the React component for a given templateId.
 * @returns {Promise<React.ComponentType>}
 */
export function loadComposition(templateId) {
  if (!templateId) return Promise.reject(new Error('Missing templateId'));
  if (componentCache.has(templateId)) return componentCache.get(templateId);

  const promise = (async () => {
    const fileName = await resolveFileName(templateId);
    const url = `${mgBaseUrl()}/${MG_DIR}/${fileName}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch "${fileName}" (${res.status})`);
    const source = await res.text();
    return compileSource(source, fileName);
  })();

  // Don't cache failures — allow a later retry.
  promise.catch(() => componentCache.delete(templateId));
  componentCache.set(templateId, promise);
  return promise;
}
