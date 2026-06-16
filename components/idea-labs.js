import { supabase } from '../supabaseClient.js';

export function initIdeaLabs() {
    const urlParams = new URLSearchParams(window.location.search);
    const avatarId = urlParams.get('avatar_id');
    
    if (!avatarId) {
        console.warn('No avatar_id found in URL. Some Idea Labs features may not work.');
        return;
    }

    // Modal Elements
    const btnAddAccount = document.getElementById('btn-add-account');
    const modalAddAccount = document.getElementById('add-account-modal');
    const closeAddAccount = document.getElementById('close-add-account');
    const cancelAddAccount = document.getElementById('cancel-add-account');
    const formAddAccount = document.getElementById('add-account-form');
    
    const btnManageWatchlist = document.getElementById('btn-manage-watchlist');
    const modalManageWatchlist = document.getElementById('manage-watchlist-modal');
    const closeManageWatchlist = document.getElementById('close-manage-watchlist');
    const manageWatchlistContainer = document.getElementById('manage-watchlist-container');

    const modalDeleteConfirm = document.getElementById('delete-confirm-modal');
    const btnCancelDelete = document.getElementById('cancel-delete-account');
    const btnConfirmDelete = document.getElementById('confirm-delete-account');
    const deleteBtnText = document.getElementById('delete-account-text');
    const deleteBtnSpinner = document.getElementById('delete-account-spinner');
    let accountToDeleteId = null;

    // Error Elements
    const errorAddAccountContainer = document.getElementById('add-account-error');
    const errorAddAccountText = document.getElementById('add-account-error-text');
    const errorDeleteAccountContainer = document.getElementById('delete-account-error');
    const errorDeleteAccountText = document.getElementById('delete-account-error-text');

    // DOM Elements
    const counterCreators = document.getElementById('creators-tracked-count');
    const searchInput = document.getElementById('watchlist-search');
    const clearSearchBtn = document.getElementById('clear-watchlist-search');
    const platformFilter = document.getElementById('watchlist-platform-filter');

    // Feed Elements
    const feedBody = document.getElementById('watchlist-feed-body');
    const feedCount = document.getElementById('content-pieces-count');
    
    // Content Details Modal
    const modalContentDetails = document.getElementById('content-details-modal');
    const closeContentDetails1 = document.getElementById('close-content-details-modal');
    const closeContentDetails2 = document.getElementById('btn-close-content-details');
    const detailFormat = document.getElementById('detail-format');
    const detailTake = document.getElementById('detail-take');
    const detailHook = document.getElementById('detail-hook');
    const detailCta = document.getElementById('detail-cta');
    const btnViewTranscript = document.getElementById('btn-view-transcript');
    
    // Transcript Modal
    const modalTranscript = document.getElementById('transcript-modal');
    const closeTranscript1 = document.getElementById('close-transcript-modal');
    const closeTranscript2 = document.getElementById('btn-close-transcript');
    const detailTranscript = document.getElementById('detail-transcript');

    // Iframe Modal
    const modalIframe = document.getElementById('iframe-modal');
    const closeIframe1 = document.getElementById('close-iframe-modal');
    const closeIframe2 = document.getElementById('btn-close-iframe');
    const iframeContainer = document.getElementById('iframe-container');
    const iframeExternalLink = document.getElementById('iframe-external-link');

    // Helper: Show/Hide Modals
    const showModal = (modal) => {
        if (modal === modalAddAccount && errorAddAccountContainer) errorAddAccountContainer.classList.add('hidden');
        if (modal === modalDeleteConfirm && errorDeleteAccountContainer) errorDeleteAccountContainer.classList.add('hidden');
        
        modal.classList.remove('hidden');
        // Trigger reflow for transition
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modal.querySelector('.glass-panel').classList.remove('scale-95');
    };

    const hideModal = (modal) => {
        modal.classList.add('opacity-0');
        modal.querySelector('.glass-panel').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    // --- Modal Event Listeners ---
    if (btnAddAccount) btnAddAccount.addEventListener('click', () => showModal(modalAddAccount));
    if (closeAddAccount) closeAddAccount.addEventListener('click', () => hideModal(modalAddAccount));
    if (cancelAddAccount) cancelAddAccount.addEventListener('click', () => hideModal(modalAddAccount));

    if (btnManageWatchlist) btnManageWatchlist.addEventListener('click', () => {
        showModal(modalManageWatchlist);
        loadManageWatchlist();
    });
    if (closeManageWatchlist) closeManageWatchlist.addEventListener('click', () => hideModal(modalManageWatchlist));

    if (closeContentDetails1) closeContentDetails1.addEventListener('click', () => hideModal(modalContentDetails));
    if (closeContentDetails2) closeContentDetails2.addEventListener('click', () => hideModal(modalContentDetails));
    
    if (closeTranscript1) closeTranscript1.addEventListener('click', () => hideModal(modalTranscript));
    if (closeTranscript2) closeTranscript2.addEventListener('click', () => hideModal(modalTranscript));

    const hideIframeModal = () => {
        hideModal(modalIframe);
        // Clear iframe source so video stops playing in background
        setTimeout(() => {
            if (iframeContainer) iframeContainer.innerHTML = '<span class="material-symbols-outlined animate-spin text-white/50 text-[32px] absolute">autorenew</span>';
        }, 300);
    };

    if (closeIframe1) closeIframe1.addEventListener('click', hideIframeModal);
    if (closeIframe2) closeIframe2.addEventListener('click', hideIframeModal);

    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', () => {
            hideModal(modalDeleteConfirm);
            accountToDeleteId = null;
        });
    }

    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            if (!accountToDeleteId) return;
            
            if (errorDeleteAccountContainer) errorDeleteAccountContainer.classList.add('hidden');
            
            deleteBtnText.textContent = "Removing...";
            deleteBtnSpinner.classList.remove('hidden');
            
            try {
                const { error } = await supabase
                    .from('watchlists')
                    .delete()
                    .eq('competitor_id', accountToDeleteId);

                if (error) throw error;
                
                // Reload list and stats
                loadManageWatchlist();
                fetchWatchlistStats();
                
                hideModal(modalDeleteConfirm);
                accountToDeleteId = null;
            } catch (error) {
                console.error('Error deleting account:', error);
                if (errorDeleteAccountContainer) {
                    errorDeleteAccountText.textContent = "Failed to remove: " + error.message;
                    errorDeleteAccountContainer.classList.remove('hidden');
                }
            } finally {
                deleteBtnText.textContent = "Remove";
                deleteBtnSpinner.classList.add('hidden');
            }
        });
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modalAddAccount) hideModal(modalAddAccount);
        if (e.target === modalManageWatchlist) hideModal(modalManageWatchlist);
        if (e.target === modalDeleteConfirm) {
            hideModal(modalDeleteConfirm);
            accountToDeleteId = null;
        }
        if (e.target === modalContentDetails) hideModal(modalContentDetails);
        if (e.target === modalTranscript) hideModal(modalTranscript);
        if (e.target === modalIframe) hideIframeModal();
    });

    // Search and Platform Filters
    const applyFilters = () => {
        const term = (searchInput ? searchInput.value.toLowerCase() : '');
        const platform = (platformFilter ? platformFilter.value : 'All');
        
        if (clearSearchBtn) {
            if (term) clearSearchBtn.classList.remove('hidden');
            else clearSearchBtn.classList.add('hidden');
        }

        const items = document.querySelectorAll('.watchlist-item');
        
        items.forEach(el => {
            const name = (el.getAttribute('data-name') || '').trim();
            const itemPlatform = el.getAttribute('data-platform');
            
            const termTrimmed = term.trim();
            const matchesSearch = !termTrimmed || name.startsWith(termTrimmed) || name.includes(' ' + termTrimmed);
            const matchesPlatform = platform === 'All' || itemPlatform === platform;
            
            if (matchesSearch && matchesPlatform) {
                el.style.display = 'flex';
            } else {
                el.style.display = 'none';
            }
        });
    };

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            applyFilters();
            searchInput.focus();
        });
    }
    if (platformFilter) platformFilter.addEventListener('change', applyFilters);

    // --- Data Fetching & Logic ---

    // Fetch Stats
    async function fetchWatchlistStats() {
        try {
            const { count, error } = await supabase
                .from('watchlists')
                .select('*', { count: 'exact', head: true })
                .eq('owner_avatar_id', avatarId);

            if (error) throw error;
            if (counterCreators) {
                counterCreators.textContent = count || '0';
            }
        } catch (error) {
            console.error('Error fetching watchlist stats:', error);
            if (counterCreators) counterCreators.textContent = '-';
        }
    }

    // Add Account Logic
    if (formAddAccount) {
        formAddAccount.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorAddAccountContainer) errorAddAccountContainer.classList.add('hidden');
            
            const name = document.getElementById('account-name').value;
            const platform = document.getElementById('account-platform').value;
            let link = document.getElementById('account-link').value.trim();
            
            // Automatically prepend https:// if the user omitted it
            if (link && !/^https?:\/\//i.test(link)) {
                link = 'https://' + link;
            }
            
            // Validate Platform and Link mismatch
            const linkLower = link.toLowerCase();
            let isValid = false;
            
            if (platform === 'YouTube' && (linkLower.includes('youtube.com') || linkLower.includes('youtu.be'))) isValid = true;
            else if (platform === 'Instagram' && linkLower.includes('instagram.com')) isValid = true;
            else if (platform === 'TikTok' && linkLower.includes('tiktok.com')) isValid = true;
            else if (platform === 'Twitter' && (linkLower.includes('twitter.com') || linkLower.includes('x.com'))) isValid = true;
            else if (platform === 'LinkedIn' && linkLower.includes('linkedin.com')) isValid = true;
            else if (platform === 'Facebook' && (linkLower.includes('facebook.com') || linkLower.includes('fb.com'))) isValid = true;

            if (!isValid) {
                if (errorAddAccountContainer) {
                    errorAddAccountText.textContent = `The link provided does not look like a valid ${platform} URL. Please check it.`;
                    errorAddAccountContainer.classList.remove('hidden');
                }
                return;
            }
            
            const submitBtnText = document.getElementById('add-account-text');
            const submitBtnSpinner = document.getElementById('add-account-spinner');
            
            submitBtnText.textContent = "Adding...";
            submitBtnSpinner.classList.remove('hidden');

            try {
                // Fetch existing links for comparison to prevent formatting-based duplicates
                const { data: existing, error: fetchErr } = await supabase
                    .from('watchlists')
                    .select('competitor_link')
                    .eq('owner_avatar_id', avatarId);
                
                if (fetchErr) throw fetchErr;
                
                const normalizeLinkForCompare = (l) => {
                    if (!l) return '';
                    return l.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').trim();
                };

                const cleanNewLink = normalizeLinkForCompare(link);
                const isDuplicate = existing && existing.some(item => normalizeLinkForCompare(item.competitor_link) === cleanNewLink);
                
                if (isDuplicate) {
                    if (errorAddAccountContainer) {
                        errorAddAccountText.textContent = "This profile link is already present in your watchlist.";
                        errorAddAccountContainer.classList.remove('hidden');
                    }
                    submitBtnText.textContent = "Add Account";
                    submitBtnSpinner.classList.add('hidden');
                    return;
                }

                // Fetch current user from session
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                const { error } = await supabase.from('watchlists').insert([{
                    owner_avatar_id: avatarId,
                    owner_user_id: userId || null,
                    competitor_name: name,
                    competitor_platform: platform,
                    competitor_link: link
                }]);

                if (error) throw error;
                
                // Success
                formAddAccount.reset();
                hideModal(modalAddAccount);
                fetchWatchlistStats(); // Update counter
                
                // Refresh manage watchlist if it's open
                if (!modalManageWatchlist.classList.contains('hidden')) {
                    loadManageWatchlist();
                }

            } catch (error) {
                console.error("Error adding account:", error);
                if (errorAddAccountContainer) {
                    errorAddAccountText.textContent = "Failed to add account: " + error.message;
                    errorAddAccountContainer.classList.remove('hidden');
                }
            } finally {
                submitBtnText.textContent = "Add Account";
                submitBtnSpinner.classList.add('hidden');
            }
        });
    }

    // Load Manage Watchlist
    async function loadManageWatchlist() {
        if (!manageWatchlistContainer) return;
        
        manageWatchlistContainer.innerHTML = `
            <div class="flex items-center justify-center h-full text-on-surface-variant">
                <span class="material-symbols-outlined animate-spin mr-2">autorenew</span> Loading creators...
            </div>`;

        try {
            const { data, error } = await supabase
                .from('watchlists')
                .select('*')
                .eq('owner_avatar_id', avatarId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                manageWatchlistContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full text-center text-on-surface-variant opacity-70 mt-10">
                        <span class="material-symbols-outlined text-[48px] mb-2 opacity-50">person_off</span>
                        <p>No creators added yet.</p>
                        <p class="text-sm mt-1">Click "Add Account" to start tracking.</p>
                    </div>`;
                return;
            }

            let html = '<div class="space-y-3">';
            data.forEach(item => {
                let iconHtml = '<span class="material-symbols-outlined text-[20px]">public</span>';
                let platformColor = 'text-white';
                
                if (item.competitor_platform === 'YouTube') { 
                    iconHtml = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
                    platformColor = 'text-[#FF0000]'; 
                } else if (item.competitor_platform === 'Instagram') { 
                    iconHtml = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>';
                    platformColor = 'text-[#E1306C]'; 
                } else if (item.competitor_platform === 'Twitter') { 
                    iconHtml = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';
                    platformColor = 'text-[#E7E9EA]'; 
                } else if (item.competitor_platform === 'TikTok') { 
                    iconHtml = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>';
                    platformColor = 'text-[#00f2fe]'; 
                } else if (item.competitor_platform === 'LinkedIn') { 
                    iconHtml = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
                    platformColor = 'text-[#0077b5]'; 
                } else if (item.competitor_platform === 'Facebook') { 
                    iconHtml = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
                    platformColor = 'text-[#1877F2]'; 
                }

                html += `
                    <div class="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group watchlist-item" data-name="${(item.competitor_name || '').toLowerCase()}" data-platform="${item.competitor_platform}">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center ${platformColor} shadow-inner">
                                ${iconHtml}
                            </div>
                            <div>
                                <h4 class="font-semibold text-white text-sm">${item.competitor_name}</h4>
                                <a href="#" onclick="window.open('${item.competitor_link}', 'socialPopup', 'width=800,height=600,scrollbars=yes,resizable=yes'); return false;" class="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 mt-0.5">
                                    ${item.competitor_platform} <span class="material-symbols-outlined text-[12px]">open_in_new</span>
                                </a>
                            </div>
                        </div>
                        <button class="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-on-surface-variant hover:bg-error/20 hover:text-error hover:border-error/50 transition-all flex items-center justify-center btn-delete-account shadow-sm" data-id="${item.competitor_id}" title="Stop Tracking">
                            <span class="material-symbols-outlined text-[16px] pointer-events-none">delete</span>
                        </button>
                    </div>
                `;
            });
            html += '</div>';
            
            manageWatchlistContainer.innerHTML = html;
            
            // Reset filters if they exist
            if (searchInput) searchInput.value = '';
            if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
            if (platformFilter) platformFilter.value = 'All';

            // Attach delete listeners
            const deleteButtons = manageWatchlistContainer.querySelectorAll('.btn-delete-account');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    accountToDeleteId = e.target.closest('button').dataset.id;
                    showModal(modalDeleteConfirm);
                });
            });

        } catch (error) {
            console.error('Error loading watchlist:', error);
            manageWatchlistContainer.innerHTML = `
                <div class="text-error text-center p-4 bg-error/10 rounded-lg border border-error/20 mt-4">
                    Failed to load creators: ${error.message}
                </div>`;
        }
    }

    // Format large numbers (e.g. 1.2M, 85k)
    const formatNumber = (num) => {
        if (!num) return '0';
        const n = parseInt(num, 10);
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return n.toString();
    };

    let currentSort = { field: 'created_at', ascending: false };

    let allFeedIdeas = [];

    function getPlatformName(url) {
        if (!url) return 'Other';
        url = url.toLowerCase();
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
        if (url.includes('tiktok.com')) return 'TikTok';
        if (url.includes('instagram.com')) return 'Instagram';
        if (url.includes('linkedin.com')) return 'LinkedIn';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'X (Twitter)';
        return 'Other';
    }

    function updateFilterDropdowns() {
        const platformSelect = document.getElementById('filter-platform');
        const creatorSelect = document.getElementById('filter-creator');
        
        if (!platformSelect || !creatorSelect) return;

        const currentPlatform = platformSelect.value;
        const currentCreator = creatorSelect.value;

        const uniquePlatforms = [...new Set(allFeedIdeas.map(d => d._extracted_platform))].sort();
        const uniqueCreators = [...new Set(allFeedIdeas.map(d => d._extracted_creator))].sort();

        platformSelect.innerHTML = '<option value="all">Filter by Platform</option>' + 
            uniquePlatforms.map(p => `<option value="${p}">${p}</option>`).join('');
            
        creatorSelect.innerHTML = '<option value="all">Filter by Creator</option>' + 
            uniqueCreators.map(c => `<option value="${c}">${c}</option>`).join('');

        if (uniquePlatforms.includes(currentPlatform)) platformSelect.value = currentPlatform;
        if (uniqueCreators.includes(currentCreator)) creatorSelect.value = currentCreator;
    }

    const platformSelectElement = document.getElementById('filter-platform');
    const creatorSelectElement = document.getElementById('filter-creator');
    if (platformSelectElement) platformSelectElement.addEventListener('change', renderFeed);
    if (creatorSelectElement) creatorSelectElement.addEventListener('change', renderFeed);

    // Load Feed
    async function loadWatchlistFeed() {
        if (!feedBody) return;
        
        feedBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-on-surface-variant"><span class="material-symbols-outlined animate-spin mr-2 align-middle">autorenew</span> Loading feed...</td></tr>`;
        
        try {
            // Get current user ID
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
                .eq('saved_to_idea_vault', 'no')
                .order(currentSort.field, { ascending: currentSort.ascending });

            if (error) throw error;
            
            allFeedIdeas = data.map(item => ({
                ...item,
                _extracted_platform: getPlatformName(item.content_link),
                _extracted_creator: item.watchlists?.competitor_name || 'Unknown'
            }));

            updateFilterDropdowns();
            renderFeed();

        } catch (error) {
            console.error("Error loading feed:", error);
            feedBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-[#ffb4ab]">Failed to load feed. Please try again.</td></tr>`;
        }
    }

    function renderFeed() {
        if (!feedBody) return;

        const platformSelect = document.getElementById('filter-platform');
        const creatorSelect = document.getElementById('filter-creator');
        
        const platformFilter = platformSelect ? platformSelect.value : 'all';
        const creatorFilter = creatorSelect ? creatorSelect.value : 'all';

        let filteredData = allFeedIdeas.filter(item => {
            const matchPlatform = platformFilter === 'all' || item._extracted_platform === platformFilter;
            const matchCreator = creatorFilter === 'all' || item._extracted_creator === creatorFilter;
            return matchPlatform && matchCreator;
        });

        if (feedCount) feedCount.textContent = filteredData.length.toString();

        if (!filteredData || filteredData.length === 0) {
            feedBody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-on-surface-variant">Your watchlist feed is currently empty. Add more creators to your watchlist to build your personalized content inspiration feed.</td></tr>`;
            return;
        }

        let html = '';
        filteredData.forEach((item, index) => {
                const impressions = formatNumber(item.content_impressions);
                const engagement = formatNumber(item.content_engagement);
                
                const virality = item.content_virality_score || 0;
                const viralityWidth = Math.min(virality, 100);
                
                const engScore = item.content_engagement_score || 0;
                const engScoreWidth = Math.min(engScore, 100);

                html += `
                    <tr class="watchlist-feed-row hover:bg-white/10 transition-colors group cursor-pointer backdrop-blur-sm" data-id="${item.content_id}">
                        <td class="px-6 py-5 font-mono-label text-mono-label text-outline text-center">${(index + 1).toString().padStart(2, '0')}</td>
                        <td class="px-6 py-5 font-medium text-white max-w-[300px] truncate text-[15px] drop-shadow-sm">${item.content_topic || 'Unknown Topic'}</td>
                        <td class="px-6 py-5 text-center font-mono-label text-mono-label text-primary font-bold">${impressions}</td>
                        <td class="px-6 py-5 text-center font-mono-label text-mono-label text-secondary font-bold">${engagement}</td>
                        <td class="px-6 py-5">
                            <div class="flex items-center justify-center gap-3">
                                <div class="w-20 h-2 bg-black/40 rounded-full overflow-hidden shadow-inner border border-white/5">
                                    <div class="h-full bg-gradient-to-r from-tertiary-container to-tertiary w-[${viralityWidth}%] shadow-[0_0_12px_rgba(255,178,183,1)] ${virality > 100 ? 'animate-pulse' : ''}"></div>
                                </div>
                                <span class="font-mono-label text-mono-label text-tertiary font-bold">${virality}%</span>
                            </div>
                        </td>
                        <td class="px-6 py-5">
                            <div class="flex items-center justify-center gap-3">
                                <div class="w-20 h-2 bg-black/40 rounded-full overflow-hidden shadow-inner border border-white/5">
                                    <div class="h-full bg-gradient-to-r from-secondary-container to-secondary w-[${engScoreWidth}%] shadow-[0_0_8px_rgba(76,215,246,0.5)]"></div>
                                </div>
                                <span class="font-mono-label text-mono-label text-secondary font-bold">${engScore}%</span>
                            </div>
                        </td>
                        <td class="px-6 py-5" onclick="event.stopPropagation()">
                            <div class="flex items-center justify-center gap-2">
                                <button class="btn-view-link px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/20 hover:text-secondary transition-all flex items-center gap-1 shadow-sm" data-link="${item.content_link}" title="View on Platform">
                                    <span class="material-symbols-outlined text-[16px] pointer-events-none">open_in_new</span>
                                    <span class="text-xs font-medium pointer-events-none">View</span>
                                </button>
                                <button class="btn-save-vault px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/20 hover:text-primary transition-all flex items-center gap-1 shadow-sm" data-id="${item.content_id}" title="Save to Idea Vault">
                                    <span class="material-symbols-outlined text-[16px] pointer-events-none">bookmark_add</span>
                                    <span class="text-xs font-medium pointer-events-none">Save</span>
                                </button>
                                <button class="btn-delete-feed w-7 h-7 rounded-full bg-white/5 border border-white/10 text-white hover:bg-error/20 hover:text-error hover:border-error/50 transition-all flex items-center justify-center shadow-sm" data-id="${item.content_id}" title="Remove from Feed">
                                    <span class="material-symbols-outlined text-[16px] pointer-events-none">delete</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr class="dropdown-metadata" id="metadata-${item.content_id}">
                        <td colspan="7" class="p-0 border-0">
                            <div class="grid grid-rows-[0fr] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] opacity-0" id="metadata-wrapper-${item.content_id}">
                                <div class="overflow-hidden">
                                    <div class="px-6 py-6 bg-black/40 border-b border-white/5">
                                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div class="bg-white/5 rounded-xl p-4 border border-white/10 shadow-inner hover:bg-white/10 transition-colors duration-300">
                                                <h4 class="text-label-caps text-secondary font-bold mb-2 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">view_agenda</span> Format</h4>
                                                <p class="text-body-sm text-white/80 leading-relaxed">${item.content_format || 'N/A'}</p>
                                            </div>
                                            <div class="bg-white/5 rounded-xl p-4 border border-white/10 shadow-inner hover:bg-white/10 transition-colors duration-300">
                                                <h4 class="text-label-caps text-secondary font-bold mb-2 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">psychology</span> The Take</h4>
                                                <p class="text-body-sm text-white/80 leading-relaxed">${item.content_take || 'N/A'}</p>
                                            </div>
                                            <div class="bg-white/5 rounded-xl p-4 border border-white/10 shadow-inner hover:bg-white/10 transition-colors duration-300">
                                                <h4 class="text-label-caps text-secondary font-bold mb-2 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">phishing</span> Hook</h4>
                                                <p class="text-body-sm text-white/80 leading-relaxed">${item.content_hook || 'N/A'}</p>
                                            </div>
                                            <div class="bg-white/5 rounded-xl p-4 border border-white/10 shadow-inner hover:bg-white/10 transition-colors duration-300">
                                                <h4 class="text-label-caps text-secondary font-bold mb-2 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">ads_click</span> CTA</h4>
                                                <p class="text-body-sm text-white/80 leading-relaxed">${item.content_cta || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div class="mt-4 flex justify-end">
                                            <button type="button" class="btn-view-transcript px-5 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5" data-id="${item.content_id}">
                                                <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                                                View Script
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            });
            feedBody.innerHTML = html;

            // Attach event listeners for feed interactions
            const rows = feedBody.querySelectorAll('.watchlist-feed-row');
            rows.forEach((row) => {
                row.addEventListener('click', () => {
                    const id = row.dataset.id;
                    const wrapper = document.getElementById(`metadata-wrapper-${id}`);
                    if (wrapper) {
                        const isExpanded = wrapper.classList.contains('grid-rows-[1fr]');
                        if (isExpanded) {
                            wrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
                            wrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
                            row.classList.remove('bg-white/10');
                        } else {
                            wrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
                            wrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
                            row.classList.add('bg-white/10');
                        }
                    }
                });
            });

            // Attach transcript click
            feedBody.querySelectorAll('.btn-view-transcript').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const itemData = data.find(d => d.content_id === id);
                    if (itemData) {
                        detailTranscript.textContent = itemData.content_transcript || 'No transcript available.';
                        showModal(modalTranscript);
                    }
                });
            });

    // Convert regular URLs to embeddable iframe URLs
    const getEmbedUrl = (url) => {
        if (!url) return '';
        const urlStr = url.toLowerCase();
        
        if (urlStr.includes('youtube.com') || urlStr.includes('youtu.be')) {
            let videoId = '';
            if (urlStr.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0];
            } else if (urlStr.includes('watch?v=')) {
                videoId = url.split('watch?v=')[1]?.split('&')[0];
            } else if (urlStr.includes('/shorts/')) {
                videoId = url.split('/shorts/')[1]?.split('?')[0];
            }
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }
        
        if (urlStr.includes('tiktok.com')) {
            const videoId = url.split('/video/')[1]?.split('?')[0];
            if (videoId) return `https://www.tiktok.com/embed/v2/${videoId}`;
        }
        
        if (urlStr.includes('instagram.com/p/') || urlStr.includes('instagram.com/reel/')) {
            const path = url.split('instagram.com')[1]?.split('?')[0];
            if (path) return `https://www.instagram.com${path}embed/`;
        }
        
        if (urlStr.includes('linkedin.com')) {
            // LinkedIn post IDs are 19 digits long
            const match = urlStr.match(/\d{19}/);
            if (match) {
                return `https://www.linkedin.com/embed/feed/update/urn:li:share:${match[0]}`;
            }
        }
        
        return url;
    };

            // Action Buttons
            feedBody.querySelectorAll('.btn-view-link').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const link = e.target.closest('button').dataset.link;
                    if (link && link !== 'null') {
                        const embedUrl = getEmbedUrl(link);
                        
                        // Set up modal
                        if (iframeExternalLink) iframeExternalLink.href = link;
                        
                        if (iframeContainer) {
                            iframeContainer.innerHTML = `
                                <iframe src="${embedUrl}" 
                                        class="w-full h-full border-0 absolute inset-0 z-10 bg-black" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen>
                                </iframe>
                                <span class="material-symbols-outlined animate-spin text-white/50 text-[32px] absolute z-0">autorenew</span>
                            `;
                        }
                        
                        showModal(modalIframe);
                    }
                });
            });

            feedBody.querySelectorAll('.btn-save-vault').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const btnEl = e.target.closest('button');
                    const originalHTML = btnEl.innerHTML;
                    btnEl.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">autorenew</span>';
                    
                    const id = btnEl.dataset.id;
                    const { error: saveErr } = await supabase
                        .from('watchlist_results')
                        .update({ saved_to_idea_vault: 'yes' })
                        .eq('content_id', id);
                        
                    if (saveErr) {
                        console.error("Error saving:", saveErr);
                        btnEl.innerHTML = originalHTML;
                    } else {
                        loadWatchlistFeed();
                    }
                });
            });

            feedBody.querySelectorAll('.btn-delete-feed').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const btnEl = e.target.closest('button');
                    btnEl.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">autorenew</span>';
                    
                    const id = btnEl.dataset.id;
                    const { error: delErr } = await supabase
                        .from('watchlist_results')
                        .delete()
                        .eq('content_id', id);
                        
                    if (delErr) {
                        console.error("Error deleting:", delErr);
                        btnEl.innerHTML = '<span class="material-symbols-outlined text-[16px] pointer-events-none">delete</span>';
                    } else {
                        loadWatchlistFeed();
                    }
                });
            });

    }

    // Setup Sort Headers
    const sortHeaders = document.querySelectorAll('.sort-header');
    sortHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            if (currentSort.field === field) {
                // Toggle direction
                currentSort.ascending = !currentSort.ascending;
            } else {
                // New field, default descending (highest first)
                currentSort.field = field;
                currentSort.ascending = false;
            }
            
            // Update icons
            sortHeaders.forEach(h => {
                const icon = h.querySelector('.sort-icon');
                if (h === header) {
                    icon.textContent = currentSort.ascending ? 'arrow_drop_up' : 'arrow_drop_down';
                    icon.classList.remove('opacity-50');
                    icon.classList.add('opacity-100');
                    h.classList.add('text-white');
                } else {
                    icon.textContent = 'unfold_more';
                    icon.classList.add('opacity-50');
                    icon.classList.remove('opacity-100');
                    h.classList.remove('text-white');
                }
            });
            
            loadWatchlistFeed();
        });
    });

    // Initialize
    fetchWatchlistStats();
    loadWatchlistFeed();
}
