import { supabase } from '../supabaseClient.js';

export async function loadSidebar(containerId = 'sidebar-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Fetch and inject the HTML
    try {
        const response = await fetch('/components/sidebar.html');
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
            .select('avatar_id, name, base_look')
            .eq('owner', session.user.id);
            
        if (avatarsError) throw avatarsError;

        // Populate dropdown
        const dropdownList = document.getElementById('avatar-dropdown-list');
        if (dropdownList && allAvatars && allAvatars.length > 0) {
            allAvatars.forEach(avatar => {
                const avatarItem = document.createElement('a');
                avatarItem.href = `/workspace.html?avatar_id=${avatar.avatar_id}`;
                avatarItem.className = 'w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer';
                avatarItem.innerHTML = `
                    <div class="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 bg-surface border border-white/10">
                        <img class="w-full h-full object-cover" src="${avatar.base_look || 'https://via.placeholder.com/24'}" alt="Avatar">
                    </div>
                    <span class="text-sm text-on-surface truncate">${avatar.name || 'Unnamed Avatar'}</span>
                `;
                dropdownList.appendChild(avatarItem);
            });
        }

        // 4. Update the currently selected avatar in the top switcher
        const urlParams = new URLSearchParams(window.location.search);
        const currentAvatarId = urlParams.get('avatar_id');
        
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

    // 8. Programmatically update link URLs to preserve avatar_id
    const urlParams = new URLSearchParams(window.location.search);
    const currentAvatarId = urlParams.get('avatar_id');
    const avatarParam = currentAvatarId ? `?avatar_id=${currentAvatarId}` : '';
    
    const homeNav = document.getElementById('nav-home');
    const dashboardNav = document.getElementById('nav-dashboard');
    const completedVideosNav = document.getElementById('nav-completed-videos');
    const editQueueNav = document.getElementById('nav-edit-queue');

    if (homeNav) homeNav.href = `/dashboard.html${avatarParam}`;
    if (dashboardNav) dashboardNav.href = `/dashboard.html${avatarParam}`;
    if (completedVideosNav) completedVideosNav.href = `/workspace.html${avatarParam}`;
    if (editQueueNav) editQueueNav.href = `/edit-queue.html${avatarParam}`;
}
