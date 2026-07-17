import React, { useState } from 'react';
import { MainVideoPanel } from './components/MainVideoPanel';
import { OverlaysPanel } from './components/OverlaysPanel';
import { SubtitlesPanel } from './components/SubtitlesPanel';
import { CoverPanel } from './components/CoverPanel';
import { supabase } from '../../supabaseClient.js';
import { showCustomAlert, showCustomConfirm } from '../../components/notifications.js';

export function EditorSidebar({ config, setConfig, editId }) {
  const [activeTab, setActiveTab] = useState('main'); // 'main' or 'overlays'
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleFinalizeFlow = async () => {
    const confirmed = await showCustomConfirm('Are you sure you want to finalize this? You will not be able to go back.', 'Finalize Video');
    if (!confirmed) return;

    try {
      setIsFinalizing(true);
      
      // 1. Fetch edit_queue row to get owner_avatar_id
      const { data: editData, error: editError } = await supabase
        .from('edit_queue')
        .select('owner_avatar_id')
        .eq('content_id', editId)
        .single();
      if (editError) throw editError;

      // 2. Fetch avatar details for approval settings
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatar_details')
        .select('approver_user_id, approval_settings')
        .eq('avatar_id', editData.owner_avatar_id)
        .single();
      if (avatarError) throw avatarError;

      const approverUserId = avatarData.approver_user_id;
      let needsApproval = false;
      if (approverUserId && avatarData.approval_settings && String(avatarData.approval_settings.edit) === 'true') {
        needsApproval = true;
      }

      // 3. Update content_pipeline
      const pipelineUpdate = {
        current_stage: 'edit',
        stage_updated_at: new Date()
      };
      
      pipelineUpdate.approval_status = needsApproval ? 'pending' : (approverUserId ? 'approved' : null);

      const { error: cpError } = await supabase
        .from('content_pipeline')
        .update(pipelineUpdate)
        .eq('content_id', editId);
      if (cpError) throw cpError;

      // 4. Update edit_queue
      const editStatus = needsApproval ? 'pending_approval' : 'approved';
      const { error: eqError } = await supabase
        .from('edit_queue')
        .update({ status: editStatus })
        .eq('content_id', editId);
      if (eqError) throw eqError;

      await showCustomAlert('Your video is queued for rendering.', 'Successful');
      window.location.href = '/edit-suite';
    } catch (error) {
      console.error('Error finalizing video:', error);
      showCustomAlert('Failed to finalize video.', 'Error');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-container/50">
      {/* Header & Tabs */}
      <div className="p-6 pb-0 border-b border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 m-0">
              <span className="material-symbols-outlined text-primary">edit_square</span>
              Video Editor
          </h2>
          <button 
             onClick={handleFinalizeFlow}
             disabled={isFinalizing}
             className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary font-medium rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 flex items-center gap-2"
          >
             {isFinalizing ? <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span> : null}
             Finalize and Render
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('main')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'main'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Main Video
          </button>
          <button
            onClick={() => setActiveTab('overlays')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'overlays'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Overlays
          </button>
          <button
            onClick={() => setActiveTab('subtitles')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'subtitles'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Subtitles
          </button>
          <button
            onClick={() => setActiveTab('cover')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'cover'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Cover
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'main' && (
          <MainVideoPanel config={config} setConfig={setConfig} editId={editId} />
        )}
        {activeTab === 'overlays' && (
          <OverlaysPanel config={config} setConfig={setConfig} editId={editId} />
        )}
        {activeTab === 'subtitles' && (
          <SubtitlesPanel config={config} setConfig={setConfig} editId={editId} />
        )}
        {activeTab === 'cover' && (
          <CoverPanel config={config} editId={editId} />
        )}
      </div>

    </div>
  );
}
