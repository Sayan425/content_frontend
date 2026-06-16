import React, { useState, useEffect } from 'react';
import { PhoneMockup } from './PhoneMockup';
import { EditorSidebar } from './EditorSidebar';

export function EditQueueApp() {
  const [config, setConfig] = useState(null);
  const [editId, setEditId] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('edit_id') || '797f7542-eefa-4289-8f30-d59c315c9dd5';
    setEditId(id);
  }, []);

  return (
    <div className="flex w-full h-full">
      {/* Middle section for the Phone Mockup */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Background glow effect for aesthetics */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <PhoneMockup config={config} setConfig={setConfig} editId={editId} />
      </div>

      {/* Right section for the Editor Sidebar */}
      <div className="w-[650px] border-l border-white/10 bg-surface-container/50 backdrop-blur-md flex flex-col h-full shadow-2xl z-20 relative">
        <EditorSidebar config={config} setConfig={setConfig} editId={editId} />
      </div>
    </div>
  );
}
