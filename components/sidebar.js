import { supabase } from '../supabaseClient.js';
import { showCustomAlert, showCustomConfirm } from './notifications.js';
import { escapeHtml } from '../utils/escape-html.js';

export async function loadSidebar(containerId = 'sidebar-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Fetch and inject the HTML
    try {
        const response = await fetch('/components/sidebar.html?v=3');
        if (!response.ok) throw new Error('Failed to load sidebar HTML');
        const html = await response.text();
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading sidebar:', error);
        return;
    }

    // 2. Fetch the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        console.error('User not logged in for sidebar');
        return;
    }

    // 3. Fetch all avatars for the user
    try {
        const { data: allAvatars, error: avatarsError } = await supabase
            .from('avatar_details')
            .select('avatar_id, name, base_look, approver_user_id')
            .eq('owner_user_id', session.user.id);
            
        if (avatarsError) throw avatarsError;

        // Populate dropdown
        const dropdownList = document.getElementById('avatar-dropdown-list');
        if (dropdownList && allAvatars && allAvatars.length > 0) {
            allAvatars.forEach(avatar => {
                const avatarItem = document.createElement('a');
                avatarItem.className = 'w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer';
                avatarItem.innerHTML = `
                    <div class="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 bg-surface border border-white/10">
                        <img class="w-full h-full object-cover" src="${escapeHtml(avatar.base_look || 'https://via.placeholder.com/24')}" alt="Avatar">
                    </div>
                    <span class="text-sm text-on-surface truncate">${escapeHtml(avatar.name || 'Unnamed Avatar')}</span>
                `;
                avatarItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.setItem('activeAvatarId', avatar.avatar_id);
                    // Redirect to dashboard or just reload
                    window.location.href = '/dashboard';
                });
                dropdownList.appendChild(avatarItem);
            });
        }

        // 4. Update the currently selected avatar in the top switcher
        const currentAvatarId = localStorage.getItem('activeAvatarId');
        
        if (currentAvatarId) {
            const currentAvatar = allAvatars.find(a => a.avatar_id === currentAvatarId);
            if (currentAvatar) {
                const imgEl = document.getElementById('sidebar-avatar-img');
                const nameEl = document.getElementById('sidebar-avatar-name');
                if (imgEl) imgEl.src = currentAvatar.base_look || 'https://via.placeholder.com/40';
                if (nameEl) nameEl.textContent = currentAvatar.name || 'Unnamed Avatar';
            } else {
                const nameEl = document.getElementById('sidebar-avatar-name');
                if (nameEl) nameEl.textContent = 'Avatar Not Found';
            }
        } else {
            const nameEl = document.getElementById('sidebar-avatar-name');
            if (nameEl) nameEl.textContent = 'No Avatar Selected';
        }

    } catch (err) {
        console.error('Error fetching avatars for sidebar:', err);
    }

    // 5. Setup Sidebar Toggle Logic
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('app-sidebar');
            const mainContent = document.getElementById('main-content');
            const toggleIcon = document.getElementById('sidebar-toggle-icon');
            const btnNewVideo = document.getElementById('btn-new-video');
            
            if (sidebar.classList.contains('sidebar-collapsed')) {
                // Expand
                sidebar.classList.remove('sidebar-collapsed');
                if (mainContent) {
                    mainContent.classList.remove('ml-[80px]');
                    mainContent.classList.add('ml-[240px]');
                }
                toggleIcon.textContent = 'chevron_left';
            } else {
                // Collapse
                sidebar.classList.add('sidebar-collapsed');
                if (mainContent) {
                    mainContent.classList.remove('ml-[240px]');
                    mainContent.classList.add('ml-[80px]');
                }
                toggleIcon.textContent = 'chevron_right';
            }
        });
    }

    // 6. Setup Sidebar Link Active State Logic
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Remove active from all
            sidebarLinks.forEach(l => l.classList.remove('active'));
            // Add to clicked
            e.currentTarget.classList.add('active');
        });
    });

    // 7. Workspace & Avatar Popout Logic
    const workspaceNav = document.getElementById('workspace-nav-item');
    const workspaceSubmenu = document.getElementById('workspace-submenu');
    const avatarBtn = document.querySelector('.avatar-button');
    const avatarDropdown = document.getElementById('avatar-dropdown');
    
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('app-sidebar');
        
        // Handle workspace popout (only in collapsed mode)
        if (workspaceNav && workspaceSubmenu && sidebar && sidebar.classList.contains('sidebar-collapsed')) {
            if (workspaceNav.contains(e.target)) {
                workspaceSubmenu.classList.toggle('force-flex');
            } else {
                workspaceSubmenu.classList.remove('force-flex');
            }
        }
        
        // Handle avatar dropdown (in both modes)
        if (avatarBtn && avatarDropdown) {
            if (avatarBtn.contains(e.target)) {
                // The onclick attribute handles the initial toggle, but we can manage it here if we want.
                // Since onclick is still there, we don't need to toggle here to avoid double-firing,
                // but we DO need to ensure it doesn't immediately close.
            } else if (!avatarDropdown.contains(e.target)) {
                // Clicked outside both the button and the dropdown
                avatarDropdown.classList.add('hidden');
            }
        }
    });

    // 7.5 Create New Video Modal Logic
    const btnNewVideo = document.getElementById('btn-new-video');
    const createVideoModal = document.getElementById('create-video-modal');
    const closeCreateVideoBtn = document.getElementById('close-create-video');
    const createVideoModalContent = document.getElementById('create-video-modal-content');

    if (btnNewVideo && createVideoModal) {
        const openCreateVideoModal = () => {
            createVideoModal.classList.remove('hidden');
            createVideoModal.classList.add('flex');
            // Trigger animation
            void createVideoModal.offsetWidth;
            createVideoModal.classList.remove('opacity-0');
            createVideoModalContent?.classList.remove('scale-95');
        };

        const closeCreateVideoModal = () => {
            createVideoModal.classList.add('opacity-0');
            createVideoModalContent?.classList.add('scale-95');
            setTimeout(() => {
                createVideoModal.classList.add('hidden');
                createVideoModal.classList.remove('flex');
            }, 300);
        };

        btnNewVideo.addEventListener('click', openCreateVideoModal);
        
        if (closeCreateVideoBtn) {
            closeCreateVideoBtn.addEventListener('click', closeCreateVideoModal);
        }

        // Close on backdrop click
        createVideoModal.addEventListener('click', (e) => {
            if (e.target === createVideoModal) {
                closeCreateVideoModal();
            }
        });

        // 7.6 Create Video Option Routing
        const btnCreateFromText = document.getElementById('btn-create-from-text');
        const btnCreateFromVoice = document.getElementById('btn-create-from-voice');
        
        if (btnCreateFromText) {
            btnCreateFromText.addEventListener('click', () => {
                window.location.href = '/script-room?action=start_scratch';
            });
        }
        
        if (btnCreateFromVoice) {
            btnCreateFromVoice.addEventListener('click', () => {
                window.location.href = '/avatar-studio?action=upload_voiceover';
            });
        }
    }

    // 8. Programmatically update link URLs to use new routing: /tool-name/[content_id]
    // Since we don't always have a content_id, we will link to /tool-name to open the tool generically.
    const currentAvatarId = localStorage.getItem('activeAvatarId');
    
    const homeNav = document.getElementById('nav-home');
    const dashboardNav = document.getElementById('nav-dashboard');
    const workspaceLink = document.getElementById('nav-workspace');
    const completedVideosNav = document.getElementById('nav-completed-videos');
    const editQueueNav = document.getElementById('nav-edit-queue');
    const editSuiteNav = document.getElementById('nav-edit-suite');
    const ideaLabsNav = document.getElementById('nav-idea-labs');
    const scriptRoomNav = document.getElementById('nav-script-room');
    const runpodQueueNav = document.getElementById('nav-runpod-queue');
    const avatarStudioNav = document.getElementById('nav-avatar-studio');

    if (homeNav) homeNav.setAttribute('href', `/dashboard`);
    if (dashboardNav) dashboardNav.setAttribute('href', `/dashboard`);
    
    // Note: To navigate to a specific content item, the code inside the tools (like idea-labs)
    // will need to push to /idea-labs/content_id or /edit-queue/content_id.
    // The sidebar just links to the generic tool endpoint.
    if (workspaceLink) workspaceLink.setAttribute('href', `/workspace`);
    if (completedVideosNav) completedVideosNav.setAttribute('href', `/completed-videos`);
    if (editQueueNav) editQueueNav.setAttribute('href', `/edit-queue`);
    if (editSuiteNav) editSuiteNav.setAttribute('href', `/edit-suite`);
    if (ideaLabsNav) ideaLabsNav.setAttribute('href', `/idea-labs`);
    if (scriptRoomNav) scriptRoomNav.setAttribute('href', `/script-room`);
    if (runpodQueueNav) runpodQueueNav.setAttribute('href', `/production-queue`);
    if (avatarStudioNav) avatarStudioNav.setAttribute('href', `/avatar-studio`);

    // 9. Profile Settings Logic
    const profileSettingsNav = document.getElementById('nav-profile-settings');
    const psModal = document.getElementById('profile-settings-modal');
    const btnClosePsModal = document.getElementById('btn-close-ps-modal');
    const psModalBackdrop = document.getElementById('ps-modal-backdrop');
    
    if (profileSettingsNav && psModal) {
        profileSettingsNav.addEventListener('click', async (e) => {
            e.preventDefault();
            psModal.classList.remove('hidden');
            
            // Load current reviewer
            if (currentAvatarId) {
                const { data } = await supabase.from('avatar_details').select('approver_user_id').eq('avatar_id', currentAvatarId).single();
                if (data && data.approver_user_id) {
                    const { data: user } = await supabase.from('users').select('email').eq('user_id', data.approver_user_id).single();
                    document.getElementById('current-reviewer-display').textContent = `Current Reviewer: ${user?.email || data.approver_user_id}`;
                } else {
                    document.getElementById('current-reviewer-display').textContent = 'Current Reviewer: None';
                }
            }
        });
        
        const closePsModal = () => psModal.classList.add('hidden');
        if (btnClosePsModal) btnClosePsModal.addEventListener('click', closePsModal);
        if (psModalBackdrop) psModalBackdrop.addEventListener('click', closePsModal);
        
        // Assign Reviewer
        const btnAssignReviewer = document.getElementById('btn-assign-reviewer');
        if (btnAssignReviewer) {
            btnAssignReviewer.addEventListener('click', async () => {
                const email = document.getElementById('reviewer-email-input').value;
                if (!email || !currentAvatarId) return;
                
                // Lookup user by email
                const { data: user, error } = await supabase.from('users').select('user_id').eq('email', email).single();
                if (error || !user) {
                    await showCustomAlert('Reviewer not found with that email.', 'Error');
                    return;
                }
                
                // Update avatar
                await supabase.from('avatar_details').update({ approver_user_id: user.user_id }).eq('avatar_id', currentAvatarId);
                document.getElementById('current-reviewer-display').textContent = `Current Reviewer: ${email}`;
                document.getElementById('reviewer-email-input').value = '';
                await showCustomAlert('Reviewer assigned!', 'Success');
            });
        }
        
        // Delete Avatar
        const btnDeleteAvatar = document.getElementById('btn-delete-avatar');
        if (btnDeleteAvatar) {
            btnDeleteAvatar.addEventListener('click', async () => {
                if (!currentAvatarId) return;
                const confirmed = await showCustomConfirm('Are you sure you want to delete this avatar? This action cannot be undone.', 'Delete Avatar?');
                if (confirmed) {
                    await supabase.from('avatar_details').delete().eq('avatar_id', currentAvatarId);
                    window.location.href = '/dashboard';
                }
            });
        }
    }
}
