import { loadSidebar } from './components/sidebar.js';

async function loadComponent(url, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load component');
        const html = await response.text();
        
        container.innerHTML = html;
        
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
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

async function initWorkspace() {
    // Load the reusable sidebar component
    await loadSidebar('sidebar-container');
    
    // Determine which tool to load from URL path (e.g. /idea-labs/1234)
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let tool = pathParts[0] || 'idea-labs';
    // pathParts[1] would be the content_id, which components can read from window.location.pathname
    
    // Validate tool
    const validTools = ['workspace', 'idea-labs', 'script-room', 'production-queue', 'edit-queue', 'avatar-studio', 'edit-suite', 'completed-videos'];
    if (!validTools.includes(tool)) {
        tool = 'workspace';
    }

    const container = document.getElementById('main-content');
    
    const renderTool = (toolName) => {
        // Remove padding for full-bleed apps like edit-queue, add it back for others
        if (toolName === 'edit-queue') {
            container.classList.remove('p-8');
            container.innerHTML = '<div id="react-root" class="w-full h-full flex items-center justify-center"><p class="text-on-surface-variant animate-pulse">Loading Edit Suite...</p></div>';
            import('/src/edit-queue/index.jsx')
                .then(module => module.mountEditQueue('react-root'))
                .catch(err => {
                    console.error('Failed to load React app:', err);
                    container.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-error"><span class="material-symbols-outlined text-4xl mb-2">error</span><p>Failed to load Edit Suite. Check console.</p><p class="text-xs mt-2 opacity-70">${err.message}</p></div>`;
                });
        } else if (toolName === 'idea-labs') {
            container.classList.add('p-8');
            loadComponent('/components/idea-labs.html', 'main-content');
        } else if (toolName === 'script-room') {
            container.classList.add('p-8');
            loadComponent('/components/script-room.html', 'main-content');
        } else if (toolName === 'production-queue' || toolName === 'avatar-studio') {
            container.classList.add('p-8');
            loadComponent('/components/production-queue.html', 'main-content');
        } else if (toolName === 'edit-suite') {
            container.classList.add('p-8');
            loadComponent('/components/edit-suite.html', 'main-content');
        } else if (toolName === 'completed-videos') {
            container.classList.add('p-8');
            loadComponent('/components/completed-videos.html', 'main-content');
        } else if (toolName === 'workspace') {
            container.classList.add('p-8');
            loadComponent('/components/kanban-board.html', 'main-content');
        }

        // Update sidebar active link (give it a small delay so sidebar HTML finishes loading if needed)
        setTimeout(() => {
            document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
            let activeId = null;
            if (toolName === 'workspace') activeId = 'nav-workspace';
            else if (toolName === 'idea-labs') activeId = 'nav-idea-labs';
            else if (toolName === 'script-room') activeId = 'nav-script-room';
            else if (toolName === 'production-queue' || toolName === 'avatar-studio') activeId = 'nav-avatar-studio';
            else if (toolName === 'edit-queue' || toolName === 'edit-suite') activeId = 'nav-edit-suite';
            else if (toolName === 'completed-videos') activeId = 'nav-completed-videos';
            
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
