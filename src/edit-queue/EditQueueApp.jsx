import React, { useState, useEffect } from 'react';
import { PhoneMockup } from './PhoneMockup';
import { EditorSidebar } from './EditorSidebar';
import { supabase } from '../../supabaseClient.js';

export function EditQueueApp() {
  const [config, setConfig] = useState(null);
  const [editId, setEditId] = useState('');

  useEffect(() => {
    const fetchEditId = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      let id = urlParams.get('content_id');
      
      if (!id) {
         // The new routing is /edit-queue/[content_id]
         id = window.location.pathname.split('/')[2];
      }
      
      if (!id) {
         const avatarId = localStorage.getItem('activeAvatarId');
         if (avatarId) {
             const { data } = await supabase
                 .from('edit_queue')
                 .select('content_id')
                 .eq('owner_avatar_id', avatarId)
                 .order('created_at', { ascending: false })
                 .limit(1)
                 .single();
                 
             if (data) {
                 id = data.content_id;
             }
         }
      }
      
      setEditId(id || '797f7542-eefa-4289-8f30-d59c315c9dd5');
    };
    
    fetchEditId();
  }, []);

  return (
    <div className="flex w-full h-full">
      {/* Middle section for the Phone Mockup */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <button 
          onClick={() => window.location.href = '/edit-suite'}
          className="absolute top-10 left-6 flex items-center justify-center w-10 h-10 bg-surface-container/50 hover:bg-surface-container border border-white/10 rounded-full transition-colors backdrop-blur-md text-on-surface z-50 shadow-lg cursor-pointer hover:shadow-primary/20 hover:border-primary/30"
          title="Back to Edit Suite"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>

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
