import { supabase } from '../supabaseClient.js';

export async function initEditSuite() {
    const awaitingContainer = document.getElementById('awaiting-editing-container');
    const completedContainer = document.getElementById('completed-videos-container');
    
    if (!awaitingContainer || !completedContainer) return;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            awaitingContainer.innerHTML = '<p class="text-white/50 w-full text-center py-8">Please log in to view your videos.</p>';
            completedContainer.innerHTML = '<p class="text-white/50 w-full text-center py-8">Please log in to view your videos.</p>';
            return;
        }

        // Fetch videos from edit_queue
        const { data: editQueueItems, error } = await supabase
            .from('edit_queue')
            .select('*')
            .eq('owner_user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Separate items by status
        // Videos awaiting editing = 'processing' (or 'queued')
        // Completed videos = 'approved'
        const awaitingItems = editQueueItems.filter(item => item.status === 'processing' || item.status === 'queued');
        const completedItems = editQueueItems.filter(item => item.status === 'approved');

        const renderCard = (item) => {
            const dateStr = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            return `
                <div class="video-card min-w-[280px] max-w-[280px] glass-panel rounded-xl overflow-hidden shadow-lg border border-white/5 hover:border-primary/50 transition-all duration-300 cursor-pointer group flex flex-col" data-content-id="${item.content_id}">
                    <!-- Thumbnail Placeholder -->
                    <div class="w-full h-40 bg-black/50 relative overflow-hidden flex items-center justify-center">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                        <span class="material-symbols-outlined text-white/20 text-[64px] group-hover:scale-110 transition-transform duration-500">movie</span>
                        <div class="absolute bottom-2 left-3 z-20 flex items-center gap-1.5 text-xs text-white/70">
                            <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                            ${dateStr}
                        </div>
                    </div>
                    <!-- Details -->
                    <div class="p-4 flex flex-col gap-2 flex-1">
                        <h4 class="font-headline-sm text-white font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            ${item.topic || 'Untitled Video'}
                        </h4>
                    </div>
                </div>
            `;
        };

        if (awaitingItems.length > 0) {
            awaitingContainer.innerHTML = awaitingItems.map(renderCard).join('');
        } else {
            awaitingContainer.innerHTML = '<div class="flex flex-col items-center justify-center w-full text-white/30 py-8"><span class="material-symbols-outlined text-[32px] mb-2">inbox</span><span class="text-sm">No videos waiting to be edited.</span></div>';
        }

        if (completedItems.length > 0) {
            completedContainer.innerHTML = completedItems.map(renderCard).join('');
        } else {
            completedContainer.innerHTML = '<div class="flex flex-col items-center justify-center w-full text-white/30 py-8"><span class="material-symbols-outlined text-[32px] mb-2">inbox</span><span class="text-sm">No completed videos yet.</span></div>';
        }

        // Add click listeners
        document.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => {
                const contentId = card.getAttribute('data-content-id');
                if (contentId) {
                    window.location.href = '/edit-queue/' + contentId;
                }
            });
        });

    } catch (err) {
        console.error('Failed to load edit suite videos:', err);
        awaitingContainer.innerHTML = `<p class="text-error w-full text-center py-8">Error loading videos.</p>`;
        completedContainer.innerHTML = `<p class="text-error w-full text-center py-8">Error loading videos.</p>`;
    }
}
