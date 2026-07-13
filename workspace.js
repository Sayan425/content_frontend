import { loadSidebar } from './components/sidebar.js?v=10';

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

// --- Per-page skeleton curtains -------------------------------------------
// Each tool gets a placeholder that mirrors its real layout, built from
// shimmering `.sk` blocks (styled in workspace.html). Repeat helper keeps
// the templates readable.
const rep = (n, html) => Array(n).fill(html).join('');

const SKELETONS = {
    // Analytics dashboard: title, stat cards, charts
    'analytics': `
        <div class="flex flex-col gap-6">
            <div class="sk h-12 w-64"></div>
            <div class="grid grid-cols-4 gap-4">${rep(4, '<div class="sk h-32 rounded-3xl"></div>')}</div>
            <div class="sk h-[320px] rounded-3xl"></div>
            <div class="grid grid-cols-2 gap-6">${rep(2, '<div class="sk h-[260px] rounded-3xl"></div>')}</div>
        </div>`,
    // Idea Labs: title, toolbar, table with rows
    'idea-labs': `
        <div class="flex flex-col gap-5">
            <div class="sk h-10 w-56"></div>
            <div class="flex gap-3">
                <div class="sk h-10 flex-1 max-w-md"></div>
                <div class="sk h-10 w-32"></div>
                <div class="sk h-10 w-32"></div>
            </div>
            <div class="sk h-12 w-full rounded-xl"></div>
            <div class="flex flex-col gap-2">${rep(8, '<div class="sk h-14 w-full rounded-xl"></div>')}</div>
        </div>`,
    // Kanban board: columns of stacked cards
    'workspace': `
        <div class="flex flex-col gap-5 h-full">
            <div class="sk h-10 w-56"></div>
            <div class="grid grid-cols-4 gap-4 flex-1">
                ${rep(4, `
                <div class="flex flex-col gap-3">
                    <div class="sk h-9 w-full"></div>
                    <div class="sk h-28 w-full rounded-2xl"></div>
                    <div class="sk h-28 w-full rounded-2xl"></div>
                    <div class="sk h-28 w-full rounded-2xl opacity-60"></div>
                </div>`)}
            </div>
        </div>`,
    // Script room: list on the left, editor on the right
    'script-room': `
        <div class="flex flex-col gap-5 h-full">
            <div class="sk h-10 w-56"></div>
            <div class="grid grid-cols-3 gap-6 flex-1">
                <div class="flex flex-col gap-3">${rep(6, '<div class="sk h-20 w-full rounded-2xl"></div>')}</div>
                <div class="col-span-2 flex flex-col gap-3">
                    <div class="sk h-12 w-2/3"></div>
                    <div class="sk flex-1 min-h-[420px] rounded-2xl"></div>
                </div>
            </div>
        </div>`,
    // Production queue / avatar studio: two-column cards
    'production-queue': `
        <div class="flex flex-col gap-5">
            <div class="sk h-10 w-64"></div>
            <div class="grid grid-cols-2 gap-5">${rep(6, '<div class="sk h-40 rounded-2xl"></div>')}</div>
        </div>`,
    // Edit suite: rows of videos in progress
    'edit-suite': `
        <div class="flex flex-col gap-5">
            <div class="sk h-10 w-56"></div>
            <div class="grid grid-cols-3 gap-5">${rep(6, '<div class="sk h-52 rounded-2xl"></div>')}</div>
        </div>`,
    // Completed videos: grid of vertical (9:16) thumbnails
    'completed-videos': `
        <div class="flex flex-col gap-5">
            <div class="sk h-10 w-64"></div>
            <div class="grid grid-cols-5 gap-4">${rep(10, '<div class="sk aspect-[9/16] rounded-2xl"></div>')}</div>
        </div>`,
    // Profile settings: avatar + form fields
    'profile-settings': `
        <div class="flex flex-col gap-6 max-w-3xl">
            <div class="sk h-10 w-56"></div>
            <div class="flex items-center gap-5">
                <div class="sk w-24 h-24 rounded-full"></div>
                <div class="flex flex-col gap-2 flex-1">
                    <div class="sk h-6 w-48"></div>
                    <div class="sk h-4 w-64"></div>
                </div>
            </div>
            ${rep(4, `
            <div class="flex flex-col gap-2">
                <div class="sk h-4 w-32"></div>
                <div class="sk h-12 w-full"></div>
            </div>`)}
        </div>`
};
SKELETONS['avatar-studio'] = SKELETONS['production-queue'];

function prepareSkeleton(toolName) {
    const slot = document.getElementById('skeleton-content');
    if (slot) slot.innerHTML = SKELETONS[toolName] || SKELETONS['analytics'];
    // Open a short window during which data reads may show the curtain;
    // outside of it (background refreshes, auto-saves) it stays hidden.
    window.__skeletonAllowedUntil = Date.now() + 5000;
}

async function initWorkspace() {
    // Load the reusable sidebar component
    await loadSidebar('sidebar-container');
    
    // Determine which tool to load from URL path (e.g. /analytics/1234)
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let tool = pathParts[0] || 'analytics';
    // pathParts[1] would be the content_id, which components can read from window.location.pathname
    
    // Validate tool
    const validTools = ['workspace', 'idea-labs', 'script-room', 'production-queue', 'edit-queue', 'avatar-studio', 'edit-suite', 'completed-videos', 'analytics', 'profile-settings'];
    if (!validTools.includes(tool)) {
        tool = 'analytics';
    }

    const container = document.getElementById('main-content');
    
    const renderTool = (toolName) => {
        prepareSkeleton(toolName);
        // Remove padding for full-bleed apps like edit-queue, add it back for others
        if (toolName === 'edit-queue') {
            container.classList.remove('p-8', 'overflow-y-auto');
            container.classList.add('overflow-hidden');
            container.innerHTML = '<div id="react-root" class="w-full h-full flex items-center justify-center"><p class="text-on-surface-variant animate-pulse">Loading Edit Suite...</p></div>';
            import('/src/edit-queue/index.jsx')
                .then(module => module.mountEditQueue('react-root'))
                .catch(err => {
                    console.error('Failed to load React app:', err);
                    container.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-error"><span class="material-symbols-outlined text-4xl mb-2">error</span><p>Failed to load Edit Suite. Check console.</p><p class="text-xs mt-2 opacity-70">${err.message}</p></div>`;
                });
        } else {
            container.classList.add('p-8', 'overflow-y-auto');
            container.classList.remove('overflow-hidden');
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
        let newTool = newParts[0] || 'idea-labs';
        if (!validTools.includes(newTool)) newTool = 'idea-labs';
        renderTool(newTool);
    });
}

// Run initialization
initWorkspace();
