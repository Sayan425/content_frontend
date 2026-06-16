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
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

async function initWorkspace() {
    // Load the reusable sidebar component
    await loadSidebar('sidebar-container');
    
    const ideaLabsBtn = document.getElementById('nav-idea-labs');
    if (ideaLabsBtn) {
        ideaLabsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadComponent('/components/idea-labs.html', 'main-content');
        });
    }

    const scriptRoomBtn = document.getElementById('nav-script-room');
    if (scriptRoomBtn) {
        scriptRoomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadComponent('/components/script-room.html', 'main-content');
        });
    }
}

// Run initialization
initWorkspace();
