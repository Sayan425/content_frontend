import { supabase } from '../supabaseClient.js';
import { showCustomAlert, showCustomConfirm } from './notifications.js';
import { escapeHtml } from '../utils/escape-html.js';
import { apiFetch } from '../utils/api-fetch.js';

export function initManageAvatar() {
    const loadingEl = document.getElementById('manage-avatar-loading');
    const errorEl = document.getElementById('manage-avatar-error');
    const contentEl = document.getElementById('manage-avatar-content');
    const looksRow = document.getElementById('looks-row');
    const looksEmpty = document.getElementById('looks-empty');
    const searchLooks = document.getElementById('search-looks');
    const voicePlayer = document.getElementById('voice-player');
    const voiceEmpty = document.getElementById('voice-empty');
    const btnReplaceVoice = document.getElementById('btn-replace-voice');
    const scriptInput = document.getElementById('demo-script-input');
    const scriptCount = document.getElementById('demo-script-count');
    const btnSaveScript = document.getElementById('btn-save-script');

    const modalLook = document.getElementById('modal-manage-look');
    const modalLookBackdrop = document.getElementById('manage-look-backdrop');
    const btnCloseLook = document.getElementById('btn-close-manage-look');
    const modalLookTitle = document.getElementById('manage-look-title');
    const lookNameInput = document.getElementById('manage-look-name');
    const btnPickLookFile = document.getElementById('btn-pick-look-file');
    const providersContainer = document.getElementById('manage-look-providers');
    const refsSection = document.getElementById('manage-look-refs-section');
    const refsGrid = document.getElementById('manage-look-refs-grid');
    const btnToggleRefs = document.getElementById('btn-toggle-manage-refs');
    const refsChevron = document.getElementById('manage-refs-chevron');

    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

    // Same provider set as the Avatar Studio "Add Look" modal, so the two
    // flows stay consistent for the user.
    const AI_PROVIDERS = [
        { name: 'ChatGPT', kind: 'Image', icon: 'https://assets.youravatarstudio.com/icons/ChatGPT%20logo.svg', url: 'https://chatgpt.com/' },
        { name: 'Google Flow', kind: 'Image & Video', icon: 'https://assets.youravatarstudio.com/icons/google%20flow%20logo.png', url: 'https://labs.google/flow/' },
        { name: 'Higgsfield', kind: 'Video', icon: 'https://assets.youravatarstudio.com/icons/higgsfield%20icon.jpg', url: 'https://higgsfield.ai/' },
        { name: 'Midjourney', kind: 'Image', icon: 'https://assets.youravatarstudio.com/icons/midjourney%20icon.webp', url: 'https://www.midjourney.com/' },
        { name: 'Leonardo AI', kind: 'Image', icon: 'https://assets.youravatarstudio.com/icons/leonardo%20ai%20icon.jpg', url: 'https://leonardo.ai/' },
        { name: 'Runway', kind: 'Video', icon: 'https://assets.youravatarstudio.com/icons/runway%20ml%20icon.png', url: 'https://runwayml.com/' },
    ];

    // What the modal is currently doing: 'add' a new look, or 'replace' an
    // existing one (index -1 means the base look).
    let modalMode = 'add';
    let modalTargetIndex = -1;

    let avatar = null;

    // Older rows stored the image under a variety of keys, so read them all
    // but always write back { name, url }.
    function lookUrl(look) {
        if (!look || typeof look !== 'object') return '';
        return look.url || look.image_url || look.image || look.img || look.link || look.look || look.base_look || '';
    }

    function normalizeLooks(raw) {
        let list = raw;
        if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch { return []; }
        }
        if (!Array.isArray(list)) return [];
        return list
            .map((look, idx) => ({ name: look?.name || `Look ${idx + 1}`, url: lookUrl(look) }))
            .filter(look => look.url);
    }

    function setBusy(btn, busy, busyLabel) {
        if (!btn) return;
        const label = btn.querySelector('.btn-label');
        const icon = btn.querySelector('.material-symbols-outlined');
        if (busy) {
            btn.dataset.originalLabel = label ? label.textContent : '';
            btn.dataset.originalIcon = icon ? icon.textContent : '';
            btn.disabled = true;
            if (label && busyLabel) label.textContent = busyLabel;
            if (icon) {
                icon.textContent = 'progress_activity';
                icon.classList.add('animate-spin');
            }
        } else {
            btn.disabled = false;
            if (label && btn.dataset.originalLabel) label.textContent = btn.dataset.originalLabel;
            if (icon && btn.dataset.originalIcon) {
                icon.textContent = btn.dataset.originalIcon;
                icon.classList.remove('animate-spin');
            }
        }
    }

    // ---- Loading ----

    async function loadAvatar() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) throw new Error('Not authenticated');

            const avatarId = localStorage.getItem('activeAvatarId');
            if (!avatarId) throw new Error('No avatar selected. Pick one from the sidebar first.');

            const { data, error } = await supabase
                .from('avatar_details')
                .select('avatar_id, name, base_look, demo_voice, other_looks, demo_audio_script')
                .eq('avatar_id', avatarId)
                .eq('owner_user_id', userId)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Avatar not found.');

            avatar = data;
            render();
        } catch (error) {
            console.error('Error loading avatar:', error);
            showError(error.message);
        }
    }

    function showError(message) {
        if (loadingEl) loadingEl.classList.add('hidden');
        if (contentEl) contentEl.classList.add('hidden');
        if (!errorEl) return;
        errorEl.classList.remove('hidden');
        errorEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-center w-full bg-error/10 border border-error/20 rounded-2xl">
                <span class="material-symbols-outlined text-[40px] text-error mb-2">error</span>
                <span class="text-error font-medium">Could not load your avatar</span>
                <span class="text-error/70 text-sm mt-1">${escapeHtml(message)}</span>
            </div>
        `;
    }

    function render() {
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) errorEl.classList.add('hidden');
        if (contentEl) {
            contentEl.classList.remove('hidden');
            contentEl.classList.add('flex');
        }

        const nameEl = document.getElementById('identity-avatar-name');
        const imgEl = document.getElementById('identity-avatar-img');
        if (nameEl) nameEl.textContent = avatar.name || 'Unnamed Avatar';
        if (imgEl) {
            imgEl.src = avatar.base_look || 'https://placehold.co/150x150/131313/FFF?text=No+Image';
            imgEl.alt = avatar.name || 'Avatar';
        }

        renderLooks();
        renderVoice();

        if (scriptInput) {
            scriptInput.value = avatar.demo_audio_script || '';
            updateScriptCount();
        }
    }

    // ---- Looks ----

    function renderLooks() {
        if (!looksRow) return;

        const term = searchLooks ? searchLooks.value.trim().toLowerCase() : '';
        const matches = (name) => !term || name.toLowerCase().includes(term);

        // Add Look always leads the row and is never filtered out.
        let html = `
            <button type="button" id="btn-add-look" class="cursor-pointer flex-shrink-0 w-[150px] h-[220px] rounded-2xl border border-dashed border-white/25 bg-white/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col items-center justify-center group">
                <div class="w-12 h-12 rounded-full bg-white/10 group-hover:bg-primary/20 flex items-center justify-center mb-2 transition-colors">
                    <span class="material-symbols-outlined text-white/70 group-hover:text-primary text-[24px]">add</span>
                </div>
                <span class="text-xs font-medium text-white/70 group-hover:text-primary transition-colors">Add Look</span>
            </button>
        `;

        let visible = 0;

        if (avatar.base_look && matches('Default Look')) {
            html += lookCard({ url: avatar.base_look, name: 'Default Look', index: -1, isBase: true });
            visible++;
        }

        normalizeLooks(avatar.other_looks).forEach((look, idx) => {
            if (!matches(look.name)) return;
            html += lookCard({ url: look.url, name: look.name, index: idx, isBase: false });
            visible++;
        });

        looksRow.innerHTML = html;

        // Only a search that matches nothing counts as empty; the Add Look
        // tile alone is not a result.
        if (looksEmpty) looksEmpty.classList.toggle('hidden', visible > 0 || !term);

        attachLookHandlers();
    }

    function lookCard({ url, name, index, isBase }) {
        const safeName = escapeHtml(name);
        return `
            <div class="group relative flex-shrink-0 w-[150px] h-[220px] rounded-2xl overflow-hidden border border-white/10 bg-surface-container shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-primary/50">
                <img src="${escapeHtml(url)}" alt="${safeName}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>

                ${isBase ? `
                    <div class="absolute top-2.5 left-2.5 bg-primary/90 text-on-primary px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide shadow-lg">
                        Default
                    </div>
                ` : ''}

                <div class="absolute bottom-0 left-0 w-full p-2.5 flex flex-col gap-2">
                    <span class="text-white text-[12px] font-bold leading-tight line-clamp-2" title="${safeName}">${safeName}</span>
                    <div class="flex items-center" style="gap: 5px;">
                        <button type="button" data-look-index="${index}" title="Replace image" aria-label="Replace image"
                            class="btn-replace-look flex-1 h-7 rounded-lg bg-white/10 hover:bg-primary border border-white/20 hover:border-primary text-white flex items-center justify-center transition-all">
                            <span class="material-symbols-outlined text-[15px]">swap_horiz</span>
                        </button>
                        ${isBase ? '' : `
                            <button type="button" data-look-index="${index}" title="Make default look" aria-label="Make default look"
                                class="btn-make-default shrink-0 w-7 h-7 rounded-lg bg-white/10 hover:bg-primary border border-white/20 hover:border-primary text-white flex items-center justify-center transition-all">
                                <span class="material-symbols-outlined text-[15px]">star</span>
                            </button>
                            <button type="button" data-look-index="${index}" title="Remove look" aria-label="Remove look"
                                class="btn-remove-look shrink-0 w-7 h-7 rounded-lg bg-white/10 hover:bg-error border border-white/20 hover:border-error text-white flex items-center justify-center transition-all">
                                <span class="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    function attachLookHandlers() {
        const btnAdd = document.getElementById('btn-add-look');
        if (btnAdd) btnAdd.addEventListener('click', () => openLookModal('add', -1));

        looksRow.querySelectorAll('.btn-replace-look').forEach(btn => {
            btn.addEventListener('click', () => {
                openLookModal('replace', parseInt(btn.getAttribute('data-look-index'), 10));
            });
        });

        looksRow.querySelectorAll('.btn-make-default').forEach(btn => {
            btn.addEventListener('click', () => makeDefault(parseInt(btn.getAttribute('data-look-index'), 10)));
        });

        looksRow.querySelectorAll('.btn-remove-look').forEach(btn => {
            btn.addEventListener('click', () => removeLook(parseInt(btn.getAttribute('data-look-index'), 10)));
        });
    }

    // Swap a look into the base slot, moving the old base into other_looks so
    // nothing is lost.
    async function makeDefault(index) {
        const others = normalizeLooks(avatar.other_looks);
        const chosen = others[index];
        if (!chosen) return;

        const oldBase = avatar.base_look;
        const nextOthers = others.filter((_, i) => i !== index);
        if (oldBase) nextOthers.unshift({ name: 'Previous Default', url: oldBase });

        await persist({ base_look: chosen.url, other_looks: nextOthers }, 'Default look updated.');
    }

    // Unlink only. The file stays in storage so it can be re-added later.
    async function removeLook(index) {
        const others = normalizeLooks(avatar.other_looks);
        const target = others[index];
        if (!target) return;

        const confirmed = await showCustomConfirm(
            `Remove "${target.name}" from this avatar? The image file itself is kept, so you can add it back later.`,
            'Remove Look'
        );
        if (!confirmed) return;

        const nextOthers = others.filter((_, i) => i !== index);
        await persist({ other_looks: nextOthers }, 'Look removed.');
    }

    // ---- Voice ----

    function renderVoice() {
        const hasVoice = Boolean(avatar.demo_voice);
        if (voicePlayer) {
            voicePlayer.classList.toggle('hidden', !hasVoice);
            if (hasVoice) voicePlayer.src = avatar.demo_voice;
        }
        if (voiceEmpty) {
            voiceEmpty.classList.toggle('hidden', hasVoice);
            voiceEmpty.classList.toggle('flex', !hasVoice);
        }
    }

    // ---- Demo script ----

    function updateScriptCount() {
        if (!scriptCount || !scriptInput) return;
        const text = scriptInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        scriptCount.textContent = `${words} word${words === 1 ? '' : 's'}`;
    }

    if (scriptInput) scriptInput.addEventListener('input', updateScriptCount);

    if (searchLooks) searchLooks.addEventListener('input', renderLooks);

    if (btnSaveScript) {
        btnSaveScript.addEventListener('click', async () => {
            setBusy(btnSaveScript, true, 'Saving...');
            try {
                await persist({ demo_audio_script: scriptInput.value }, 'Demo script saved.', false);
            } finally {
                setBusy(btnSaveScript, false);
            }
        });
    }

    // ---- Persistence ----

    // Write a patch to Supabase and refresh local state. Re-rendering is
    // skipped for text-only saves so the user does not lose their cursor.
    async function persist(patch, successMessage, rerender = true) {
        try {
            const { error } = await supabase
                .from('avatar_details')
                .update(patch)
                .eq('avatar_id', avatar.avatar_id);

            if (error) throw error;

            avatar = { ...avatar, ...patch };
            if (rerender) render();
            if (successMessage) await showCustomAlert(successMessage, 'Saved');
            return true;
        } catch (error) {
            console.error('Error saving avatar:', error);
            await showCustomAlert(`Could not save: ${error.message}`, 'Error');
            return false;
        }
    }

    // ---- Uploads ----

    // Keep the existing R2 layout: files live in a folder named after the
    // avatar, e.g. avatar-details/shalini-mishra/Balcony Look.jpeg
    function avatarFolder() {
        return String(avatar.name || 'avatar')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'avatar';
    }

    async function uploadToR2(file, contentType) {
        const res = await apiFetch('/api/get-r2-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: file.name,
                contentType,
                customPath: avatarFolder(),
                customBucket: 'avatar-details',
                customPublicUrlBase: 'https://avatars.youravatarstudio.com'
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not prepare the upload.');

        const uploadRes = await fetch(data.signedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': contentType }
        });
        if (!uploadRes.ok) throw new Error('Upload to storage failed.');

        return data.publicUrl;
    }

    // Open a file picker without leaving a stray input in the DOM.
    function pickFile(accept) {
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.addEventListener('change', () => {
                const file = input.files && input.files[0];
                input.remove();
                resolve(file || null);
            });
            input.addEventListener('cancel', () => {
                input.remove();
                resolve(null);
            });
            input.click();
        });
    }

    if (btnReplaceVoice) {
        btnReplaceVoice.addEventListener('click', async () => {
            const file = await pickFile('audio/mpeg,audio/wav,audio/mp3,.mp3,.wav');
            if (!file) return;

            if (file.size > MAX_AUDIO_BYTES) {
                await showCustomAlert('That audio file is larger than 20 MB. Please upload a smaller file.', 'File Too Large');
                return;
            }

            setBusy(btnReplaceVoice, true, 'Uploading...');
            try {
                const url = await uploadToR2(file, file.type || 'audio/mpeg');
                await persist({ demo_voice: url }, 'Demo voice updated.');
            } catch (error) {
                console.error('Error uploading voice:', error);
                await showCustomAlert(`Could not upload the voice: ${error.message}`, 'Error');
            } finally {
                setBusy(btnReplaceVoice, false);
            }
        });
    }

    // ---- Look modal ----

    function openLookModal(mode, index) {
        modalMode = mode;
        modalTargetIndex = index;

        if (modalLookTitle) {
            const label = mode === 'add' ? 'Add a New Look' : 'Replace This Look';
            modalLookTitle.innerHTML = `<span class="material-symbols-outlined text-primary text-[20px]">auto_awesome</span> ${label}`;
        }

        if (lookNameInput) {
            const others = normalizeLooks(avatar.other_looks);
            if (mode === 'replace' && index >= 0 && others[index]) {
                lookNameInput.value = others[index].name;
                lookNameInput.disabled = false;
            } else if (mode === 'replace' && index === -1) {
                lookNameInput.value = 'Default Look';
                lookNameInput.disabled = true;
            } else {
                lookNameInput.value = '';
                lookNameInput.disabled = false;
            }
        }

        populateRefs();

        if (!modalLook) return;
        modalLook.classList.remove('hidden');
        void modalLook.offsetWidth;
        modalLook.classList.remove('opacity-0');
    }

    function closeLookModal() {
        if (!modalLook) return;
        modalLook.classList.add('opacity-0');
        setTimeout(() => modalLook.classList.add('hidden'), 300);
    }

    if (btnCloseLook) btnCloseLook.addEventListener('click', closeLookModal);
    if (modalLookBackdrop) modalLookBackdrop.addEventListener('click', closeLookModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalLook && !modalLook.classList.contains('hidden')) closeLookModal();
    });

    if (providersContainer) {
        providersContainer.innerHTML = AI_PROVIDERS.map(p => `
            <button type="button" data-provider-url="${escapeHtml(p.url)}" class="provider-btn flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-primary/10 transition-colors group">
                <img src="${escapeHtml(p.icon)}" alt="${escapeHtml(p.name)}" class="w-9 h-9 rounded-lg object-cover bg-white/5 shrink-0">
                <span class="flex-1 min-w-0">
                    <span class="block text-sm text-white font-medium group-hover:text-primary">${escapeHtml(p.name)}</span>
                    <span class="block text-[11px] text-on-surface-variant">${escapeHtml(p.kind)} generation</span>
                </span>
                <span class="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary">open_in_new</span>
            </button>
        `).join('');

        providersContainer.querySelectorAll('.provider-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.open(btn.getAttribute('data-provider-url'), '_blank', 'noopener,noreferrer');
            });
        });
    }

    let refsOpen = false;
    if (btnToggleRefs) {
        btnToggleRefs.addEventListener('click', () => {
            refsOpen = !refsOpen;
            if (refsGrid) refsGrid.style.display = refsOpen ? 'grid' : 'none';
            if (refsChevron) refsChevron.style.transform = refsOpen ? 'rotate(180deg)' : 'none';
        });
    }

    function populateRefs() {
        if (!refsSection || !refsGrid) return;

        const all = [];
        if (avatar.base_look) all.push({ name: 'Default Look', url: avatar.base_look });
        normalizeLooks(avatar.other_looks).forEach(look => all.push(look));

        if (all.length === 0) {
            refsSection.style.display = 'none';
            return;
        }

        refsSection.style.display = '';
        refsGrid.innerHTML = all.map(look => `
            <a href="${escapeHtml(look.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(look.name)}"
               class="block aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-colors">
                <img src="${escapeHtml(look.url)}" alt="${escapeHtml(look.name)}" class="w-full h-full object-cover" />
            </a>
        `).join('');
    }

    if (btnPickLookFile) {
        btnPickLookFile.addEventListener('click', async () => {
            const name = lookNameInput ? lookNameInput.value.trim() : '';
            if (modalMode === 'add' && !name) {
                await showCustomAlert('Please give this look a name first.', 'Name Required');
                return;
            }

            const file = await pickFile('image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp');
            if (!file) return;

            if (file.size > MAX_IMAGE_BYTES) {
                await showCustomAlert('That image is larger than 10 MB. Please upload a smaller file.', 'File Too Large');
                return;
            }

            setBusy(btnPickLookFile, true, 'Uploading...');
            try {
                const url = await uploadToR2(file, file.type || 'image/jpeg');
                const others = normalizeLooks(avatar.other_looks);

                if (modalMode === 'add') {
                    others.push({ name, url });
                    await persist({ other_looks: others }, 'Look added.');
                } else if (modalTargetIndex === -1) {
                    await persist({ base_look: url }, 'Default look updated.');
                } else if (others[modalTargetIndex]) {
                    others[modalTargetIndex] = { name: name || others[modalTargetIndex].name, url };
                    await persist({ other_looks: others }, 'Look updated.');
                }

                closeLookModal();
            } catch (error) {
                console.error('Error uploading look:', error);
                await showCustomAlert(`Could not upload the image: ${error.message}`, 'Error');
            } finally {
                setBusy(btnPickLookFile, false);
            }
        });
    }

    loadAvatar();
}
