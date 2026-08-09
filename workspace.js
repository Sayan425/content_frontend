import { loadSidebar } from './components/sidebar.js?v=10';

// Holds the loaded edit-queue module so we can unmount the editor (and stop
// its audio/video) when navigating to another tool.
let editQueueModule = null;

// Inject the "How this works" button into the scrollable content area so it
// scrolls with the page (rather than being pinned to the viewport). The
// content area's innerHTML is replaced on every tool switch, so re-mount it.
function mountHowItWorks() {
    const main = document.getElementById('main-content');
    if (!main || document.getElementById('btn-how-it-works')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-how-it-works';
    btn.title = 'Watch a quick walkthrough';
    btn.className = 'absolute top-6 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded border border-white/10 text-on-surface-variant hover:text-white hover:border-white/30 transition-colors bg-surface/60 backdrop-blur-md text-sm';
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">play_circle</span> How this works';
    main.appendChild(btn);
}

async function loadComponent(url, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load component');
        const html = await response.text();
        
        container.innerHTML = `<div class="p-8 w-full min-h-full flex flex-col">${html}</div>`;
        
        // Execute scripts (like the webgl shader)
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            if (oldScript.innerHTML) {
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            }
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        // Keep the "How this works" button present after the content swap
        mountHowItWorks();

        // Initialize component specific logic
        if (url.includes('idea-labs.html')) {
            import('./components/idea-labs.js').then(module => {
                if (module.initIdeaLabs) module.initIdeaLabs();
            }).catch(err => console.error('Failed to load idea-labs.js:', err));
        } else if (url.includes('script-room.html')) {
            import('./components/script-room.js').then(module => {
                if (module.initScriptRoom) module.initScriptRoom();
            }).catch(err => console.error('Failed to load script-room.js:', err));
        } else if (url.includes('production-queue.html')) {
            import('./components/production-queue.js').then(module => {
                if (module.initProductionQueue) module.initProductionQueue();
            }).catch(err => console.error('Failed to load production-queue.js:', err));
        } else if (url.includes('edit-suite.html')) {
            import('./components/edit-suite.js').then(module => {
                if (module.initEditSuite) module.initEditSuite();
            }).catch(err => console.error('Failed to load edit-suite.js:', err));
        } else if (url.includes('completed-videos.html')) {
            import('./components/completed-videos.js').then(module => {
                if (module.initCompletedVideos) module.initCompletedVideos();
            }).catch(err => console.error('Failed to load completed-videos.js:', err));
        } else if (url.includes('manage-avatar.html')) {
            import('./components/manage-avatar.js').then(module => {
                if (module.initManageAvatar) module.initManageAvatar();
            }).catch(err => console.error('Failed to load manage-avatar.js:', err));
        } else if (url.includes('kanban-board.html')) {
            import('./components/kanban-board.js').then(module => {
                if (module.initKanbanBoard) module.initKanbanBoard();
            }).catch(err => console.error('Failed to load kanban-board.js:', err));
        } else if (url.includes('home.html')) {
            import('./components/home.js?v=6').then(module => {
                if (module.initHomeAnalytics) module.initHomeAnalytics();
            }).catch(err => console.error('Failed to load home.js:', err));
        } else if (url.includes('profile-settings.html')) {
            import('./components/profile-settings.js').then(module => {
                if (module.initProfileSettings) module.initProfileSettings();
            }).catch(err => console.error('Failed to load profile-settings.js:', err));
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

// Simple, quiet loading indicator shown while a tool's HTML/data loads.
function showLoading(container) {
    if (container) {
        container.innerHTML = '<div class="w-full h-full flex items-center justify-center py-20"><div class="app-spinner"></div></div>';
    }
}

async function initWorkspace() {
    // Load the reusable sidebar component
    await loadSidebar('sidebar-container');
    
    // Determine which tool to load from URL path (e.g. /analytics/1234)
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let tool = pathParts[0] || 'analytics';
    // pathParts[1] would be the content_id, which components can read from window.location.pathname
    
    // Validate tool
    const validTools = ['workspace', 'idea-labs', 'script-room', 'production-queue', 'edit-queue', 'avatar-studio', 'edit-suite', 'completed-videos', 'manage-avatar', 'analytics', 'profile-settings'];
    if (!validTools.includes(tool)) {
        tool = 'analytics';
    }

    const container = document.getElementById('main-content');
    
    const renderTool = (toolName) => {
        // Leaving the video editor: tear down the React app so the Remotion
        // player stops and its audio/video no longer plays in the background.
        if (toolName !== 'edit-queue' && editQueueModule) {
            try { editQueueModule.unmountEditQueue(); } catch (e) { console.error(e); }
        }

        // Remove padding for full-bleed apps like edit-queue, add it back for others
        if (toolName === 'edit-queue') {
            container.classList.remove('p-8', 'overflow-y-auto');
            container.classList.add('overflow-hidden');
            container.innerHTML = '<div id="react-root" class="w-full h-full flex items-center justify-center"><p class="text-on-surface-variant animate-pulse">Loading Edit Suite...</p></div>';
            // No "How this works" button on the video editor.
            import('/src/edit-queue/index.jsx')
                .then(module => { editQueueModule = module; module.mountEditQueue('react-root'); })
                .catch(err => {
                    console.error('Failed to load React app:', err);
                    container.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-error"><span class="material-symbols-outlined text-4xl mb-2">error</span><p>Failed to load Edit Suite. Check console.</p><p class="text-xs mt-2 opacity-70">${err.message}</p></div>`;
                });
        } else {
            container.classList.add('p-8', 'overflow-y-auto');
            container.classList.remove('overflow-hidden');
            showLoading(container);
        }

        if (toolName === 'idea-labs') {
            loadComponent('/components/idea-labs.html', 'main-content');
        } else if (toolName === 'script-room') {
            loadComponent('/components/script-room.html', 'main-content');
        } else if (toolName === 'production-queue' || toolName === 'avatar-studio') {
            loadComponent('/components/production-queue.html', 'main-content');
        } else if (toolName === 'edit-suite') {
            loadComponent('/components/edit-suite.html', 'main-content');
        } else if (toolName === 'completed-videos') {
            loadComponent('/components/completed-videos.html', 'main-content');
        } else if (toolName === 'manage-avatar') {
            loadComponent('/components/manage-avatar.html', 'main-content');
        } else if (toolName === 'workspace') {
            loadComponent('/components/kanban-board.html?v=6', 'main-content');
        } else if (toolName === 'analytics') {
            loadComponent('/components/home.html?v=6', 'main-content');
        } else if (toolName === 'profile-settings') {
            loadComponent('/components/profile-settings.html', 'main-content');
        }

        // Update sidebar active link (give it a small delay so sidebar HTML finishes loading if needed)
        setTimeout(() => {
            document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
            let activeId = null;
            if (toolName === 'workspace') activeId = 'nav-workspace';
            else if (toolName === 'idea-labs') activeId = 'nav-idea-labs';
            else if (toolName === 'script-room') activeId = 'nav-script-room';
            else if (toolName === 'production-queue' || toolName === 'avatar-studio') activeId = 'nav-avatar-studio';
            else if (toolName === 'edit-suite' || toolName === 'edit-queue') activeId = 'nav-edit-suite';
            else if (toolName === 'completed-videos') activeId = 'nav-completed-videos';
            else if (toolName === 'manage-avatar') activeId = 'nav-manage-avatar';
            else if (toolName === 'analytics') activeId = 'nav-analytics';
            else if (toolName === 'profile-settings') activeId = 'nav-profile-settings';
            
            if (activeId) {
                const activeEl = document.getElementById(activeId);
                if (activeEl) activeEl.classList.add('active');
            }
        }, 150);
    };

    renderTool(tool);

    // Attach SPA-like navigation for internal links anywhere on the page
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (href && href.startsWith('/')) {
            const pathBase = href.split('?')[0];
            const newTool = pathBase.split('/')[1];
            
            if (validTools.includes(newTool)) {
                e.preventDefault();
                history.pushState(null, '', href);
                renderTool(newTool);
            }
        }
    });

    window.addEventListener('popstate', () => {
        const newParts = window.location.pathname.split('/').filter(Boolean);
        let newTool = newParts[0] || 'analytics';
        if (!validTools.includes(newTool)) newTool = 'analytics';
        renderTool(newTool);
    });
}

// Run initialization
initWorkspace();
