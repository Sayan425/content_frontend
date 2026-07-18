import { supabase } from '../supabaseClient.js';
import { showCustomAlert } from './notifications.js';
import { escapeHtml } from '../utils/escape-html.js';

export function initKanbanBoard() {
    const columns = {
        'idea': document.getElementById('col-idea'),
        'script': document.getElementById('col-script'),
        'production': document.getElementById('col-production'),
        'edit': document.getElementById('col-edit')
    };
    
    const counts = {
        'idea': document.getElementById('count-idea'),
        'script': document.getElementById('count-script'),
        'production': document.getElementById('count-production'),
        'edit': document.getElementById('count-edit')
    };

    async function loadBoard() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            const currentAvatarId = localStorage.getItem('activeAvatarId');
            
            if (!userId) throw new Error('Not authenticated');

            let query = supabase
                .from('content_pipeline')
                .select('*')
                .eq('owner_user_id', userId)
                .order('stage_updated_at', { ascending: false });

            if (currentAvatarId) {
                query = query.eq('owner_avatar_id', currentAvatarId);
            }

            const { data, error } = await query;
            if (error) throw error;

            renderBoard(data || []);

        } catch (error) {
            console.error('Error loading kanban items:', error);
            await showCustomAlert(`Failed to load workspace: ${error.message}`, 'Error');
        }

        // Attach action button click listeners
        const mainContainer = document.querySelector('.custom-scrollbar');
        if (mainContainer) {
            mainContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-kanban-action');
                if (!btn) return;
                e.stopPropagation();

                const action = btn.dataset.action;
                const id = btn.dataset.id;

                if (action === 'generate-script') {
                    window.location.href = '/script-room?start_idea=' + id;
                } else if (action === 'generate-video') {
                    window.location.href = '/avatar-studio?start_script=' + id;
                } else if (action === 'edit-video') {
                    window.location.href = '/edit-queue/' + id;
                }
            });
        }
    }

    function renderBoard(items) {
        // Reset columns
        Object.values(columns).forEach(col => {
            if (col) col.innerHTML = '';
        });
        Object.keys(counts).forEach(key => {
            if (counts[key]) counts[key].textContent = '0';
        });

        const grouped = {
            'idea': [],
            'script': [],
            'production': [],
            'edit': []
        };

        items.forEach(item => {
            const stage = item.current_stage || 'idea';
            if (grouped[stage]) {
                grouped[stage].push(item);
            }
        });

        // Render each column
        Object.keys(grouped).forEach(stage => {
            const col = columns[stage];
            const countEl = counts[stage];
            if (!col || !countEl) return;

            const stageItems = grouped[stage];
            countEl.textContent = stageItems.length;

            if (stageItems.length === 0) {
                col.innerHTML = `
                    <div class="w-full py-8 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5 opacity-50">
                        <span class="text-xs text-white/40 font-medium">No items</span>
                    </div>
                `;
                return;
            }

            let html = '';
            stageItems.forEach(item => {
                const topic = escapeHtml(item.topic || 'Untitled Content');
                const dateStr = item.stage_updated_at ? new Date(item.stage_updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
                const reviewBadge = item.approval_status === 'rejected' ? `<span class="bg-error/20 text-error px-2 py-0.5 rounded text-[10px] font-bold uppercase ml-2">Rejected</span>` : '';
                const isPending = item.approval_status === 'pending';
                const borderClass = isPending ? 'border-[#ffd700]/80 shadow-[0_0_16px_rgba(255,215,0,0.15)]' : 'border-white/10';

                // Status Dots
                let pulseBorderHtml = '';
                if (isPending) {
                    pulseBorderHtml = `<div class="absolute inset-0 rounded-xl border-2 border-[#ffd700] opacity-40 animate-pulse pointer-events-none"></div>`;
                }

                // Hover Effects & Border
                let hoverShadow = 'hover:shadow-[0_4px_12px_rgba(208,188,255,0.15)] hover:border-primary/50';
                if (!isPending) {
                    if (stage === 'idea') hoverShadow = 'hover:shadow-[0_8px_24px_rgba(76,215,246,0.2)] hover:border-[#4cd7f6]/50';
                    else if (stage === 'script') hoverShadow = 'hover:shadow-[0_8px_24px_rgba(208,188,255,0.2)] hover:border-primary/50';
                    else if (stage === 'production') hoverShadow = 'hover:shadow-[0_8px_24px_rgba(255,178,183,0.2)] hover:border-[#ffb2b7]/50';
                    else if (stage === 'edit') hoverShadow = 'hover:shadow-[0_8px_24px_rgba(76,175,80,0.2)] hover:border-[#4caf50]/50';
                }

                // Custom logic for card click
                let actionContent = '';
                if (isPending) {
                    let pendingMsg = 'Content is pending approval.';
                    if (stage === 'idea') pendingMsg = 'Your selected idea is currently pending approval.';
                    else if (stage === 'script') pendingMsg = 'Your drafted script is currently pending approval.';
                    else if (stage === 'production') pendingMsg = 'Your video request is currently pending approval.';
                    else if (stage === 'edit') pendingMsg = 'Your final edit is pending approval.';
                    
                    actionContent = `<div class="w-full bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] py-2.5 px-3 rounded-lg text-[11px] font-medium leading-snug text-center cursor-default shadow-sm flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-[14px]">hourglass_empty</span> ${pendingMsg}</div>`;
                } else {
                    if (stage === 'idea') {
                        actionContent = `<button class="btn-kanban-action w-full bg-primary text-on-primary py-2 rounded-lg text-xs font-semibold hover:bg-primary-fixed transition-colors primary-glow" data-action="generate-script" data-id="${item.content_id}">Generate a script from this idea</button>`;
                    } else if (stage === 'script') {
                        actionContent = `<button class="btn-kanban-action w-full bg-primary text-on-primary py-2 rounded-lg text-xs font-semibold hover:bg-primary-fixed transition-colors primary-glow" data-action="generate-video" data-id="${item.content_id}">Generate a video from the script</button>`;
                    } else if (stage === 'production') {
                        actionContent = `<div class="w-full bg-white/5 border border-white/10 text-white/80 py-2.5 px-3 rounded-lg text-[11px] leading-snug text-center cursor-default hover:bg-white/10 transition-colors shadow-sm">All your raw videos will appear directly in the edit queue for post-production.</div>`;
                    } else if (stage === 'edit') {
                        actionContent = `<button class="btn-kanban-action w-full bg-primary text-on-primary py-2 rounded-lg text-xs font-semibold hover:bg-primary-fixed transition-colors primary-glow" data-action="edit-video" data-id="${item.content_id}">Continue editing this video</button>`;
                    }
                }

                let bgClass = "bg-surface-container-high hover:bg-surface-bright";

                html += `
                    <div class="relative group kanban-card-wrapper" data-id="${item.content_id}">
                        <div class="block w-full rounded-xl border ${borderClass} shadow-sm transition-all duration-300 ${hoverShadow} hover:-translate-y-1 hover:scale-[1.02] cursor-pointer ${bgClass} relative">
                            ${pulseBorderHtml}
                            <div class="p-4 flex flex-col gap-2 pointer-events-none relative z-10">
                                <h4 class="text-sm font-bold text-white leading-tight group-hover:text-primary transition-colors">${topic}</h4>
                                <div class="flex items-center justify-between mt-1">
                                    <div class="flex items-center gap-1.5 text-white/40 group-hover:text-white/60 transition-colors">
                                        <span class="material-symbols-outlined text-[12px]">schedule</span>
                                        <span class="text-[10px] font-medium tracking-wide">${dateStr}</span>
                                    </div>
                                    ${reviewBadge}
                                </div>
                            </div>
                        </div>
                        ${actionContent ? `
                        <div class="expandable-action overflow-hidden transition-all duration-300 max-h-0 opacity-0 mt-2 px-1">
                            ${actionContent}
                        </div>
                        ` : ''}
                    </div>
                `;
            });

            col.innerHTML = html;
        });
    }

    // Attach delegated click listener for accordion functionality
    Object.values(columns).forEach(col => {
        if (!col) return;
        col.addEventListener('click', (e) => {
            const cardWrapper = e.target.closest('.kanban-card-wrapper');
            if (!cardWrapper) return;
            
            // If they clicked the action content itself, do nothing (let button clicks pass through)
            if (e.target.closest('.expandable-action')) return;

            const expandEl = cardWrapper.querySelector('.expandable-action');
            if (!expandEl) return; // Edit suite doesn't have an action to expand

            // Close all others
            document.querySelectorAll('.expandable-action').forEach(el => {
                if (el !== expandEl) {
                    el.style.maxHeight = '0px';
                    el.style.opacity = '0';
                }
            });

            // Toggle current
            if (expandEl.style.maxHeight === '0px' || !expandEl.style.maxHeight) {
                expandEl.style.maxHeight = '100px';
                expandEl.style.opacity = '1';
            } else {
                expandEl.style.maxHeight = '0px';
                expandEl.style.opacity = '0';
            }
        });
    });

    loadBoard();
}
