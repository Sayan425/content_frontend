import { supabase } from '../supabaseClient.js';
import { showCustomAlert } from './notifications.js';
import { escapeHtml } from '../utils/escape-html.js';

export function initCompletedVideos() {
    const gridContainer = document.getElementById('completed-videos-grid');
    const searchInput = document.getElementById('search-completed-videos');
    let allVideos = [];

    async function loadVideos() {
        if (!gridContainer) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            const currentAvatarId = localStorage.getItem('activeAvatarId');
            
            if (!userId) throw new Error('Not authenticated');

            let query = supabase
                .from('content_pipeline')
                .select('*')
                .eq('owner_user_id', userId)
                .eq('current_stage', 'completed')
                .order('stage_updated_at', { ascending: false });

            if (currentAvatarId) {
                query = query.eq('owner_avatar_id', currentAvatarId);
            }

            const { data, error } = await query;
            if (error) throw error;

            allVideos = data || [];
            renderVideos(allVideos);

        } catch (error) {
            console.error('Error loading completed videos:', error);
            gridContainer.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-20 text-center w-full bg-error/10 border border-error/20 rounded-2xl">
                    <span class="material-symbols-outlined text-[40px] text-error mb-2">error</span>
                    <span class="text-error font-medium">Failed to load videos</span>
                    <span class="text-error/70 text-sm mt-1">${escapeHtml(error.message)}</span>
                </div>
            `;
            await showCustomAlert(`Failed to load videos: ${error.message}`, 'Error');
        }
    }

    function renderVideos(videos) {
        if (!gridContainer) return;

        if (videos.length === 0) {
            gridContainer.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-32 text-center w-full">
                    <div class="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                        <span class="material-symbols-outlined text-[40px] text-white/20">movie</span>
                    </div>
                    <h3 class="font-headline-sm text-white font-bold mb-2">No Completed Videos Yet</h3>
                    <p class="text-on-surface-variant text-sm max-w-md mx-auto">Videos that have finished the editing and rendering process will appear here.</p>
                </div>
            `;
            return;
        }

        let html = '';
        videos.forEach(video => {
            const topic = escapeHtml(video.topic || 'Untitled Video');
            const dateStr = video.stage_updated_at ? new Date(video.stage_updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const videoUrl = escapeHtml(video.final_video || '#');

            // Handle cover image
            let coverBg = '';
            let coverContent = '';
            if (video.cover_image) {
                coverBg = `background-image: url('${escapeHtml(video.cover_image).replace(/'/g, '')}'); background-size: cover; background-position: center;`;
            } else {
                coverBg = `background: linear-gradient(135deg, #1f1f1f 0%, #0a0a0a 100%);`;
                coverContent = `<span class="material-symbols-outlined text-[48px] text-white/10">play_circle</span>`;
            }

            html += `
                <div class="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:scale-[1.02] hover:border-primary/50 hover:shadow-[0_10px_40px_rgba(208,188,255,0.2)] bg-surface-container">
                    
                    <!-- Cover Image / Fallback -->
                    <div class="absolute inset-0 transition-transform duration-700 group-hover:scale-105 flex items-center justify-center" style="${coverBg}">
                        ${coverContent}
                    </div>

                    <!-- Top Gradient Overlay (for readability) -->
                    <div class="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"></div>
                    
                    <!-- Bottom Gradient Overlay -->
                    <div class="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none"></div>
                    
                    <!-- Date Badge -->
                    <div class="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 text-white/80 px-2.5 py-1 rounded-md text-[10px] font-mono-label tracking-wide uppercase shadow-lg z-10">
                        ${dateStr}
                    </div>

                    <!-- Content -->
                    <div class="absolute bottom-0 left-0 w-full p-5 flex flex-col gap-3 z-10">
                        <h3 class="font-bold text-white text-base leading-tight line-clamp-3 group-hover:text-primary transition-colors" title="${topic}">${topic}</h3>
                        
                        <div class="flex items-center" style="gap: 8px;">
                            <button type="button" data-video-url="${videoUrl}" class="btn-watch-video flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-primary border border-white/20 hover:border-primary text-white text-sm font-bold flex items-center justify-center gap-2 backdrop-blur-sm transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(208,188,255,0.4)] group/btn">
                                <span class="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">play_arrow</span>
                                Watch Video
                            </button>
                            <button type="button" data-video-url="${videoUrl}" data-video-topic="${topic}" title="Download video" aria-label="Download video" class="btn-download-video shrink-0 w-[42px] h-[42px] rounded-xl bg-white/10 hover:bg-primary border border-white/20 hover:border-primary text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(208,188,255,0.4)] disabled:opacity-60 disabled:cursor-wait group/dl">
                                <span class="material-symbols-outlined text-[18px] group-hover/dl:scale-110 transition-transform">download</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        gridContainer.innerHTML = html;

        // Attach event listeners to all newly created watch buttons
        document.querySelectorAll('.btn-watch-video').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-video-url');
                if (url && url !== '#') {
                    openVideoPreview(url);
                } else {
                    showCustomAlert('Video URL not available yet.', 'Notice');
                }
            });
        });

        document.querySelectorAll('.btn-download-video').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const el = e.currentTarget;
                downloadVideo(el.getAttribute('data-video-url'), el.getAttribute('data-video-topic'), el);
            });
        });
    }

    // Turn a topic into a filename that is legal on Windows, macOS and Linux.
    function toFileName(topic) {
        const cleaned = String(topic || 'video')
            .replace(/[\\/:*?"<>|]/g, '')   // characters no OS allows in a filename
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80)
            .trim();                        // re-trim in case slice left a trailing space
        return `${cleaned || 'video'}.mp4`;
    }

    // Fetch the video into a blob so the browser saves it straight to Downloads.
    // The `download` attribute alone is ignored on cross-origin URLs (the video
    // lives on the R2 domain), which would just open it in a new tab instead.
    async function downloadVideo(url, topic, btn) {
        if (!url || url === '#') {
            await showCustomAlert('Video URL not available yet.', 'Notice');
            return;
        }
        if (btn.disabled) return; // already downloading this one

        const icon = btn.querySelector('.material-symbols-outlined');
        const originalIcon = icon ? icon.textContent : 'download';
        btn.disabled = true;
        if (icon) {
            icon.textContent = 'progress_activity';
            icon.classList.add('animate-spin');
        }

        let objectUrl = null;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Server responded ${response.status}`);

            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = toFileName(topic);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading video:', error);
            await showCustomAlert('Could not download the video. Please try again.', 'Error');
        } finally {
            // Always release the blob, otherwise the memory stays held for the
            // whole session and stacks up with every download.
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            btn.disabled = false;
            if (icon) {
                icon.textContent = originalIcon;
                icon.classList.remove('animate-spin');
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtered = allVideos.filter(v => (v.topic || '').toLowerCase().includes(query));
            renderVideos(filtered);
        });
    }

    // Modal Logic
    const modalPreview = document.getElementById('modal-video-preview');
    const btnClosePreview = document.getElementById('btn-close-preview');
    const videoPlayer = document.getElementById('preview-video-player');
    const previewContainer = document.getElementById('preview-container');

    function openVideoPreview(url) {
        if (!modalPreview || !videoPlayer) return;
        videoPlayer.src = url;
        
        modalPreview.classList.remove('hidden');
        // trigger reflow
        void modalPreview.offsetWidth;
        modalPreview.classList.remove('opacity-0');
        if (previewContainer) {
            previewContainer.classList.remove('scale-95');
            previewContainer.classList.add('scale-100');
        }
        
        videoPlayer.play().catch(e => console.error("Auto-play prevented", e));
    }

    function closeVideoPreview() {
        if (!modalPreview || !videoPlayer) return;
        
        modalPreview.classList.add('opacity-0');
        if (previewContainer) {
            previewContainer.classList.remove('scale-100');
            previewContainer.classList.add('scale-95');
        }
        
        videoPlayer.pause();
        videoPlayer.src = '';
        
        setTimeout(() => {
            modalPreview.classList.add('hidden');
        }, 300); // match transition duration
    }

    if (btnClosePreview) {
        btnClosePreview.addEventListener('click', closeVideoPreview);
    }

    if (modalPreview) {
        // click outside to close
        modalPreview.addEventListener('click', (e) => {
            if (e.target === modalPreview || e.target.classList.contains('absolute')) {
                closeVideoPreview();
            }
        });
    }

    loadVideos();
}
