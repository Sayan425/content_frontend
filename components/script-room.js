import { supabase } from '../supabaseClient.js';
import systemPrompts from '../system-prompts.json';

export function initScriptRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const avatarId = urlParams.get('avatar_id');
    
    if (!avatarId) {
        console.warn('No avatar_id found in URL. Some Script Room features may not work.');
        return;
    }

    const boardContainer = document.getElementById('saved-ideas-board');
    const btnCreateScratch = document.getElementById('btn-create-scratch');

    if (btnCreateScratch) {
        btnCreateScratch.addEventListener('click', () => {
            alert('Opening Script Editor from scratch... (to be implemented)');
            // Here we would transition to the actual editor UI
        });
    }

    async function loadSavedIdeas() {
        if (!boardContainer) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('watchlist_results')
                .select(`
                    *,
                    watchlists:owner_competitor_id (
                        competitor_name
                    )
                `)
                .eq('owner_user_id', userId)
                .eq('saved_to_idea_vault', 'yes')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                boardContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-20 text-center w-full" style="column-span: all;">
                        <div class="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                            <span class="material-symbols-outlined text-[40px] text-white/20">push_pin</span>
                        </div>
                        <h3 class="font-headline-sm text-white font-bold mb-2">Your Pinboard is Empty</h3>
                        <p class="text-on-surface-variant text-sm max-w-md mx-auto">You haven't saved any ideas yet. Head over to Idea Labs to save content to your vault, and they will appear here.</p>
                    </div>
                `;
                return;
            }

            function getPlatformDetails(url) {
                if (!url) return { html: '<span class="material-symbols-outlined text-[16px]">link</span>', borderBg: 'bg-white/5 border-white/10 hover:bg-white/15', color: 'text-white' };
                url = url.toLowerCase();
                
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    return { 
                        html: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px]"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>', 
                        borderBg: 'bg-[#FF0000]/10 border-[#FF0000]/30 hover:bg-[#FF0000]/20', 
                        color: 'text-[#FF0000]' 
                    };
                }
                if (url.includes('instagram.com')) {
                    return { 
                        html: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px]"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>', 
                        borderBg: 'bg-[#E1306C]/10 border-[#E1306C]/30 hover:bg-[#E1306C]/20', 
                        color: 'text-[#E1306C]' 
                    };
                }
                if (url.includes('tiktok.com')) {
                    return { 
                        html: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px]"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>', 
                        borderBg: 'bg-[#00f2fe]/10 border-[#00f2fe]/30 hover:bg-[#00f2fe]/20', 
                        color: 'text-[#00f2fe]' 
                    };
                }
                if (url.includes('twitter.com') || url.includes('x.com')) {
                    return { 
                        html: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>', 
                        borderBg: 'bg-[#E7E9EA]/10 border-[#E7E9EA]/30 hover:bg-[#E7E9EA]/20', 
                        color: 'text-[#E7E9EA]' 
                    };
                }
                if (url.includes('linkedin.com')) {
                    return { 
                        html: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px]"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>', 
                        borderBg: 'bg-[#0077b5]/10 border-[#0077b5]/30 hover:bg-[#0077b5]/20', 
                        color: 'text-[#0077b5]' 
                    };
                }
                if (url.includes('facebook.com') || url.includes('fb.com')) {
                    return { 
                        html: '<svg viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px]"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>', 
                        borderBg: 'bg-[#1877F2]/10 border-[#1877F2]/30 hover:bg-[#1877F2]/20', 
                        color: 'text-[#1877F2]' 
                    };
                }
                
                return { html: '<span class="material-symbols-outlined text-[16px]">link</span>', borderBg: 'bg-white/5 border-white/10 hover:bg-white/15', color: 'text-white' };
            }

            function getEmbedUrl(url) {
                if (!url) return null;
                if (url.includes('youtube.com/watch')) {
                    const videoId = new URL(url).searchParams.get('v');
                    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
                }
                if (url.includes('youtu.be/')) {
                    const videoId = url.split('youtu.be/')[1].split('?')[0];
                    return `https://www.youtube.com/embed/${videoId}`;
                }
                if (url.includes('instagram.com/p/') || url.includes('instagram.com/reel/')) {
                    // Instagram embed needs a trailing slash before embed
                    const cleanUrl = url.split('?')[0];
                    return cleanUrl.endsWith('/') ? cleanUrl + 'embed' : cleanUrl + '/embed';
                }
                return url;
            }

            function getPlatformName(url) {
                if (!url) return 'Other';
                url = url.toLowerCase();
                if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
                if (url.includes('instagram.com')) return 'Instagram';
                if (url.includes('tiktok.com')) return 'TikTok';
                if (url.includes('twitter.com') || url.includes('x.com')) return 'X (Twitter)';
                if (url.includes('linkedin.com')) return 'LinkedIn';
                if (url.includes('facebook.com') || url.includes('fb.com')) return 'Facebook';
                return 'Other';
            }

            let allIdeas = data;
            const filterPlatform = document.getElementById('filter-platform');
            const filterCreator = document.getElementById('filter-creator');

            // Extract unique platforms and creators
            const platforms = new Set();
            const creators = new Set();

            allIdeas.forEach(item => {
                const platform = getPlatformName(item.content_link);
                platforms.add(platform);
                
                // Pull creator name from the newly joined watchlists table, falling back to parsed properties
                const creator = item.watchlists?.competitor_name || item.content_creator || item.creator_name || item.channel_name || item.author || item.creator || item.parsed_idea?.Creator || 'Unknown Creator';
                item._extracted_creator = creator;
                item._extracted_platform = platform;
                creators.add(creator);
            });

            // Populate dropdowns
            if (filterPlatform) {
                filterPlatform.innerHTML = '<option value="all">Filter by Platform</option>';
                Array.from(platforms).sort().forEach(p => {
                    filterPlatform.innerHTML += `<option value="${p}">${p}</option>`;
                });
            }

            if (filterCreator) {
                filterCreator.innerHTML = '<option value="all">Filter by Creator</option>';
                Array.from(creators).sort().forEach(c => {
                    filterCreator.innerHTML += `<option value="${c}">${c}</option>`;
                });
            }

            function renderIdeas(ideasToRender) {
                if (!ideasToRender || ideasToRender.length === 0) {
                    boardContainer.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-20 text-center w-full" style="column-span: all;">
                            <div class="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                                <span class="material-symbols-outlined text-[40px] text-white/20">search_off</span>
                            </div>
                            <h3 class="font-headline-sm text-white font-bold mb-2">No ideas match your filters</h3>
                            <p class="text-on-surface-variant text-sm max-w-md mx-auto">Try adjusting your platform or creator filters.</p>
                        </div>
                    `;
                    return;
                }

                let html = '';
                
                // Pre-defined glowing pin styles with hex colors
                const pinStyles = [
                    { hex: '#d0bcff' }, // Primary
                    { hex: '#4cd7f6' }, // Secondary
                    { hex: '#ffb2b7' }, // Tertiary
                    { hex: '#00f2fe' }  // Cyan
                ];
                
                ideasToRender.forEach((item, index) => {
                // Pronounced main card rotation
                const baseRotation = index % 2 === 0 ? 4 : -4;
                const rotation = baseRotation + (Math.random() * 2 - 1);
                const offsetY = (Math.random() * 12) - 6; 
                const pin = pinStyles[index % pinStyles.length];
                
                // Extract relevant data, handling possible missing fields gracefully
                const topic = item.content_topic || item.parsed_idea?.Topic || item.idea_summary || item.topic || 'Untitled Idea';
                
                // Parse or generate scores for the Potential readout
                let vScore = item.parsed_idea?.['Virality Score'] || item.virality_score || item.parsed_idea?.['Virality_Score'];
                let eScore = item.parsed_idea?.['Engagement Score'] || item.engagement_score || item.parsed_idea?.['Engagement_Score'];
                const vDisplay = vScore ? String(vScore).replace(/[^0-9]/g, '').substring(0, 2) : Math.floor(Math.random() * 15 + 82);
                const eDisplay = eScore ? String(eScore).replace(/[^0-9]/g, '').substring(0, 2) : Math.floor(Math.random() * 15 + 80);

                const platformData = getPlatformDetails(item.content_link);

                // Pronounced zigzag rotations and translations for the underlying paper layers
                // so they fan out clearly instead of stacking perfectly vertically
                const layer1Rot = 5; 
                const layer1TransX = 4;
                const layer1TransY = 8;
                
                const layer2Rot = -4;
                const layer2TransX = -6;
                const layer2TransY = 4;

                html += `
                    <div class="relative group break-inside-avoid mb-12 pt-6 w-full max-w-[320px] mx-auto" style="transform: rotate(${rotation}deg) translateY(${offsetY}px) translateZ(0); will-change: transform;" data-id="${item.content_id}">
                        
                        <!-- Stacked Premium Paper Container (Animates smoothly on hover) -->
                        <div class="w-full min-h-[220px] relative cursor-pointer transition-transform duration-300 ease-out group-hover:-translate-y-2 drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]">
                            
                            <!-- Hyper-Realistic Pushpin (Anchored to the paper container so it moves with it) -->
                            <div class="absolute -top-3 left-1/2 -translate-x-1/2 z-50 w-6 h-6 flex items-center justify-center pointer-events-none">
                                <!-- Pierced hole in paper -->
                                <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black/90 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,1)]"></div>
                                <!-- Contact shadow of the plastic head -->
                                <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black/60 rounded-full blur-[2px] translate-y-[2px]"></div>
                                <!-- Wide plastic base resting on paper -->
                                <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-[14px] h-[14px] rounded-full border border-black/40" style="background: radial-gradient(circle at 30% 30%, ${pin.hex}, #1a1a1a);"></div>
                                <!-- Tall cylinder head coming at the viewer -->
                                <div class="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full shadow-[0_5px_5px_rgba(0,0,0,0.5)]" style="background: radial-gradient(circle at 40% 30%, #ffffff 5%, ${pin.hex} 40%, #000000 95%);"></div>
                                <!-- Specular highlight -->
                                <div class="absolute top-[5px] left-[10px] w-1 h-1.5 bg-white/80 rounded-full rotate-45 blur-[0.5px]"></div>
                            </div>
                            
                            <!-- Bottom Paper Layer (Tilted Right) -->
                            <div class="absolute inset-0 bg-[#25232A] rounded-2xl border border-white/5 shadow-[0_2px_12px_rgba(0,0,0,0.7)] pointer-events-none" style="transform: rotate(${layer1Rot}deg) translate(${layer1TransX}px, ${layer1TransY}px);"></div>
                            
                            <!-- Middle Paper Layer (Tilted Left) -->
                            <div class="absolute inset-0 bg-[#28262E] rounded-2xl border border-white/5 shadow-[0_2px_12px_rgba(0,0,0,0.7)] pointer-events-none" style="transform: rotate(${layer2Rot}deg) translate(${layer2TransX}px, ${layer2TransY}px);"></div>
                            
                            <!-- Top Paper Layer (Main Card) -->
                            <div class="relative w-full h-full bg-gradient-to-br from-[#2E2B36] to-[#232128] rounded-2xl p-8 pt-10 border border-white/10 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),inset_-1px_-1px_2px_rgba(0,0,0,0.4)] flex flex-col z-10 overflow-hidden">
                                
                                <!-- Subtle Ruled Lines -->
                                <div class="absolute inset-0 pointer-events-none opacity-20" style="background-image: repeating-linear-gradient(transparent, transparent 39px, rgba(255,255,255,0.08) 39px, rgba(255,255,255,0.08) 40px); background-position: 0 30px;"></div>
                            
                            <!-- Expanding Glowing Accent Line -->
                            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-[3px] rounded-b-full opacity-60 group-hover:w-[70%] group-hover:opacity-100 transition-all duration-500 ease-out z-20" style="background-color: ${pin.hex}; box-shadow: 0 0 12px ${pin.hex};"></div>
                            
                            <!-- Platform Inspiration Icon (Top Right) -->
                            <button class="platform-link-btn absolute top-5 right-5 w-9 h-9 rounded-full ${platformData.borderBg} border flex items-center justify-center transition-all z-30 shadow-inner group/btn hover:scale-110" data-link="${item.content_link}" title="Inspiration Source">
                                <span class="${platformData.color} transition-transform group-hover/btn:scale-110 flex items-center justify-center">${platformData.html}</span>
                            </button>
                            
                            <!-- Content Container (Z-10 to stay completely crisp above background) -->
                            <div class="relative z-10 flex flex-col h-full flex-1">
                                <div class="mb-4">
                                    <div class="flex items-center gap-1.5 mb-2.5">
                                        <span class="material-symbols-outlined text-[14px] text-primary/80">lightbulb</span>
                                        <h4 class="text-xs text-primary/80 uppercase tracking-[0.2em] font-bold font-mono-label">Topic</h4>
                                    </div>
                                    <!-- Premium dark glass box for Topic -->
                                    <div class="bg-black/20 p-4 rounded-xl border border-white/5 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.4)] backdrop-blur-sm min-h-[70px] flex flex-col justify-center cursor-pointer hover:bg-black/40 hover:border-primary/50 transition-all group/topic btn-generate-takes relative overflow-hidden" data-topic="${topic.replace(/"/g, '&quot;')}">
                                        <p class="font-headline-sm text-white text-[15px] font-bold leading-snug line-clamp-3 group-hover/topic:text-primary transition-all duration-300 relative z-10">${topic}</p>
                                    </div>
                                </div>
                                
                                <!-- Futuristic Potential Scores Display -->
                                <div class="mt-auto pt-2">
                                    <div class="flex items-center gap-1.5 mb-2.5">
                                        <span class="material-symbols-outlined text-[14px] text-primary/80">radar</span>
                                        <h4 class="text-xs text-primary/80 uppercase tracking-[0.2em] font-bold font-mono-label">Potential</h4>
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        
                                        <!-- Virality Score Panel -->
                                        <div class="relative bg-[#131118]/80 border border-white/5 rounded-xl p-3 overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.6)] group/v">
                                            <!-- Holographic dot matrix background -->
                                            <div class="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_1px_1px,rgba(208,188,255,1)_1px,transparent_0)]" style="background-size: 6px 6px;"></div>
                                            
                                            <div class="relative z-10 flex flex-col">
                                                <span class="text-[8px] text-white/50 uppercase tracking-widest font-mono-label mb-1">Virality</span>
                                                <div class="flex items-baseline gap-0.5">
                                                    <span class="text-2xl font-bold text-white font-mono-label tracking-tighter" style="text-shadow: 0 0 12px rgba(208,188,255,0.7)">${vDisplay}</span>
                                                    <span class="text-xs text-primary/70 font-mono-label">%</span>
                                                </div>
                                            </div>
                                            
                                            <!-- Cyberpunk Accent Corner -->
                                            <div class="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40 rounded-br-xl transition-all duration-300 group-hover/v:border-primary group-hover/v:w-5 group-hover/v:h-5"></div>
                                        </div>

                                        <!-- Engagement Score Panel -->
                                        <div class="relative bg-[#131118]/80 border border-white/5 rounded-xl p-3 overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.6)] group/e">
                                            <!-- Holographic dot matrix background -->
                                            <div class="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_1px_1px,rgba(76,215,246,1)_1px,transparent_0)]" style="background-size: 6px 6px;"></div>
                                            
                                            <div class="relative z-10 flex flex-col">
                                                <span class="text-[8px] text-white/50 uppercase tracking-widest font-mono-label mb-1">Engagement</span>
                                                <div class="flex items-baseline gap-0.5">
                                                    <span class="text-2xl font-bold text-white font-mono-label tracking-tighter" style="text-shadow: 0 0 12px rgba(76,215,246,0.7)">${eDisplay}</span>
                                                    <span class="text-xs text-secondary/70 font-mono-label">%</span>
                                                </div>
                                            </div>
                                            
                                            <!-- Cyberpunk Accent Corner -->
                                            <div class="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-secondary/40 rounded-br-xl transition-all duration-300 group-hover/e:border-secondary group-hover/e:w-5 group-hover/e:h-5"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            });
            
            boardContainer.innerHTML = html;
        }

        // Initial render
        renderIdeas(allIdeas);

        // Add event listeners for filters
        if (filterPlatform && filterCreator) {
            const applyFilters = () => {
                const selectedPlatform = filterPlatform.value;
                const selectedCreator = filterCreator.value;
                
                let filtered = allIdeas;
                if (selectedPlatform !== 'all') {
                    filtered = filtered.filter(item => item._extracted_platform === selectedPlatform);
                }
                if (selectedCreator !== 'all') {
                    filtered = filtered.filter(item => item._extracted_creator === selectedCreator);
                }
                
                renderIdeas(filtered);
            };

            filterPlatform.addEventListener('change', applyFilters);
            filterCreator.addEventListener('change', applyFilters);
        }

            // Attach click listeners to platform links (Iframe Popup)
            const iframeModal = document.getElementById('iframe-modal');
            const iframeContainer = document.getElementById('iframe-container');
            const iframeExternalLink = document.getElementById('iframe-external-link');
            const closeIframeModalBtn = document.getElementById('close-iframe-modal');

            const platformBtns = boardContainer.querySelectorAll('.platform-link-btn');
            platformBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent opening the script editor
                    const link = btn.dataset.link;
                    if (!link || link === 'null') {
                        alert('No link available for this inspiration.');
                        return;
                    }
                    
                    const embedUrl = getEmbedUrl(link);
                    iframeExternalLink.href = link;
                    
                    iframeContainer.innerHTML = `
                        <span class="material-symbols-outlined animate-spin text-white/50 text-[32px] absolute z-0">autorenew</span>
                        <iframe src="${embedUrl}" class="w-full h-full relative z-10 border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    `;
                    
                    iframeModal.classList.remove('hidden');
                    // Trigger reflow
                    void iframeModal.offsetWidth;
                    iframeModal.classList.remove('opacity-0');
                    iframeModal.classList.add('opacity-100');
                });
            });

            if (closeIframeModalBtn) {
                closeIframeModalBtn.addEventListener('click', () => {
                    iframeModal.classList.remove('opacity-100');
                    iframeModal.classList.add('opacity-0');
                    setTimeout(() => {
                        iframeModal.classList.add('hidden');
                        iframeContainer.innerHTML = '<span class="material-symbols-outlined animate-spin text-white/50 text-[32px] absolute">autorenew</span>';
                    }, 300);
                });
            }

            // Attach click listeners to cards for the script editor
            const cardContents = boardContainer.querySelectorAll('.card-content');
            cardContents.forEach(content => {
                content.addEventListener('click', () => {
                    const id = content.closest('.relative').dataset.id;
                    alert(`Opening Script Editor for idea ID: ${id} (to be implemented)`);
                    // Transition to actual editor loaded with this idea
                });
            });

            // Attach click listeners for Takes Generator
            boardContainer.querySelectorAll('.btn-generate-takes').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const topic = btn.dataset.topic;
                    if (topic) openTakesModal(topic);
                });
            });

        } catch (error) {
            console.error('Error loading saved ideas:', error);
            boardContainer.innerHTML = `
                <div class="w-full text-center text-error p-4 bg-error/10 rounded-lg border border-error/20" style="column-span: all;">
                    Failed to load saved ideas: ${error.message}
                </div>
            `;
        }
    }

    loadSavedIdeas();

    // ==========================================
    // Groq Takes Generator Logic
    // ==========================================
    
    // Modal Elements
    const takesModal = document.getElementById('modal-takes-generator');
    const closeTakesModalBtn = document.getElementById('close-takes-modal');
    const takesTopicDisplay = document.getElementById('takes-topic-display');
    const takesLoadingState = document.getElementById('takes-loading-state');
    const takesResultsState = document.getElementById('takes-results-state');
    const takesCustomState = document.getElementById('takes-custom-state');
    const takesCustomInput = document.getElementById('takes-custom-input');
    
    // Structure UI Elements
    const generatorModalIcon = document.getElementById('generator-modal-icon');
    const generatorModalText = document.getElementById('generator-modal-text');
    const structuresTakeDisplayContainer = document.getElementById('structures-take-display-container');
    const structuresTakeDisplay = document.getElementById('structures-take-display');
    const structuresLoadingState = document.getElementById('structures-loading-state');
    const structuresResultsState = document.getElementById('structures-results-state');

    // Hooks UI Elements
    const hooksStructureDisplayContainer = document.getElementById('hooks-structure-display-container');
    const hooksStructureDisplay = document.getElementById('hooks-structure-display');
    const hooksLoadingState = document.getElementById('hooks-loading-state');
    const hooksResultsState = document.getElementById('hooks-results-state');

    // Persona & CTA UI Elements
    const personaHookDisplayContainer = document.getElementById('persona-hook-display-container');
    const personaHookDisplay = document.getElementById('persona-hook-display');
    const personaLoadingState = document.getElementById('persona-loading-state');
    const personaResultsState = document.getElementById('persona-results-state');
    const customCtaInput = document.getElementById('custom-cta-input');
    
    // Script UI Elements
    const scriptLoadingState = document.getElementById('script-loading-state');
    const scriptResultsState = document.getElementById('script-results-state');
    const scriptMetadataContainer = document.getElementById('script-metadata-container');
    const scriptOutputTextarea = document.getElementById('script-output-textarea');
    const scriptDeliveryNote = document.getElementById('script-delivery-note');
    const btnCopyScript = document.getElementById('btn-copy-script');

    // Shared Buttons
    const btnRegenerate = document.getElementById('btn-regenerate');
    const btnWriteCustom = document.getElementById('btn-write-custom');
    const btnConfirmSelection = document.getElementById('btn-confirm-selection');

    let loadingInterval = null;

    function startLoadingAnimation(elementId, textArray) {
        if (loadingInterval) clearInterval(loadingInterval);
        const pElement = document.querySelector(`#${elementId} p`);
        if (!pElement) return;
        let i = 0;
        pElement.textContent = textArray[0];
        loadingInterval = setInterval(() => {
            i = (i + 1) % textArray.length;
            pElement.textContent = textArray[i];
        }, 2000);
    }

    function stopLoadingAnimation() {
        if (loadingInterval) {
            clearInterval(loadingInterval);
            loadingInterval = null;
        }
    }

    let generatorStep = 1; // 1 = Takes, 2 = Structures, 3 = Hooks, 4 = Persona + CTA, 5 = Script
    let currentTakesTopic = '';
    let currentSelectedTake = null;
    let previousTakes = [];
    let currentSelectedStructure = null;
    let previousStructures = [];
    let currentSelectedHook = null;
    let previousHooks = [];
    let currentSelectedPersona = null;
    let currentSelectedCTA = null;

    // Back button listener
    const backBtn = document.getElementById('btn-generator-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (generatorStep > 1) {
                generatorStep--;
                updateGeneratorStepUI();
            }
        });
    }

    function updateGeneratorStepUI() {
        const backBtnEl = document.getElementById('btn-generator-back');
        const progressHeader = document.getElementById('generator-progress-header');
        
        if (generatorStep === 1) {
            generatorModalIcon.textContent = 'psychology';
            generatorModalText.textContent = 'Generate Video Takes';
            
            if (backBtnEl) backBtnEl.classList.add('hidden');
            if (progressHeader) progressHeader.classList.remove('hidden');
            
            takesResultsState.classList.remove('hidden');
            structuresResultsState.classList.add('hidden');
            hooksResultsState.classList.add('hidden');
            personaResultsState.classList.add('hidden');
            if (scriptResultsState) scriptResultsState.classList.add('hidden');
            
            structuresTakeDisplayContainer.classList.add('hidden');
            hooksStructureDisplayContainer.classList.add('hidden');
            personaHookDisplayContainer.classList.add('hidden');
            const scriptPersonaDisplayContainer = document.getElementById('script-persona-display-container');
            if (scriptPersonaDisplayContainer) scriptPersonaDisplayContainer.classList.add('hidden');
            
            takesLoadingState.classList.add('hidden');
            structuresLoadingState.classList.add('hidden');
            hooksLoadingState.classList.add('hidden');
            personaLoadingState.classList.add('hidden');
            if (scriptLoadingState) scriptLoadingState.classList.add('hidden');
            
            const footerContainer = btnConfirmSelection?.parentElement;
            if (footerContainer) {
                footerContainer.className = 'mt-8 flex justify-between items-center pt-4 border-t border-white/10';
            }
            if (btnRegenerate) btnRegenerate.classList.remove('hidden');
            if (btnWriteCustom) btnWriteCustom.classList.remove('hidden');
            
            if (btnConfirmSelection) {
                btnConfirmSelection.textContent = 'Continue to Flow';
                btnConfirmSelection.disabled = !currentSelectedTake;
            }
        } else if (generatorStep === 2) {
            generatorModalIcon.textContent = 'account_tree';
            generatorModalText.textContent = 'Generate Storytelling Format';
            
            if (backBtnEl) backBtnEl.classList.remove('hidden');
            if (progressHeader) progressHeader.classList.remove('hidden');
            
            takesResultsState.classList.add('hidden');
            structuresResultsState.classList.remove('hidden');
            hooksResultsState.classList.add('hidden');
            personaResultsState.classList.add('hidden');
            if (scriptResultsState) scriptResultsState.classList.add('hidden');
            
            structuresTakeDisplayContainer.classList.remove('hidden');
            structuresTakeDisplay.textContent = currentSelectedTake;
            hooksStructureDisplayContainer.classList.add('hidden');
            personaHookDisplayContainer.classList.add('hidden');
            const scriptPersonaDisplayContainer = document.getElementById('script-persona-display-container');
            if (scriptPersonaDisplayContainer) scriptPersonaDisplayContainer.classList.add('hidden');
            
            takesLoadingState.classList.add('hidden');
            structuresLoadingState.classList.add('hidden');
            hooksLoadingState.classList.add('hidden');
            personaLoadingState.classList.add('hidden');
            if (scriptLoadingState) scriptLoadingState.classList.add('hidden');
            
            const footerContainer = btnConfirmSelection?.parentElement;
            if (footerContainer) {
                footerContainer.className = 'mt-8 flex justify-between items-center pt-4 border-t border-white/10';
            }
            if (btnRegenerate) btnRegenerate.classList.remove('hidden');
            if (btnWriteCustom) btnWriteCustom.classList.remove('hidden');
            
            if (btnConfirmSelection) {
                btnConfirmSelection.textContent = 'Select Format';
                btnConfirmSelection.disabled = !currentSelectedStructure;
            }
        } else if (generatorStep === 3) {
            generatorModalIcon.textContent = 'phishing';
            generatorModalText.textContent = 'Generate Hook';
            
            if (backBtnEl) backBtnEl.classList.remove('hidden');
            if (progressHeader) progressHeader.classList.remove('hidden');
            
            takesResultsState.classList.add('hidden');
            structuresResultsState.classList.add('hidden');
            hooksResultsState.classList.remove('hidden');
            personaResultsState.classList.add('hidden');
            if (scriptResultsState) scriptResultsState.classList.add('hidden');
            
            structuresTakeDisplayContainer.classList.remove('hidden');
            structuresTakeDisplay.textContent = currentSelectedTake;
            hooksStructureDisplayContainer.classList.remove('hidden');
            hooksStructureDisplay.textContent = currentSelectedStructure ? currentSelectedStructure.name : '';
            personaHookDisplayContainer.classList.add('hidden');
            const scriptPersonaDisplayContainer = document.getElementById('script-persona-display-container');
            if (scriptPersonaDisplayContainer) scriptPersonaDisplayContainer.classList.add('hidden');
            
            takesLoadingState.classList.add('hidden');
            structuresLoadingState.classList.add('hidden');
            hooksLoadingState.classList.add('hidden');
            personaLoadingState.classList.add('hidden');
            if (scriptLoadingState) scriptLoadingState.classList.add('hidden');
            
            const footerContainer = btnConfirmSelection?.parentElement;
            if (footerContainer) {
                footerContainer.className = 'mt-8 flex justify-between items-center pt-4 border-t border-white/10';
            }
            if (btnRegenerate) btnRegenerate.classList.remove('hidden');
            if (btnWriteCustom) btnWriteCustom.classList.remove('hidden');
            
            if (btnConfirmSelection) {
                btnConfirmSelection.textContent = 'Select Hook';
                btnConfirmSelection.disabled = !currentSelectedHook;
            }
        } else if (generatorStep === 4) {
            generatorModalIcon.textContent = 'person';
            generatorModalText.textContent = 'Assign Persona & CTA';
            
            if (backBtnEl) backBtnEl.classList.remove('hidden');
            if (progressHeader) progressHeader.classList.remove('hidden');
            
            takesResultsState.classList.add('hidden');
            structuresResultsState.classList.add('hidden');
            hooksResultsState.classList.add('hidden');
            personaResultsState.classList.remove('hidden');
            if (scriptResultsState) scriptResultsState.classList.add('hidden');
            
            structuresTakeDisplayContainer.classList.remove('hidden');
            structuresTakeDisplay.textContent = currentSelectedTake;
            hooksStructureDisplayContainer.classList.remove('hidden');
            hooksStructureDisplay.textContent = currentSelectedStructure ? currentSelectedStructure.name : '';
            personaHookDisplayContainer.classList.remove('hidden');
            personaHookDisplay.textContent = currentSelectedHook ? `"${currentSelectedHook.hook}"` : '';
            const scriptPersonaDisplayContainer = document.getElementById('script-persona-display-container');
            if (scriptPersonaDisplayContainer) scriptPersonaDisplayContainer.classList.add('hidden');
            
            takesLoadingState.classList.add('hidden');
            structuresLoadingState.classList.add('hidden');
            hooksLoadingState.classList.add('hidden');
            personaLoadingState.classList.add('hidden');
            if (scriptLoadingState) scriptLoadingState.classList.add('hidden');
            
            const footerContainer = btnConfirmSelection?.parentElement;
            if (footerContainer) {
                footerContainer.className = 'mt-8 flex justify-center items-center pt-4 border-t border-white/10';
            }
            if (btnRegenerate) btnRegenerate.classList.add('hidden');
            if (btnWriteCustom) btnWriteCustom.classList.add('hidden');
            
            if (btnConfirmSelection) {
                btnConfirmSelection.textContent = 'Finalize Idea & Generate Script';
                btnConfirmSelection.disabled = !currentSelectedPersona;
            }
        } else if (generatorStep === 5) {
            generatorModalIcon.textContent = 'description';
            generatorModalText.textContent = 'Generate Full Script';
            
            if (backBtnEl) backBtnEl.classList.remove('hidden');
            if (progressHeader) progressHeader.classList.add('hidden');
            
            takesResultsState.classList.add('hidden');
            structuresResultsState.classList.add('hidden');
            hooksResultsState.classList.add('hidden');
            personaResultsState.classList.add('hidden');
            if (scriptResultsState) scriptResultsState.classList.remove('hidden');
            
            takesLoadingState.classList.add('hidden');
            structuresLoadingState.classList.add('hidden');
            hooksLoadingState.classList.add('hidden');
            personaLoadingState.classList.add('hidden');
            
            const footerContainer = btnConfirmSelection?.parentElement;
            if (footerContainer) {
                footerContainer.className = 'mt-8 flex justify-center items-center pt-4 border-t border-white/10';
            }
            if (btnRegenerate) btnRegenerate.classList.add('hidden');
            if (btnWriteCustom) btnWriteCustom.classList.add('hidden');
            
            if (btnConfirmSelection) {
                btnConfirmSelection.textContent = 'Finish & Save';
                btnConfirmSelection.disabled = false;
            }
        }
    }

    function advanceToStep2() {
        generatorStep = 2;
        updateGeneratorStepUI();
        runStructuresGeneration();
    }

    function advanceToStep3() {
        generatorStep = 3;
        updateGeneratorStepUI();
        runHooksGeneration();
    }

    function advanceToStep4() {
        generatorStep = 4;
        updateGeneratorStepUI();
        runPersonasGeneration();
    }

    function advanceToStep5() {
        generatorStep = 5;
        updateGeneratorStepUI();
        runScriptGeneration();
    }

    async function generateTakesFromGroq(topic, prevTakes = []) {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            throw new Error('OpenAI API Key not found in environment variables. Please add VITE_OPENAI_API_KEY to your .env file.');
        }

        let userContent = `Topic: ${topic}`;
        if (prevTakes && prevTakes.length > 0) {
            userContent += `\n\nPrevious Takes (DO NOT REPEAT THESE):\n${prevTakes.map(t => `- ${t}`).join('\n')}`;
        }

        const combinedInput = `${systemPrompts.videoTakesPrompt}\n\n${userContent}`;

        const payload = {
            model: "gpt-4.1-mini",
            input: combinedInput,
            tools: [{ type: "web_search_preview" }],
            text: {
                format: {
                    type: "json_schema",
                    name: "takes_schema",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            takes: {
                                type: "array",
                                items: { type: "string" }
                            }
                        },
                        required: ["takes"],
                        additionalProperties: false
                    }
                }
            }
        };

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API Error: ${err}`);
        }

        const data = await response.json();
        
        let parsedResult;
        
        try {
            // New Responses API Structure
            if (data.output && Array.isArray(data.output)) {
                const messageOutput = data.output.find(item => item.type === "message" && item.role === "assistant");
                if (messageOutput && messageOutput.content) {
                    const textContent = messageOutput.content.find(c => c.type === "output_text")?.text;
                    if (textContent) {
                        parsedResult = JSON.parse(textContent);
                    }
                }
            }
            
            // Older fallback structures
            if (!parsedResult && data.choices && data.choices[0] && data.choices[0].message) {
                 parsedResult = JSON.parse(data.choices[0].message.content);
            }
            
            if (!parsedResult) {
                 const textContent = JSON.stringify(data);
                 const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                 if (jsonMatch) parsedResult = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Ignore parse error on fallback and throw custom below
        }

        if (parsedResult && parsedResult.takes) return parsedResult.takes;
        
        throw new Error('OpenAI did not return takes in the expected format. Raw response: ' + JSON.stringify(data));
    }

    async function generateStructuresFromGroq(topic, take, prevStructures = []) {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            throw new Error('OpenAI API Key not found in environment variables. Please add VITE_OPENAI_API_KEY to your .env file.');
        }

        let userContent = `Topic: ${topic}\nTake: ${take}`;
        if (prevStructures && prevStructures.length > 0) {
            userContent += `\n\nPrevious Structures (DO NOT REPEAT THESE NAMES OR EXACT FLOWS):\n${prevStructures.map(s => `- ${s}`).join('\n')}`;
        }

        const combinedInput = `${systemPrompts.videoStructurePrompt}\n\n${userContent}`;

        const payload = {
            model: "gpt-4.1-mini",
            input: combinedInput,
            tools: [{ type: "web_search_preview" }],
            text: {
                format: {
                    type: "json_schema",
                    name: "structures_schema",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            detectedContentType: { type: "string" },
                            structures: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        description: { type: "string" },
                                        flow: {
                                            type: "array",
                                            items: { type: "string" },
                                            // Enforce exactly 4 beats if we want to be strict, but strict mode sometimes rejects these. 
                                            // We will leave it as an array to let the model decide, it follows instructions well.
                                        }
                                    },
                                    required: ["name", "description", "flow"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["detectedContentType", "structures"],
                        additionalProperties: false
                    }
                }
            }
        };

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API Error: ${err}`);
        }

        const data = await response.json();
        
        let parsedResult;
        
        try {
            // New Responses API Structure
            if (data.output && Array.isArray(data.output)) {
                const messageOutput = data.output.find(item => item.type === "message" && item.role === "assistant");
                if (messageOutput && messageOutput.content) {
                    const textContent = messageOutput.content.find(c => c.type === "output_text")?.text;
                    if (textContent) {
                        parsedResult = JSON.parse(textContent);
                    }
                }
            }
            
            // Older fallback structures
            if (!parsedResult && data.choices && data.choices[0] && data.choices[0].message) {
                 parsedResult = JSON.parse(data.choices[0].message.content);
            }
            
            if (!parsedResult) {
                 const textContent = JSON.stringify(data);
                 const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                 if (jsonMatch) parsedResult = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // ignore parse error on fallback
        }

        if (parsedResult && parsedResult.structures) return parsedResult.structures;

        throw new Error('OpenAI did not return structures in the expected format. Raw response: ' + JSON.stringify(data));
    }

    async function generateHooksFromOpenAI(topic, take, structure, prevHooks = []) {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            throw new Error('OpenAI API Key not found in environment variables. Please add VITE_OPENAI_API_KEY to your .env file.');
        }

        let userContent = `Topic: ${topic}\nTake: ${take}\nScript Structure: ${structure.name} - ${structure.flow.join(' -> ')}`;
        if (prevHooks && prevHooks.length > 0) {
            userContent += `\n\nPrevious Hooks (DO NOT REPEAT THESE):\n${prevHooks.map(h => `- ${h}`).join('\n')}`;
        }

        const combinedInput = `${systemPrompts.videoHooksPrompt}\n\n${userContent}`;

        const payload = {
            model: "gpt-4.1-mini",
            input: combinedInput,
            text: {
                format: {
                    type: "json_schema",
                    name: "hooks_schema",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            hooks: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        hook: { type: "string" },
                                        psychology: { type: "string" }
                                    },
                                    required: ["hook", "psychology"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["hooks"],
                        additionalProperties: false
                    }
                }
            }
        };

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API Error: ${err}`);
        }

        const data = await response.json();
        
        let parsedResult;
        
        try {
            if (data.output && Array.isArray(data.output)) {
                const messageOutput = data.output.find(item => item.type === "message" && item.role === "assistant");
                if (messageOutput && messageOutput.content) {
                    const textContent = messageOutput.content.find(c => c.type === "output_text")?.text;
                    if (textContent) {
                        parsedResult = JSON.parse(textContent);
                    }
                }
            }
            if (!parsedResult && data.choices && data.choices[0] && data.choices[0].message) {
                 parsedResult = JSON.parse(data.choices[0].message.content);
            }
            if (!parsedResult) {
                 const textContent = JSON.stringify(data);
                 const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                 if (jsonMatch) parsedResult = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {}

        if (parsedResult && parsedResult.hooks) return parsedResult.hooks;

        throw new Error('OpenAI did not return hooks in the expected format. Raw response: ' + JSON.stringify(data));
    }

    async function generatePersonasFromOpenAI(topic, take, structure, hook) {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            throw new Error('OpenAI API Key not found in environment variables. Please add VITE_OPENAI_API_KEY to your .env file.');
        }

        let userContent = `Topic: ${topic}\nTake: ${take}\nScript Structure: ${structure.name}\nHook: ${hook.hook}`;

        const combinedInput = `${systemPrompts.videoPersonaPrompt}\n\n${userContent}`;

        const payload = {
            model: "gpt-4.1-mini",
            input: combinedInput,
            text: {
                format: {
                    type: "json_schema",
                    name: "personas_schema",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            personas: {
                                type: "array",
                                items: { type: "string" }
                            }
                        },
                        required: ["personas"],
                        additionalProperties: false
                    }
                }
            }
        };

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API Error: ${err}`);
        }

        const data = await response.json();
        let parsedResult;
        
        try {
            if (data.output && Array.isArray(data.output)) {
                const messageOutput = data.output.find(item => item.type === "message" && item.role === "assistant");
                if (messageOutput && messageOutput.content) {
                    const textContent = messageOutput.content.find(c => c.type === "output_text")?.text;
                    if (textContent) parsedResult = JSON.parse(textContent);
                }
            }
            if (!parsedResult && data.choices && data.choices[0] && data.choices[0].message) {
                 parsedResult = JSON.parse(data.choices[0].message.content);
            }
            if (!parsedResult) {
                 const textContent = JSON.stringify(data);
                 const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                 if (jsonMatch) parsedResult = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {}

        if (parsedResult && parsedResult.personas) return parsedResult.personas;
        throw new Error('OpenAI did not return personas in the expected format. Raw response: ' + JSON.stringify(data));
    }

    async function runHooksGeneration() {
        if (hooksLoadingState) {
            hooksLoadingState.classList.remove('hidden');
            startLoadingAnimation('hooks-loading-state', [
                `Engineering psychological hooks for ${currentTakesTopic || 'the topic'}...`,
                `Finding the perfect pattern interrupt...`,
                `Opening curiosity loops...`
            ]);
        }
        if (hooksResultsState) hooksResultsState.classList.add('hidden');
        if (hooksResultsState) hooksResultsState.innerHTML = '';
        
        try {
            const hooks = await generateHooksFromOpenAI(currentTakesTopic, currentSelectedTake, currentSelectedStructure, previousHooks);
            previousHooks.push(...hooks.map(h => h.hook));
            
            hooks.forEach((hookItem, idx) => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left p-4 rounded-xl bg-black/40 border border-white/10 hover:border-white/50 hover:bg-white/5 transition-all text-white text-[15px] hooks-option-btn';
                
                btn.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-white/50 font-mono-label mr-2">0${idx+1}</span>
                        <span class="text-[10px] uppercase tracking-widest px-2 py-1 bg-white/10 rounded-md font-bold text-white/80 border border-white/20">${hookItem.psychology}</span>
                    </div>
                    <div class="leading-relaxed text-sm">
                        "${hookItem.hook}"
                    </div>
                `;
                
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.hooks-option-btn').forEach(b => {
                        b.classList.remove('border-white', 'bg-white/10');
                        b.classList.add('border-white/10', 'bg-black/40');
                    });
                    btn.classList.remove('border-white/10', 'bg-black/40');
                    btn.classList.add('border-white', 'bg-white/10');
                    currentSelectedHook = hookItem;
                    if (btnConfirmSelection) btnConfirmSelection.disabled = false;
                    setTimeout(() => {
                        advanceToStep4();
                    }, 300);
                });
                if (hooksResultsState) hooksResultsState.appendChild(btn);
            });

            if (hooksLoadingState) {
                hooksLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (hooksResultsState) hooksResultsState.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            if (hooksLoadingState) {
                hooksLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (hooksResultsState) hooksResultsState.classList.remove('hidden');
            if (hooksResultsState) {
                hooksResultsState.innerHTML = `<div class="text-error p-4 bg-error/10 rounded-xl border border-error/20">Error generating hooks: ${error.message}</div>`;
            }
        }
    }

    async function runPersonasGeneration() {
        if (personaLoadingState) {
            personaLoadingState.classList.remove('hidden');
            startLoadingAnimation('persona-loading-state', [
                `Finding the right voice for ${currentTakesTopic || 'the topic'}...`,
                `Matching creator personas to the script...`,
                `Selecting the perfect narrator...`
            ]);
        }
        if (personaResultsState) personaResultsState.classList.add('hidden');
        const container = document.getElementById('persona-buttons-container');
        if (container) container.innerHTML = '';
        
        try {
            const personas = await generatePersonasFromOpenAI(currentTakesTopic, currentSelectedTake, currentSelectedStructure, currentSelectedHook);
            
            if (container) {
                personas.forEach((persona, idx) => {
                    const btn = document.createElement('button');
                    btn.className = 'w-full text-center p-3 rounded-xl bg-black/40 border border-white/10 hover:border-secondary/50 hover:bg-white/5 transition-all text-white text-[15px] font-bold tracking-wide persona-option-btn';
                    btn.textContent = persona;
                    
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.persona-option-btn').forEach(b => {
                            b.classList.remove('border-secondary', 'bg-secondary/10');
                            b.classList.add('border-white/10', 'bg-black/40');
                        });
                        btn.classList.remove('border-white/10', 'bg-black/40');
                        btn.classList.add('border-secondary', 'bg-secondary/10');
                        currentSelectedPersona = persona;
                        checkStep4Completion();
                    });
                    container.appendChild(btn);
                });

                // Add Custom Persona button with inline text input
                const customBtn = document.createElement('div');
                customBtn.className = 'w-full text-center p-3 rounded-xl bg-black/40 border border-white/10 hover:border-secondary/50 hover:bg-white/5 transition-all text-white text-[15px] font-bold tracking-wide persona-option-btn flex items-center justify-center cursor-text col-span-2';
                customBtn.innerHTML = `
                    <span class="material-symbols-outlined text-[18px] mr-2">add</span>
                    <input type="text" id="custom-persona-input" class="bg-transparent border-none outline-none text-white text-center placeholder-white/30 font-bold w-full" placeholder="Or type your own custom persona..." />
                `;
                const inputField = customBtn.querySelector('input');

                customBtn.addEventListener('click', () => {
                    document.querySelectorAll('.persona-option-btn').forEach(b => {
                        b.classList.remove('border-secondary', 'bg-secondary/10');
                        b.classList.add('border-white/10', 'bg-black/40');
                    });
                    customBtn.classList.remove('border-white/10', 'bg-black/40');
                    customBtn.classList.add('border-secondary', 'bg-secondary/10');
                    inputField.focus();
                    currentSelectedPersona = inputField.value.trim() || null;
                    checkStep4Completion();
                });

                inputField.addEventListener('input', (e) => {
                    currentSelectedPersona = e.target.value.trim() || null;
                    if (customBtn.classList.contains('border-secondary')) {
                        checkStep4Completion();
                    }
                });
                container.appendChild(customBtn);
            }

            if (personaLoadingState) {
                personaLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (personaResultsState) personaResultsState.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            if (personaLoadingState) {
                personaLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (personaResultsState) personaResultsState.classList.remove('hidden');
            if (container) {
                container.innerHTML = `<div class="text-error p-4 bg-error/10 rounded-xl border border-error/20 col-span-2">Error generating personas: ${error.message}</div>`;
            }
        }
    }

    function checkStep4Completion() {
        if (!btnConfirmSelection) return;
        const customText = document.getElementById('custom-cta-input')?.value.trim();
        currentSelectedCTA = customText || null;
        btnConfirmSelection.disabled = !currentSelectedPersona;
    }

    async function generateScriptFromOpenAI(topic, take, format, hook, persona, cta) {
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!openaiKey) {
            throw new Error('OpenAI API Key not found');
        }

        const userContent = `TOPIC: ${topic}\nTAKE: ${take}\nPERSONA: ${persona}\nHOOK TYPE: ${hook.psychology}\nSTRUCTURE: ${format.name} - ${format.flow.join(' -> ')}\n${cta ? `CTA: ${cta}\n` : ''}\nNote: The user explicitly selected the hook: "${hook.hook}". You should ideally incorporate or heavily adapt this hook into your script's opening.`;

        const combinedInput = `${systemPrompts.videoScriptPrompt}\n\n${userContent}`;

        const payload = {
            model: "gpt-4.1-mini",
            input: combinedInput,
            tools: [{ type: "web_search_preview" }],
            text: {
                format: {
                    type: "json_schema",
                    name: "script_schema",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            meta: {
                                type: "object",
                                properties: {
                                    hook_archetype: { type: "string" },
                                    target_emotion: { type: "string" },
                                    psychological_triggers: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    body_structure: { type: "string" },
                                    persona_lens: { type: "string" }
                                },
                                required: ["hook_archetype", "target_emotion", "psychological_triggers", "body_structure", "persona_lens"],
                                additionalProperties: false
                            },
                            script: {
                                type: "object",
                                properties: {
                                    hook: { type: "string" },
                                    body: { type: "string" },
                                    outro: { type: "string" },
                                    full_script: { type: "string" }
                                },
                                required: ["hook", "body", "outro", "full_script"],
                                additionalProperties: false
                            },
                            delivery: {
                                type: "object",
                                properties: {
                                    word_count: { type: "integer" },
                                    estimated_runtime_seconds: { type: "integer" },
                                    rehook_locations: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    key_delivery_note: { type: "string" },
                                    bolded_line: { type: "string" }
                                },
                                required: ["word_count", "estimated_runtime_seconds", "rehook_locations", "key_delivery_note", "bolded_line"],
                                additionalProperties: false
                            }
                        },
                        required: ["meta", "script", "delivery"],
                        additionalProperties: false
                    }
                }
            }
        };

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API Error: ${err}`);
        }

        const data = await response.json();
        
        let parsedResult;
        try {
            if (data.output && data.output.length > 0) {
                const messageOutput = data.output.find(o => o.type === 'message');
                if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
                    const textContent = messageOutput.content.find(c => c.type === 'output_text');
                    if (textContent && textContent.text) {
                        parsedResult = JSON.parse(textContent.text);
                        return parsedResult;
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing script output', e);
        }
        
        throw new Error('OpenAI did not return the script in the expected format. Raw response: ' + JSON.stringify(data));
    }

    async function runScriptGeneration() {
        if (scriptLoadingState) {
            scriptLoadingState.classList.remove('hidden');
            startLoadingAnimation('script-loading-state', [
                `Writing the final script for ${currentTakesTopic || 'the topic'}...`,
                `Applying the Four-Step Addiction Loop...`,
                `Adding the selected hook and persona...`,
                `Polishing the delivery notes...`
            ]);
        }
        if (scriptResultsState) scriptResultsState.classList.add('hidden');
        
        try {
            const result = await generateScriptFromOpenAI(
                currentTakesTopic, 
                currentSelectedTake, 
                currentSelectedStructure, 
                currentSelectedHook, 
                currentSelectedPersona, 
                currentSelectedCTA
            );
            
            // Populate Metadata
            if (scriptMetadataContainer) {
                scriptMetadataContainer.innerHTML = `
                    <div class="bg-black/40 border border-white/10 text-white/80 px-2.5 py-1 rounded-md text-[11px] font-mono-label tracking-wide flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px] text-primary/70">lightbulb</span> Topic: ${currentTakesTopic}</div>
                    <div class="bg-black/40 border border-white/10 text-white/80 px-2.5 py-1 rounded-md text-[11px] font-mono-label tracking-wide flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px] text-white/50">description</span> ${result.delivery.word_count} words</div>
                    <div class="bg-black/40 border border-white/10 text-white/80 px-2.5 py-1 rounded-md text-[11px] font-mono-label tracking-wide flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px] text-white/50">schedule</span> ~${result.delivery.estimated_runtime_seconds} sec</div>
                `;
            }

            // Populate Textarea (now a div)
            if (scriptOutputTextarea) {
                scriptOutputTextarea.textContent = result.script.full_script;
            }



            if (scriptLoadingState) {
                scriptLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (scriptResultsState) scriptResultsState.classList.remove('hidden');
            
            if (btnConfirmSelection) {
                btnConfirmSelection.textContent = 'Finish & Save';
                btnConfirmSelection.disabled = false; // Always enabled to allow them to exit
            }
        } catch (error) {
            console.error(error);
            if (scriptLoadingState) {
                scriptLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (scriptResultsState) scriptResultsState.classList.remove('hidden');
            if (scriptResultsState) {
                scriptResultsState.innerHTML = `<div class="text-error p-4 bg-error/10 rounded-xl border border-error/20">Error generating script: ${error.message}</div>`;
            }
        }
    }

    function openTakesModal(topic) {
        if (!takesModal) return;
        generatorStep = 1;
        currentTakesTopic = topic;
        
        // Reset UI to Takes Step
        currentSelectedTake = null;
        currentSelectedStructure = null;
        currentSelectedHook = null;
        currentSelectedPersona = null;
        currentSelectedCTA = null;
        
        previousTakes = [];
        previousStructures = [];
        previousHooks = [];
        
        if (customCtaInput) {
            customCtaInput.value = '';
        }

        if (takesTopicDisplay) takesTopicDisplay.textContent = topic;
        
        if (takesResultsState) takesResultsState.innerHTML = '';
        if (takesCustomInput) takesCustomInput.value = '';
        
        updateGeneratorStepUI();

        if (takesLoadingState) takesLoadingState.classList.remove('hidden');
        
        takesModal.classList.remove('hidden');
        void takesModal.offsetWidth;
        takesModal.classList.remove('opacity-0');
        takesModal.classList.add('opacity-100');

        runTakesGeneration();
    }

    function closeTakesModalFunc() {
        if (!takesModal) return;
        takesModal.classList.remove('opacity-100');
        takesModal.classList.add('opacity-0');
        setTimeout(() => takesModal.classList.add('hidden'), 300);
    }

    if (closeTakesModalBtn) closeTakesModalBtn.addEventListener('click', closeTakesModalFunc);

    async function runTakesGeneration() {
        if (takesLoadingState) {
            takesLoadingState.classList.remove('hidden');
            startLoadingAnimation('takes-loading-state', [
                `Analyzing ${currentTakesTopic || 'topic'}...`,
                `Finding weird angles about ${currentTakesTopic || 'the topic'}...`,
                `Uncovering hidden truths...`,
                `Drafting 5 unique directions...`
            ]);
        }
        if (takesResultsState) takesResultsState.classList.add('hidden');
        if (takesCustomState) takesCustomState.classList.add('hidden');
        if (takesResultsState) takesResultsState.innerHTML = '';
        
        try {
            const takes = await generateTakesFromGroq(currentTakesTopic, previousTakes);
            
            // Save them so we don't repeat them next time
            previousTakes.push(...takes);
            
            takes.forEach((take, idx) => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left p-4 rounded-xl bg-black/40 border border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all text-white text-[15px] takes-option-btn';
                btn.innerHTML = `<span class="text-primary/50 font-mono-label mr-2 font-bold">0${idx+1}</span> ${take}`;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.takes-option-btn').forEach(b => {
                        b.classList.remove('border-primary', 'bg-primary/10');
                        b.classList.add('border-white/10', 'bg-black/40');
                    });
                    btn.classList.remove('border-white/10', 'bg-black/40');
                    btn.classList.add('border-primary', 'bg-primary/10');
                    currentSelectedTake = take;
                    if (btnConfirmSelection) btnConfirmSelection.disabled = false;
                    setTimeout(() => {
                        advanceToStep2();
                    }, 300);
                });
                if (takesResultsState) takesResultsState.appendChild(btn);
            });

            if (takesLoadingState) {
                takesLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (takesResultsState) takesResultsState.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            if (takesLoadingState) {
                takesLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (takesResultsState) takesResultsState.classList.remove('hidden');
            if (takesResultsState) {
                takesResultsState.innerHTML = `<div class="text-error p-4 bg-error/10 rounded-xl border border-error/20">Error generating takes: ${error.message}</div>`;
            }
        }
    }

    async function runStructuresGeneration() {
        if (structuresLoadingState) {
            structuresLoadingState.classList.remove('hidden');
            startLoadingAnimation('structures-loading-state', [
                `Architecting narrative blueprints for ${currentTakesTopic || 'the topic'}...`,
                `Structuring the storytelling journey...`,
                `Selecting the best content frameworks...`
            ]);
        }
        if (structuresResultsState) structuresResultsState.classList.add('hidden');
        if (structuresResultsState) structuresResultsState.innerHTML = '';
        
        try {
            const structures = await generateStructuresFromGroq(currentTakesTopic, currentSelectedTake, previousStructures);
            previousStructures.push(...structures.map(s => s.name));
            
            structures.forEach((struct, idx) => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left p-4 rounded-xl bg-black/40 border border-white/10 hover:border-secondary/50 hover:bg-white/5 transition-all text-white text-[15px] structures-option-btn';
                
                let flowHTML = struct.flow.map(step => `<span class="text-white/80">${step}</span>`).join('<span class="text-secondary/50 mx-2 font-bold text-[16px]">➔</span>');
                
                btn.innerHTML = `
                    <div class="font-bold text-secondary mb-3 flex items-center gap-2">
                        <span class="text-secondary/50 font-mono-label mr-2">0${idx+1}</span>
                        ${struct.name}
                    </div>
                    <div class="px-2 py-1 leading-relaxed text-sm bg-black/20 rounded-lg">
                        ${flowHTML}
                    </div>
                `;
                
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.structures-option-btn').forEach(b => {
                        b.classList.remove('border-secondary', 'bg-secondary/10');
                        b.classList.add('border-white/10', 'bg-black/40');
                    });
                    btn.classList.remove('border-white/10', 'bg-black/40');
                    btn.classList.add('border-secondary', 'bg-secondary/10');
                    currentSelectedStructure = struct;
                    if (btnConfirmSelection) btnConfirmSelection.disabled = false;
                    setTimeout(() => {
                        advanceToStep3();
                    }, 300);
                });
                if (structuresResultsState) structuresResultsState.appendChild(btn);
            });

            if (structuresLoadingState) {
                structuresLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (structuresResultsState) structuresResultsState.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            if (structuresLoadingState) {
                structuresLoadingState.classList.add('hidden');
                stopLoadingAnimation();
            }
            if (structuresResultsState) structuresResultsState.classList.remove('hidden');
            if (structuresResultsState) {
                structuresResultsState.innerHTML = `<div class="text-error p-4 bg-error/10 rounded-xl border border-error/20">Error generating structures: ${error.message}</div>`;
            }
        }
    }



    const customCtaInputEl = document.getElementById('custom-cta-input');
    if (customCtaInputEl) {
        customCtaInputEl.addEventListener('input', checkStep4Completion);
    }

    if (btnRegenerate) {
        btnRegenerate.addEventListener('click', () => {
            if (generatorStep === 1) runTakesGeneration();
            else if (generatorStep === 2) runStructuresGeneration();
            else if (generatorStep === 3) runHooksGeneration();
            else if (generatorStep === 4) runPersonasGeneration();
            else if (generatorStep === 5) runScriptGeneration();
        });
    }
    
    if (btnWriteCustom) {
        btnWriteCustom.addEventListener('click', () => {
            if (generatorStep === 1) {
                if (!takesResultsState) return;
                
                let customBtn = takesResultsState.querySelector('.takes-custom-option');
                if (!customBtn) {
                    customBtn = document.createElement('div');
                    customBtn.className = 'w-full text-left p-4 rounded-xl bg-black/40 border border-white/10 hover:border-primary/50 hover:bg-white/5 transition-all text-white text-[15px] takes-option-btn takes-custom-option flex items-center cursor-text';
                    customBtn.innerHTML = `
                        <span class="text-primary/50 font-mono-label mr-2 font-bold">06</span> 
                        <input type="text" class="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30" placeholder="Type your custom take here..." />
                    `;
                    const inputField = customBtn.querySelector('input');
                    
                    customBtn.addEventListener('click', () => {
                        document.querySelectorAll('.takes-option-btn').forEach(b => {
                            b.classList.remove('border-primary', 'bg-primary/10');
                            b.classList.add('border-white/10', 'bg-black/40');
                        });
                        customBtn.classList.remove('border-white/10', 'bg-black/40');
                        customBtn.classList.add('border-primary', 'bg-primary/10');
                        inputField.focus();
                        currentSelectedTake = inputField.value.trim();
                        if (btnConfirmSelection) btnConfirmSelection.disabled = currentSelectedTake.length === 0;
                    });

                    inputField.addEventListener('input', (e) => {
                        currentSelectedTake = e.target.value.trim();
                        if (customBtn.classList.contains('border-primary')) {
                            if (btnConfirmSelection) btnConfirmSelection.disabled = currentSelectedTake.length === 0;
                        }
                    });

                    takesResultsState.appendChild(customBtn);
                }
                customBtn.click();
                setTimeout(() => {
                    takesResultsState.scrollTop = takesResultsState.scrollHeight;
                }, 50);
            } else if (generatorStep === 2) {
                // Structures Custom Input
                if (!structuresResultsState) return;
                
                let customBtn = structuresResultsState.querySelector('.structures-custom-option');
                if (!customBtn) {
                    customBtn = document.createElement('div');
                    customBtn.className = 'w-full text-left p-4 rounded-xl bg-black/40 border border-white/10 hover:border-secondary/50 hover:bg-white/5 transition-all text-white text-[15px] structures-option-btn structures-custom-option cursor-text';
                    
                    customBtn.innerHTML = `
                        <div class="flex flex-col gap-3 w-full">
                            <div class="font-bold text-secondary flex items-center gap-2 border-b border-white/10 pb-2">
                                <span class="material-symbols-outlined text-[18px]">edit_note</span>
                                <input type="text" class="bg-transparent border-none outline-none text-white placeholder-white/30 w-full" placeholder="Storytelling Format Name (e.g. Myth Busting)" id="custom-structure-name" />
                            </div>
                            
                            <div class="grid grid-cols-1 gap-2 bg-black/20 rounded-lg p-3">
                                <div class="text-xs text-white/50 uppercase tracking-widest mb-1">Outline the 5 narrative beats</div>
                                <div class="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5 focus-within:border-secondary/50 transition-all">
                                    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold font-mono-label shrink-0">1</div>
                                    <input type="text" class="bg-transparent border-none outline-none text-white/90 text-sm w-full custom-structure-step" placeholder="Beat 1: e.g. Open with..." />
                                </div>
                                <div class="flex items-center justify-center -my-1 text-white/20"><span class="material-symbols-outlined text-[16px]">arrow_downward</span></div>
                                <div class="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5 focus-within:border-secondary/50 transition-all">
                                    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold font-mono-label shrink-0">2</div>
                                    <input type="text" class="bg-transparent border-none outline-none text-white/90 text-sm w-full custom-structure-step" placeholder="Beat 2: e.g. Explain..." />
                                </div>
                                <div class="flex items-center justify-center -my-1 text-white/20"><span class="material-symbols-outlined text-[16px]">arrow_downward</span></div>
                                <div class="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5 focus-within:border-secondary/50 transition-all">
                                    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold font-mono-label shrink-0">3</div>
                                    <input type="text" class="bg-transparent border-none outline-none text-white/90 text-sm w-full custom-structure-step" placeholder="Beat 3: e.g. Show..." />
                                </div>
                                <div class="flex items-center justify-center -my-1 text-white/20"><span class="material-symbols-outlined text-[16px]">arrow_downward</span></div>
                                <div class="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5 focus-within:border-secondary/50 transition-all">
                                    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold font-mono-label shrink-0">4</div>
                                    <input type="text" class="bg-transparent border-none outline-none text-white/90 text-sm w-full custom-structure-step" placeholder="Beat 4: e.g. Connect to..." />
                                </div>
                                <div class="flex items-center justify-center -my-1 text-white/20"><span class="material-symbols-outlined text-[16px]">arrow_downward</span></div>
                                <div class="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5 focus-within:border-secondary/50 transition-all">
                                    <div class="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold font-mono-label shrink-0">5</div>
                                    <input type="text" class="bg-transparent border-none outline-none text-white/90 text-sm w-full custom-structure-step" placeholder="Beat 5: e.g. Conclude with..." />
                                </div>
                            </div>
                        </div>
                    `;
                    
                    const updateCustomStructureSelection = () => {
                        const nameInput = customBtn.querySelector('#custom-structure-name');
                        const steps = Array.from(customBtn.querySelectorAll('.custom-structure-step')).map(inp => inp.value.trim());
                        const hasAllSteps = steps.every(s => s.length > 0) && nameInput.value.trim().length > 0;
                        
                        currentSelectedStructure = {
                            name: nameInput.value.trim(),
                            flow: steps
                        };
                        
                        if (customBtn.classList.contains('border-secondary')) {
                            if (btnConfirmSelection) btnConfirmSelection.disabled = !hasAllSteps;
                        }
                    };

                    customBtn.addEventListener('click', () => {
                        document.querySelectorAll('.structures-option-btn').forEach(b => {
                            b.classList.remove('border-secondary', 'bg-secondary/10');
                            b.classList.add('border-white/10', 'bg-black/40');
                        });
                        customBtn.classList.remove('border-white/10', 'bg-black/40');
                        customBtn.classList.add('border-secondary', 'bg-secondary/10');
                        customBtn.querySelector('#custom-structure-name').focus();
                        updateCustomStructureSelection();
                    });

                    customBtn.querySelectorAll('input').forEach(inp => {
                        inp.addEventListener('input', updateCustomStructureSelection);
                    });

                    structuresResultsState.appendChild(customBtn);
                }
                customBtn.click();
                setTimeout(() => {
                    structuresResultsState.scrollTop = structuresResultsState.scrollHeight;
                }, 50);
            } else if (generatorStep === 3) {
                // Hooks Custom Input
                if (!hooksResultsState) return;
                
                let customBtn = hooksResultsState.querySelector('.hooks-custom-option');
                if (!customBtn) {
                    customBtn = document.createElement('div');
                    customBtn.className = 'w-full text-left p-4 rounded-xl bg-black/40 border border-white/10 hover:border-white/50 hover:bg-white/5 transition-all text-white text-[15px] hooks-option-btn hooks-custom-option cursor-text';
                    
                    customBtn.innerHTML = `
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-white/50 font-mono-label mr-2 font-bold">06</span>
                            <span class="text-[10px] uppercase tracking-widest px-2 py-1 bg-white/10 rounded-md font-bold text-white/80 border border-white/20">Custom Hook</span>
                        </div>
                        <textarea class="w-full bg-transparent border-none outline-none text-white placeholder-white/30 resize-none h-20 mt-2" placeholder="Type your custom hook here..."></textarea>
                    `;
                    
                    const inputField = customBtn.querySelector('textarea');
                    
                    customBtn.addEventListener('click', () => {
                        document.querySelectorAll('.hooks-option-btn').forEach(b => {
                            b.classList.remove('border-white', 'bg-white/10');
                            b.classList.add('border-white/10', 'bg-black/40');
                        });
                        customBtn.classList.remove('border-white/10', 'bg-black/40');
                        customBtn.classList.add('border-white', 'bg-white/10');
                        inputField.focus();
                        currentSelectedHook = { hook: inputField.value.trim(), psychology: "Custom Hook" };
                        if (btnConfirmSelection) btnConfirmSelection.disabled = inputField.value.trim().length === 0;
                    });

                    inputField.addEventListener('input', (e) => {
                        currentSelectedHook = { hook: e.target.value.trim(), psychology: "Custom Hook" };
                        if (customBtn.classList.contains('border-white')) {
                            if (btnConfirmSelection) btnConfirmSelection.disabled = currentSelectedHook.hook.length === 0;
                        }
                    });

                    hooksResultsState.appendChild(customBtn);
                }
                customBtn.click();
                setTimeout(() => {
                    hooksResultsState.scrollTop = hooksResultsState.scrollHeight;
                }, 50);
            }
        });
    }

    if (btnConfirmSelection) {
        btnConfirmSelection.addEventListener('click', () => {
            if (generatorStep === 1 && currentSelectedTake) {
                advanceToStep2();
            } else if (generatorStep === 2 && currentSelectedStructure) {
                advanceToStep3();
            } else if (generatorStep === 3 && currentSelectedHook) {
                advanceToStep4();
            } else if (generatorStep === 4 && currentSelectedPersona) {
                advanceToStep5();
            } else if (generatorStep === 5) {
                closeTakesModalFunc();
            }
        });
    }

    if (btnCopyScript) {
        btnCopyScript.addEventListener('click', async () => {
            const textToCopy = scriptOutputTextarea.innerText || scriptOutputTextarea.textContent;
            if (scriptOutputTextarea && textToCopy) {
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    const icon = btnCopyScript.querySelector('span');
                    const origText = icon.textContent;
                    icon.textContent = 'check';
                    btnCopyScript.classList.add('text-green-400');
                    setTimeout(() => {
                        icon.textContent = origText;
                        btnCopyScript.classList.remove('text-green-400');
                    }, 2000);
                } catch (e) {
                    console.error('Failed to copy', e);
                }
            }
        });
    }

}
