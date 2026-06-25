import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { EditQueueApp } from './EditQueueApp';

let currentRoot = null;

export function mountEditQueue(containerId = 'react-root') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (currentRoot) {
    currentRoot.unmount();
  }

  currentRoot = createRoot(container);
  currentRoot.render(<EditQueueApp />);
}

// Support for standalone loading if react-root exists and we're not using the mount function directly
if (document.getElementById('react-root') && !window.__EDIT_QUEUE_MOUNTED__) {
  window.__EDIT_QUEUE_MOUNTED__ = true;
  mountEditQueue('react-root');
}
