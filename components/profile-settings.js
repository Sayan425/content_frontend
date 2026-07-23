import { supabase } from '../supabaseClient.js';
import { showCustomAlert } from './notifications.js';
import { escapeHtml } from '../utils/escape-html.js';

export function initProfileSettings() {
    let currentAvatarId = localStorage.getItem('activeAvatarId');
    let avatarDetails = null;
    let currentApprover = null;

    // Elements
    const inputs = {
        tiktok: document.getElementById('social-tiktok'),
        instagram: document.getElementById('social-instagram'),
        youtube: document.getElementById('social-youtube'),
        facebook: document.getElementById('social-facebook'),
        linkedin: document.getElementById('social-linkedin'),
        twitter: document.getElementById('social-twitter')
    };
    
    const emailSearch = document.getElementById('approver-email-search');
    const btnSearchApprover = document.getElementById('btn-search-approver');
    const resultContainer = document.getElementById('approver-result-container');
    
    const togglesContainer = document.getElementById('approval-toggles-container');

    // Logout
    const btnLogout = document.getElementById('btn-profile-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            btnLogout.disabled = true;
            try {
                await supabase.auth.signOut();
            } catch (error) {
                console.error('Logout failed:', error);
            } finally {
                window.location.href = '/';
            }
        });
    }

    async function loadData() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            
            if (!userId) throw new Error('Not authenticated');

            // Fetch avatar details
            let query = supabase.from('avatar_details').select('*').eq('owner_user_id', userId);
            if (currentAvatarId) query = query.eq('avatar_id', currentAvatarId);
            
            const { data: avatars, error } = await query;
            if (error) throw error;
            
            if (!avatars || avatars.length === 0) {
                console.warn('No avatar found for user.');
                return;
            }
            
            avatarDetails = avatars[0];
            currentAvatarId = avatarDetails.avatar_id;
            
            populateSocialAccounts();
            
            if (avatarDetails.approver_user_id) {
                await fetchCurrentApprover(avatarDetails.approver_user_id);
            } else {
                renderCurrentApprover(null);
            }
            
            renderApprovalToggles();
            
        } catch (error) {
            console.error('Error loading profile settings:', error);
            showCustomAlert('Failed to load profile settings.', 'Error');
        }
    }

    function populateSocialAccounts() {
        if (!avatarDetails.social_accounts) return;
        
        let accounts = {};
        try {
            accounts = typeof avatarDetails.social_accounts === 'string' ? JSON.parse(avatarDetails.social_accounts) : avatarDetails.social_accounts;
        } catch(e) {}
        
        Object.keys(inputs).forEach(platform => {
            if (inputs[platform]) {
                inputs[platform].value = accounts[platform] || '';
            }
        });
    }

    const platformChecks = {
        tiktok: 'tiktok.com',
        instagram: 'instagram',
        youtube: 'youtube',
        facebook: 'facebook',
        linkedin: 'linkedin',
        twitter: 'x.com'
    };

    function validateSocialLink(platform, url) {
        if (!url) return true; // Empty is allowed
        if (url.includes(' ')) return false; // No spaces
        return url.toLowerCase().includes(platformChecks[platform]);
    }

    Object.keys(inputs).forEach(platform => {
        const input = inputs[platform];
        if (!input) return;

        input.addEventListener('change', async (e) => {
            const url = e.target.value.trim();
            
            if (url !== '' && !validateSocialLink(platform, url)) {
                showCustomAlert(`Invalid ${platform} link. Must contain '${platformChecks[platform]}' and have no spaces.`, 'Error');
                // Revert to last valid
                const accounts = typeof avatarDetails.social_accounts === 'string' 
                    ? JSON.parse(avatarDetails.social_accounts) 
                    : (avatarDetails.social_accounts || {});
                e.target.value = accounts[platform] || '';
                return;
            }

            // Valid link, let's auto-save
            input.classList.add('opacity-50'); // visual feedback during save
            
            const accounts = typeof avatarDetails.social_accounts === 'string' 
                ? JSON.parse(avatarDetails.social_accounts) 
                : (avatarDetails.social_accounts || {});
                
            if (url) {
                accounts[platform] = url;
            } else {
                delete accounts[platform];
            }
            
            try {
                const { error } = await supabase
                    .from('avatar_details')
                    .update({ social_accounts: accounts })
                    .eq('avatar_id', currentAvatarId);
                    
                if (error) throw error;
                avatarDetails.social_accounts = accounts;
            } catch(error) {
                console.error(error);
                showCustomAlert('Failed to save social account.', 'Error');
            } finally {
                input.classList.remove('opacity-50');
            }
        });
    });
    
    async function fetchCurrentApprover(userId) {
        try {
            const { data, error } = await supabase.from('users').select('*').eq('user_id', userId);
            if (error) throw error;
            
            if (data && data.length > 0) {
                currentApprover = data[0];
                renderCurrentApprover(data[0]);
            } else {
                console.warn("Approver found in avatar_details but missing from users table:", userId);
                renderCurrentApprover({ name: 'Unknown User', email: 'User not found in database' });
            }
        } catch(error) {
            console.error('Failed to fetch approver', error);
            // Fallback if the user row doesn't exist or we can't read it
            renderCurrentApprover({ name: 'Unknown User', email: 'Error fetching user data' });
        }
    }
    
    function renderCurrentApprover(user) {
        resultContainer.classList.remove('hidden');
        if (!user) {
            resultContainer.innerHTML = `<div class="text-white/50 text-sm italic">No approver currently assigned. Search an email above to assign one.</div>`;
            return;
        }
        
        resultContainer.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-xs text-white/50 uppercase tracking-wider mb-1 font-mono-label">Current Approver</div>
                    <div class="text-white font-medium flex items-center gap-2">
                        <span class="material-symbols-outlined text-[16px]">account_circle</span>
                        ${escapeHtml(user.name || 'Unnamed User')}
                    </div>
                    <div class="text-white/60 text-sm mt-1">${escapeHtml(user.email)}</div>
                </div>
                <div class="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-md uppercase">Reviewer</div>
            </div>
        `;
    }
    
    btnSearchApprover.addEventListener('click', async () => {
        const email = emailSearch.value.trim();
        if (!email) return;
        
        btnSearchApprover.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span>';
        btnSearchApprover.disabled = true;
        
        try {
            const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('role', 'reviewer');
            if (error) throw error;
            
            if (!data || data.length === 0) {
                resultContainer.classList.remove('hidden');
                resultContainer.innerHTML = `
                    <div class="flex flex-col items-center gap-2 py-4">
                        <span class="material-symbols-outlined text-error text-[32px]">error</span>
                        <p class="text-error font-medium text-sm">No reviewer found with that email.</p>
                        <p class="text-white/40 text-xs text-center">Please make sure the email is correct and they have set up their account.</p>
                    </div>
                `;
            } else {
                const user = data[0];
                resultContainer.classList.remove('hidden');
                resultContainer.innerHTML = `
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex-1 min-w-0">
                            <div class="text-xs text-[#4cd7f6] uppercase tracking-wider mb-1 font-mono-label">Found Reviewer</div>
                            <div class="text-white font-medium truncate">${escapeHtml(user.name || 'Unnamed User')}</div>
                            <div class="text-white/60 text-sm truncate">${escapeHtml(user.email)}</div>
                        </div>
                        <button id="btn-assign-approver" data-id="${user.user_id}" class="shrink-0 bg-[#4cd7f6] hover:bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-lg">Assign</button>
                    </div>
                `;
                
                document.getElementById('btn-assign-approver').addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    await assignApprover(id, user);
                });
            }
        } catch(error) {
            console.error(error);
            showCustomAlert('Error searching for user.', 'Error');
        } finally {
            btnSearchApprover.innerHTML = '<span class="material-symbols-outlined">search</span>';
            btnSearchApprover.disabled = false;
        }
    });
    
    async function assignApprover(userId, userObj) {
        try {
            const { error } = await supabase
                .from('avatar_details')
                .update({ approver_user_id: userId })
                .eq('avatar_id', currentAvatarId);
                
            if (error) throw error;
            showCustomAlert('Approver assigned successfully!', 'Success');
            currentApprover = userObj;
            avatarDetails.approver_user_id = userId;
            emailSearch.value = '';
            renderCurrentApprover(userObj);
        } catch(error) {
            console.error(error);
            showCustomAlert('Failed to assign approver.', 'Error');
        }
    }
    
    // Approval Settings Toggles
    function renderApprovalToggles() {
        let settings = { edit: false, idea: false, script: true, production: false };
        if (avatarDetails.approval_settings) {
            try {
                settings = typeof avatarDetails.approval_settings === 'string' ? JSON.parse(avatarDetails.approval_settings) : avatarDetails.approval_settings;
            } catch(e) {}
        }
        
        const toggles = [
            { key: 'idea', label: 'Idea Generation', desc: 'Require approval before generating scripts from ideas.' },
            { key: 'script', label: 'Script Writing', desc: 'Require approval before sending scripts to production.' },
            { key: 'production', label: 'Video Production', desc: 'Require approval before rendering final avatars.' },
            { key: 'edit', label: 'Edit Suite', desc: 'Require approval before exporting final videos.' }
        ];
        
        togglesContainer.innerHTML = toggles.map(t => `
            <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
                <div class="flex flex-col">
                    <span class="text-white font-medium">${t.label}</span>
                    <span class="text-white/50 text-xs mt-1">${t.desc}</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" class="sr-only peer toggle-input" data-key="${t.key}" ${settings[t.key] ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ffb2b7]"></div>
                </label>
            </div>
        `).join('');
        
        // Add event listeners
        togglesContainer.querySelectorAll('.toggle-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const key = e.target.getAttribute('data-key');
                const val = e.target.checked;
                settings[key] = val;
                
                try {
                    const { error } = await supabase
                        .from('avatar_details')
                        .update({ approval_settings: settings })
                        .eq('avatar_id', currentAvatarId);
                        
                    if (error) throw error;
                    // Silent success for toggles is usually better UX
                    avatarDetails.approval_settings = settings;
                } catch(error) {
                    console.error(error);
                    showCustomAlert('Failed to update setting.', 'Error');
                    e.target.checked = !val; // Revert
                }
            });
        });
    }

    loadData();
}
