import { supabase } from '../supabaseClient.js';
import { escapeHtml } from '../utils/escape-html.js';

export async function initEditSuite() {
    const awaitingContainer = document.getElementById('awaiting-editing-container');
    const queuedContainer = document.getElementById('queued-rendering-container');
    
    if (!awaitingContainer || !queuedContainer) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            awaitingContainer.innerHTML = '<p class="text-white/50 w-full text-center py-8">Please log in to view your videos.</p>';
            queuedContainer.innerHTML = '<p class="text-white/50 w-full text-center py-8">Please log in to view your videos.</p>';
            return;
        }

        // Fetch awaiting videos and queued for rendering videos
        const [ {data: awaitingItems, error: error1}, {data: queuedItems, error: error2} ] = await Promise.all([
            supabase.from('edit_queue')
                .select('*')
                .eq('owner_user_id', userId)
                .in('status', ['processing', 'queued'])
                .order('created_at', { ascending: false }),
            supabase.from('edit_queue')
                .select(`
                    *,
                    content_pipeline!inner (
                        current_stage,
                        approval_status
                    )
                `)
                .eq('owner_user_id', userId)
                .eq('status', 'approved')
                .eq('content_pipeline.current_stage', 'edit')
                .eq('content_pipeline.approval_status', 'approved')
                .order('created_at', { ascending: false })
        ]);

        if (error1) throw error1;
        if (error2) throw error2;

        const renderCard = (item) => {
            const dateStr = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            return `
                <div class="video-card w-[180px] shrink-0 glass-panel rounded-xl overflow-hidden shadow-lg border border-white/5 hover:border-primary/50 transition-all duration-300 cursor-pointer group flex flex-col" data-content-id="${item.content_id}">
                    <!-- Thumbnail Placeholder (9:16 aspect ratio) -->
                    <div class="w-full aspect-[9/16] bg-black/50 relative overflow-hidden flex items-center justify-center">
                        ${item.cover_image
                            ? `<img src="${escapeHtml(item.cover_image)}" class="absolute inset-0 w-full h-full object-cover z-0" alt="Cover Image" loading="lazy" />`
                            : `<div class="absolute inset-0 bg-surface-container-highest flex flex-col items-center justify-center text-white/30 z-0">
                                  <span class="material-symbols-outlined text-[32px] mb-2 opacity-40">broken_image</span>
                                  <span class="text-[9px] font-medium tracking-widest uppercase opacity-50 text-center px-2 leading-tight">Cover Not<br/>Generated</span>
                               </div>`
                        }
                        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10"></div>
                        <div class="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 text-[10px] text-white/80">
                            <span class="material-symbols-outlined text-[12px]">calendar_today</span>
                            ${dateStr}
                        </div>
                    </div>
                    <!-- Details -->
                    <div class="p-3 flex flex-col gap-1 flex-1 bg-surface-container-low/50 backdrop-blur-md">
                        <h4 class="font-headline-sm text-white font-semibold text-xs line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            ${escapeHtml(item.topic || 'Untitled Video')}
                        </h4>
                    </div>
                </div>
            `;
        };

        const renderAwaiting = (items) => {
            if (items.length > 0) {
                awaitingContainer.innerHTML = items.map(renderCard).join('');
            } else {
                awaitingContainer.innerHTML = '<div class="flex flex-col items-center justify-center w-full text-white/30 py-8"><span class="material-symbols-outlined text-[32px] mb-2">inbox</span><span class="text-sm">No video in the editing pipeline</span></div>';
            }
            
            // Re-attach listeners for awaiting
            awaitingContainer.querySelectorAll('.video-card').forEach(card => {
                card.addEventListener('click', () => {
                    const contentId = card.getAttribute('data-content-id');
                    if (contentId) {
                        window.location.href = '/edit-queue/' + contentId;
                    }
                });
            });
        };

        const renderQueued = (items) => {
            if (items.length > 0) {
                queuedContainer.innerHTML = items.map(renderCard).join('');
            } else {
                queuedContainer.innerHTML = '<div class="flex flex-col items-center justify-center w-full text-white/30 py-8"><span class="material-symbols-outlined text-[32px] mb-2">inbox</span><span class="text-sm">No video in the rendering pipeline</span></div>';
            }
            
            // Re-attach listeners for queued (if needed)
            queuedContainer.querySelectorAll('.video-card').forEach(card => {
                card.addEventListener('click', () => {
                    const contentId = card.getAttribute('data-content-id');
                    if (contentId) {
                        // Normally might go to a different place or same place
                        window.location.href = '/edit-queue/' + contentId;
                    }
                });
            });
        };


        // Initial render
        renderAwaiting(awaitingItems);
        renderQueued(queuedItems);

        // Search logic
        const searchInput = document.getElementById('video-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = awaitingItems.filter(item => {
                    const title = item.topic || 'Untitled Video';
                    return title.toLowerCase().includes(term);
                });
                renderAwaiting(filtered);
            });
        }

    } catch (err) {
        console.error('Failed to load edit suite videos:', err);
        awaitingContainer.innerHTML = `<p class="text-error w-full text-center py-8">Error loading videos.</p>`;
        queuedContainer.innerHTML = `<p class="text-error w-full text-center py-8">Error loading videos.</p>`;
    }
}
