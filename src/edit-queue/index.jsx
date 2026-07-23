import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { EditQueueApp } from './EditQueueApp';

let currentRoot = null;

export function mountEditQueue(containerId = 'react-root') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // The editor is full-bleed: enforce it here too, so a stale/cached
  // workspace.js can never bring the padded "floating island" back.
  const main = document.getElementById('main-content');
  if (main) {
    main.classList.remove('p-8', 'overflow-y-auto');
    main.classList.add('overflow-hidden');
  }

  if (currentRoot) {
    currentRoot.unmount();
  }

  currentRoot = createRoot(container);
  currentRoot.render(<EditQueueApp />);
}

// Tear down the editor when navigating away, so the Remotion player stops
// and its audio/video no longer plays in the background.
export function unmountEditQueue() {
  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }
  window.__EDIT_QUEUE_MOUNTED__ = false;
}

// Support for standalone loading if react-root exists and we're not using the mount function directly
if (document.getElementById('react-root') && !window.__EDIT_QUEUE_MOUNTED__) {
  window.__EDIT_QUEUE_MOUNTED__ = true;
  mountEditQueue('react-root');
}
