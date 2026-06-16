import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { EditQueueApp } from './EditQueueApp';
import { loadSidebar } from '../../components/sidebar.js';

function Root() {
  useEffect(() => {
    // Load the vanilla JS sidebar into the sidebar-container
    loadSidebar('sidebar-container');
  }, []);

  return <EditQueueApp />;
}

const container = document.getElementById('react-root');
const root = createRoot(container);
root.render(<Root />);
