import { supabase } from '../supabaseClient.js';
import { apiFetch } from '../utils/api-fetch.js';
import { showCustomAlert } from './notifications.js';

export function initProductionQueue() {
    // UI Elements
    const avatarContainer = document.getElementById('avatar-list-container');
    const selectScript = document.getElementById('select-saved-script');
    const customScriptInput = document.getElementById('custom-script-input');
    const customScriptLabel = document.getElementById('custom-script-label');
    const btnQueue = document.getElementById('btn-queue-generation');
    const btnAddLook = document.getElementById('btn-add-look'); // bound dynamically as btn-add-look-card
    const customVoiceoverInput = document.getElementById('custom-voiceover-input');
    const customVoiceoverFilename = document.getElementById('custom-voiceover-filename');
    const btnClearVoiceover = document.getElementById('btn-clear-voiceover');

    const modalVoiceoverIntent = document.getElementById('modal-voiceover-intent');
    const btnCloseVoiceoverIntent = document.getElementById('btn-close-voiceover-intent');
    const btnVoIntentExisting = document.getElementById('btn-vo-intent-existing');
    const btnVoIntentNew = document.getElementById('btn-vo-intent-new');
    const btnVoIntentBack = document.getElementById('btn-vo-intent-back');
    const btnVoIntentConfirm = document.getElementById('btn-vo-intent-confirm');
    const voiceoverIntentStep1 = document.getElementById('voiceover-intent-step-1');
    const voiceoverIntentStep2 = document.getElementById('voiceover-intent-step-2');
    const voiceoverIntentStep3 = document.getElementById('voiceover-intent-step-3');
    const modalSelectSavedScript = document.getElementById('modal-select-saved-script');
    const btnVoIntentBackExisting = document.getElementById('btn-vo-intent-back-existing');
    const btnVoIntentConfirmExisting = document.getElementById('btn-vo-intent-confirm-existing');
    
    let isVoiceoverFromScratch = false;

    // Settings Elements
    const settingTemplate = document.getElementById('setting-template');
    const settingSubtitle = document.getElementById('setting-subtitle');

    // State
    let selectedAvatarId = null;
    let selectedAvatarName = null;
    let selectedAvatarImage = null; // For runpod_queue image_link
    let selectedAvatarVoice = null; // For runpod_queue voice_link
    let selectedAvatarDemoAudioScript = null; // For runpod_queue demo_audio_script

    // Input Validation to enable/disable queue button
    function validateForm() {
        const hasAvatar = selectedAvatarId !== null;
        const hasScript = selectScript.value !== '';
        
        if (hasAvatar && hasScript) {
            btnQueue.classList.remove('opacity-50', 'cursor-not-allowed', 'shadow-none');
        } else {
            btnQueue.classList.add('opacity-50', 'cursor-not-allowed', 'shadow-none');
        }
    }

    const btnEditScriptLink = document.getElementById('btn-edit-script-link');

    if (selectScript) selectScript.addEventListener('change', () => {
        if (selectScript.value !== '') {
            // Fill the custom text area with the selected script so they can view it
            const selectedOption = selectScript.options[selectScript.selectedIndex];
            customScriptInput.value = selectedOption.dataset.scriptText || '';
            
            if (selectScript.value === 'custom_vo_scratch') {
                customScriptInput.removeAttribute('readonly');
                customScriptInput.classList.remove('cursor-not-allowed');
                customScriptInput.classList.add('focus:border-primary', 'focus:ring-1', 'focus:ring-primary');
                if (btnEditScriptLink) btnEditScriptLink.classList.add('hidden');
            } else {
                customScriptInput.setAttribute('readonly', 'true');
                customScriptInput.classList.add('cursor-not-allowed');
                customScriptInput.classList.remove('focus:border-primary', 'focus:ring-1', 'focus:ring-primary');
                if (btnEditScriptLink) {
                    btnEditScriptLink.href = `/script-room?edit=${selectScript.value}`;
                    btnEditScriptLink.classList.remove('hidden');
                }
            }
        } else {
            customScriptInput.value = '';
            if (btnEditScriptLink) {
                btnEditScriptLink.classList.add('hidden');
            }
        }
        validateForm();
    });

    const settingBRollAnimation = document.getElementById('setting-b-roll-animation');
    const settingTimeBetweenOverlays = document.getElementById('setting-time-between-overlays');
    const toggleCharacterInCover = document.getElementById('toggle-character-in-cover');
    const settingCreativeDirection = document.getElementById('setting-creative-direction');
    const settingCoverDirection = document.getElementById('setting-cover-direction');

    // Handle URL parameters for direct actions
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'upload_voiceover') {
        // We cannot programmatically click a file input asynchronously due to browser security.
        // We create a fullscreen overlay to capture a user click.
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer';
        overlay.innerHTML = `
            <div class="text-center flex flex-col items-center">
                <div class="w-24 h-24 rounded-full bg-[#4cd7f6]/20 flex items-center justify-center mb-6 animate-pulse">
                    <span class="material-symbols-outlined text-[48px] text-[#4cd7f6]">mic_external_on</span>
                </div>
                <h2 class="text-3xl font-bold text-white mb-3">Upload Your Voiceover</h2>
                <p class="text-white/70 text-lg">Click anywhere to select your audio file</p>
            </div>
        `;
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', () => {
            if (customVoiceoverInput) customVoiceoverInput.click();
            overlay.remove();
        });
    }

    const modalTransparentWarning = document.getElementById('modal-transparent-warning');
    const btnCloseTransparentWarning = document.getElementById('btn-close-transparent-warning');

    function openVoModal() {
        if (!modalVoiceoverIntent) {
            showCustomAlert("Error: Modal element not found in DOM!", "Error");
            return;
        }
        
        // Move to body to avoid stacking context issues
        if (modalVoiceoverIntent.parentElement !== document.body) {
            document.body.appendChild(modalVoiceoverIntent);
        }

        modalVoiceoverIntent.classList.remove('hidden');
        modalVoiceoverIntent.style.display = 'block';
        modalVoiceoverIntent.style.zIndex = '9999';
        
        void modalVoiceoverIntent.offsetWidth;
        
        modalVoiceoverIntent.classList.remove('opacity-0');
        modalVoiceoverIntent.classList.add('opacity-100');
        modalVoiceoverIntent.style.opacity = '1';
        
        if (voiceoverIntentStep1) {
            voiceoverIntentStep1.classList.remove('hidden');
            voiceoverIntentStep1.style.display = 'flex';
        }
        if (voiceoverIntentStep2) {
            voiceoverIntentStep2.classList.add('hidden');
            voiceoverIntentStep2.style.display = 'none';
        }
        if (voiceoverIntentStep3) {
            voiceoverIntentStep3.classList.add('hidden');
            voiceoverIntentStep3.style.display = 'none';
        }
    }

    function closeVoModal() {
        if (!modalVoiceoverIntent) return;
        
        modalVoiceoverIntent.classList.remove('opacity-100');
        modalVoiceoverIntent.style.opacity = '0';
        modalVoiceoverIntent.classList.add('opacity-0');
        
        setTimeout(() => {
            modalVoiceoverIntent.classList.add('hidden');
            modalVoiceoverIntent.style.display = 'none';
        }, 300);
    }

    if (btnCloseVoiceoverIntent) {
        btnCloseVoiceoverIntent.addEventListener('click', () => {
            closeVoModal();
            if (btnClearVoiceover) btnClearVoiceover.click(); // Clear selection on cancel
        });
    }

    if (btnVoIntentExisting) {
        btnVoIntentExisting.addEventListener('click', () => {
            isVoiceoverFromScratch = false;
            if (voiceoverIntentStep1) {
                voiceoverIntentStep1.classList.add('hidden');
                voiceoverIntentStep1.style.display = 'none';
            }
            if (voiceoverIntentStep3) {
                voiceoverIntentStep3.classList.remove('hidden');
                voiceoverIntentStep3.style.display = 'flex';
            }
        });
    }

    if (btnVoIntentNew) {
        btnVoIntentNew.addEventListener('click', () => {
            isVoiceoverFromScratch = true;
            if (voiceoverIntentStep1) {
                voiceoverIntentStep1.classList.add('hidden');
                voiceoverIntentStep1.style.display = 'none';
            }
            if (voiceoverIntentStep2) {
                voiceoverIntentStep2.classList.remove('hidden');
                voiceoverIntentStep2.style.display = 'flex';
            }
        });
    }

    if (btnVoIntentBack) {
        btnVoIntentBack.addEventListener('click', () => {
            if (voiceoverIntentStep2) {
                voiceoverIntentStep2.classList.add('hidden');
                voiceoverIntentStep2.style.display = 'none';
            }
            if (voiceoverIntentStep1) {
                voiceoverIntentStep1.classList.remove('hidden');
                voiceoverIntentStep1.style.display = 'flex';
            }
        });
    }

    if (btnVoIntentBackExisting) {
        btnVoIntentBackExisting.addEventListener('click', () => {
            if (voiceoverIntentStep3) {
                voiceoverIntentStep3.classList.add('hidden');
                voiceoverIntentStep3.style.display = 'none';
            }
            if (voiceoverIntentStep1) {
                voiceoverIntentStep1.classList.remove('hidden');
                voiceoverIntentStep1.style.display = 'flex';
            }
        });
    }

    if (btnVoIntentConfirmExisting) {
        btnVoIntentConfirmExisting.addEventListener('click', () => {
            if (!modalSelectSavedScript || !modalSelectSavedScript.value) {
                showCustomAlert("Please select a script from the list.", "Error");
                return;
            }
            
            const scriptSelect = document.getElementById('select-saved-script');
            if (scriptSelect) {
                scriptSelect.value = modalSelectSavedScript.value;
                scriptSelect.dispatchEvent(new Event('change'));
            }
            
            closeVoModal();
        });
    }

    if (btnVoIntentConfirm) {
        btnVoIntentConfirm.addEventListener('click', () => {
            const topic = document.getElementById('vo-new-topic')?.value?.trim();
            if (!topic) {
                showCustomAlert("Please provide a Video Topic.", "Error");
                return;
            }
            closeVoModal();
            
            // Disable the dropdown because they are using a custom from-scratch voiceover
            const scriptSelect = document.getElementById('select-saved-script');
            if (scriptSelect) {
                scriptSelect.disabled = true;
                scriptSelect.classList.add('opacity-50', 'cursor-not-allowed');
                scriptSelect.title = "Disabled because you are using a custom voiceover from scratch.";
                
                let customOption = Array.from(scriptSelect.options).find(opt => opt.value === 'custom_vo_scratch');
                if (!customOption) {
                    customOption = document.createElement('option');
                    customOption.value = 'custom_vo_scratch';
                    scriptSelect.appendChild(customOption);
                }
                customOption.textContent = topic; // Show the custom topic
                
                const scriptText = document.getElementById('vo-new-script')?.value?.trim() || "";
                customOption.dataset.scriptText = scriptText; // Store script text
                
                scriptSelect.value = 'custom_vo_scratch';
                
                // Put script into the preview box
                const customScriptInput = document.getElementById('custom-script-input');
                if (customScriptInput) customScriptInput.value = scriptText;
                
                scriptSelect.dispatchEvent(new Event('change'));
            }
        });
    }

    if (customVoiceoverInput) {
        customVoiceoverInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate type
            if (!file.type.includes('mpeg') && !file.type.includes('mp3') && !file.name.toLowerCase().endsWith('.mp3')) {
                showCustomAlert("Only .mp3 files are allowed for custom voiceovers.", "Error");
                customVoiceoverInput.value = '';
                return;
            }

            // Validate size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                showCustomAlert("File size must be under 10MB.", "Error");
                customVoiceoverInput.value = '';
                return;
            }

            customVoiceoverFilename.innerText = file.name;
            customVoiceoverFilename.classList.remove('text-white/80');
            customVoiceoverFilename.classList.add('text-primary');
            btnClearVoiceover.classList.remove('hidden');
            
            openVoModal();
        });
    }

    if (btnClearVoiceover) {
        btnClearVoiceover.addEventListener('click', (e) => {
            if(e) e.preventDefault();
            customVoiceoverInput.value = '';
            customVoiceoverFilename.innerText = 'Upload Voiceover';
            customVoiceoverFilename.classList.remove('text-primary');
            customVoiceoverFilename.classList.add('text-white/80');
            btnClearVoiceover.classList.add('hidden');
            
            isVoiceoverFromScratch = false;
            const topicEl = document.getElementById('vo-new-topic');
            const scriptEl = document.getElementById('vo-new-script');
            if (topicEl) topicEl.value = '';
            if (scriptEl) scriptEl.value = '';

            const scriptSelect = document.getElementById('select-saved-script');
            if (scriptSelect) {
                scriptSelect.disabled = false;
                scriptSelect.classList.remove('opacity-50', 'cursor-not-allowed');
                scriptSelect.title = "";
                
                const customOption = Array.from(scriptSelect.options).find(opt => opt.value === 'custom_vo_scratch');
                if (customOption) {
                    customOption.remove();
                    if (scriptSelect.value === 'custom_vo_scratch') {
                        scriptSelect.value = '';
                        scriptSelect.dispatchEvent(new Event('change'));
                    }
                }
            }
        });
    }

    if (settingTemplate) {
        settingTemplate.addEventListener('change', (e) => {
            if (e.target.value === 'TransparentTemplate') {
                if (modalTransparentWarning) {
                    modalTransparentWarning.classList.remove('hidden');
                    void modalTransparentWarning.offsetWidth; // Trigger reflow
                    modalTransparentWarning.classList.remove('opacity-0');
                    modalTransparentWarning.classList.add('opacity-100');
                }
            }
        });
    }

    if (btnCloseTransparentWarning) {
        btnCloseTransparentWarning.addEventListener('click', () => {
            if (modalTransparentWarning) {
                modalTransparentWarning.classList.remove('opacity-100');
                modalTransparentWarning.classList.add('opacity-0');
                setTimeout(() => {
                    modalTransparentWarning.classList.add('hidden');
                }, 300);
            }
        });
    }

    // Add Look Button & Modal Logic (AI Provider + Reference Images)
    const modalAddLook = document.getElementById('modal-add-look');
    const addLookBackdrop = document.getElementById('add-look-backdrop');
    const addLookProvidersContainer = document.getElementById('add-look-providers');
    const addLookRefsSection = document.getElementById('add-look-refs-section');
    const addLookRefsGrid = document.getElementById('add-look-refs-grid');
    const btnToggleLookRefs = document.getElementById('btn-toggle-look-refs');
    const lookRefsChevron = document.getElementById('look-refs-chevron');

    const AI_PROVIDERS = [
        { name: 'ChatGPT', kind: 'Image', icon: 'https://assets.youravatarstudio.com/icons/ChatGPT%20logo.svg', url: 'https://chatgpt.com/' },
        { name: 'Google Flow', kind: 'Image & Video', icon: 'https://assets.youravatarstudio.com/icons/google%20flow%20logo.png', url: 'https://labs.google/flow/' },
        { name: 'Higgsfield', kind: 'Video', icon: 'https://assets.youravatarstudio.com/icons/higgsfield%20icon.jpg', url: 'https://higgsfield.ai/' },
        { name: 'Midjourney', kind: 'Image', icon: 'https://assets.youravatarstudio.com/icons/midjourney%20icon.webp', url: 'https://www.midjourney.com/' },
        { name: 'Leonardo AI', kind: 'Image', icon: 'https://assets.youravatarstudio.com/icons/leonardo%20ai%20icon.jpg', url: 'https://leonardo.ai/' },
        { name: 'Runway', kind: 'Video', icon: 'https://assets.youravatarstudio.com/icons/runway%20ml%20icon.png', url: 'https://runwayml.com/' },
    ];

    if (addLookProvidersContainer) {
        addLookProvidersContainer.innerHTML = AI_PROVIDERS.map(p => `
            <button onclick="window.open('${p.url}', '_blank', 'noopener,noreferrer')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-primary/10 transition-colors group">
                <img src="${p.icon}" alt="${p.name}" class="w-9 h-9 rounded-lg object-cover bg-white/5 shrink-0">
                <span class="flex-1 min-w-0">
                    <span class="block text-sm text-white font-medium group-hover:text-primary">${p.name}</span>
                    <span class="block text-[11px] text-on-surface-variant">${p.kind} generation</span>
                </span>
                <span class="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary">open_in_new</span>
            </button>
        `).join('');
    }

    let lookRefsOpen = false;

    if (btnToggleLookRefs) {
        btnToggleLookRefs.addEventListener('click', () => {
            lookRefsOpen = !lookRefsOpen;
            addLookRefsGrid.style.display = lookRefsOpen ? 'grid' : 'none';
            lookRefsChevron.style.transform = lookRefsOpen ? 'rotate(180deg)' : 'none';
        });
    }

    function escAttr(str) {
        return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function openAddLookModal() {
        if (!modalAddLook) return;

        // Populate reference images from the currently loaded avatar
        const currentAvatarId = localStorage.getItem('activeAvatarId');
        if (currentAvatarId && addLookRefsSection && addLookRefsGrid) {
            supabase.from('avatar_details')
                .select('name, base_look, other_looks')
                .eq('avatar_id', currentAvatarId)
                .single()
                .then(({ data }) => {
                    if (!data) { addLookRefsSection.style.display = 'none'; return; }
                    const allLooks = [];
                    if (data.base_look) allLooks.push({ name: 'Default Look', url: data.base_look });
                    if (Array.isArray(data.other_looks)) {
                        data.other_looks.forEach((look, idx) => {
                            const url = look.image_url || look.image || look.url || look.link || look.look;
                            if (url) allLooks.push({ name: look.name || `Look ${idx + 1}`, url });
                        });
                    }
                    if (allLooks.length === 0) { addLookRefsSection.style.display = 'none'; return; }
                    addLookRefsSection.style.display = '';
                    addLookRefsGrid.innerHTML = '';
                    allLooks.forEach(look => {
                        const btn = document.createElement('button');
                        btn.className = 'group flex flex-col items-center gap-1';
                        btn.title = look.name;
                        btn.addEventListener('click', () => window.open(look.url, '_blank', 'noopener,noreferrer'));
                        btn.innerHTML = `
                            <div class="relative w-full aspect-square rounded-lg overflow-hidden border border-white/10 group-hover:border-primary/50 transition-all">
                                <img src="${escAttr(look.url)}" alt="${escAttr(look.name)}" class="w-full h-full object-cover" loading="lazy">
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                    <span class="material-symbols-outlined text-white text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                                </div>
                            </div>
                            <span class="text-[10px] text-on-surface-variant truncate w-full text-center">${escAttr(look.name)}</span>
                        `;
                        addLookRefsGrid.appendChild(btn);
                    });
                });
        }

        lookRefsOpen = false;
        if (addLookRefsGrid) addLookRefsGrid.style.display = 'none';
        if (lookRefsChevron) lookRefsChevron.style.transform = 'none';

        modalAddLook.classList.remove('hidden');
        void modalAddLook.offsetWidth;
        modalAddLook.classList.remove('opacity-0');
        modalAddLook.classList.add('opacity-100');
    }

    function closeAddLookModal() {
        if (!modalAddLook) return;
        modalAddLook.classList.remove('opacity-100');
        modalAddLook.classList.add('opacity-0');
        setTimeout(() => { modalAddLook.classList.add('hidden'); }, 300);
    }

    if (btnAddLook) {
        btnAddLook.addEventListener('click', openAddLookModal);
    }
    if (addLookBackdrop) {
        addLookBackdrop.addEventListener('click', closeAddLookModal);
    }
    const btnCloseAddLook = document.getElementById('btn-close-add-look');
    if (btnCloseAddLook) {
        btnCloseAddLook.addEventListener('click', closeAddLookModal);
    }

    // Load Data
    async function loadData() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            
            if (!userId) {
                console.error("User not authenticated.");
                return;
            }

            // 1. Fetch Selected Avatar
            const currentAvatarId = localStorage.getItem('activeAvatarId');

            if (!currentAvatarId) {
                if (avatarContainer) {
                    avatarContainer.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-6 text-center w-full">
                            <span class="material-symbols-outlined text-white/20 text-3xl mb-2">face</span>
                            <p class="text-sm text-on-surface-variant">Please select an Avatar from the top-left menu first.</p>
                        </div>
                    `;
                }
            } else {
                const { data: avatar, error: avatarError } = await supabase
                    .from('avatar_details')
                    .select('*')
                    .eq('avatar_id', currentAvatarId)
                    .single();

                if (avatarError) throw avatarError;

                if (avatarContainer) {
                    let html = '';
                    
                    const renderCard = (imgUrl, lookName, voiceId, id, avatarName, demoAudioScript) => `
                        <div class="avatar-card cursor-pointer flex-shrink-0 w-[120px] rounded-xl border-2 border-white/10 bg-black/40 overflow-hidden group hover:border-white/30 hover:bg-black/60 transition-all duration-300 flex flex-col relative" 
                            data-id="${id}"
                            data-name="${lookName}"
                            data-avatar-name="${avatarName}"
                            data-img="${imgUrl}"
                            data-voice="${voiceId || ''}"
                            data-demo-audio-script="${demoAudioScript || ''}">
                            
                            <div class="w-full h-[120px] relative overflow-hidden">
                                <img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="${lookName}">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                                
                                <!-- Premium Selected Checkmark Logo -->
                                <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-inverse-primary flex items-center justify-center opacity-0 group-[.selected]:opacity-100 scale-50 group-[.selected]:scale-100 transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.8)] border border-white/20 z-20">
                                    <span class="material-symbols-outlined text-white text-[14px] font-bold">check</span>
                                </div>
                            </div>
                            
                            <div class="p-2 text-center flex-1 flex items-center justify-center bg-black/40 group-[.selected]:bg-inverse-primary/20 transition-colors duration-300">
                                <p class="text-xs font-medium text-white/90 truncate w-full group-[.selected]:text-white group-[.selected]:font-bold transition-colors">${lookName}</p>
                            </div>
                        </div>
                    `;

                    // Add Look Card
                    const renderAddLook = () => `
                        <button id="btn-add-look-card" class="cursor-pointer flex-shrink-0 w-[120px] rounded-xl border border-dashed border-white/30 bg-white/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 flex flex-col relative items-center justify-center group h-[155px]">
                            <div class="w-12 h-12 rounded-full bg-white/10 group-hover:bg-primary/20 flex items-center justify-center mb-2 transition-colors">
                                <span class="material-symbols-outlined text-white/70 group-hover:text-primary text-[24px]">add</span>
                            </div>
                            <span class="text-xs font-medium text-white/70 group-hover:text-primary transition-colors">Add Look</span>
                        </button>
                    `;

                    // Base Look
                    const baseImg = avatar.base_look || 'https://via.placeholder.com/150';
                    const mainAvatarName = avatar.name || 'Unnamed';
                    html += renderCard(baseImg, 'Default Look', avatar.demo_voice, avatar.avatar_id, mainAvatarName, avatar.demo_audio_script);

                    // Other Looks (assumed to be array of objects: { name, image_url })
                    if (avatar.other_looks && Array.isArray(avatar.other_looks)) {
                        console.log("Loaded other_looks:", avatar.other_looks); // Debugging log
                        avatar.other_looks.forEach((look, idx) => {
                            // Check all common keys for the image URL
                            const lookImg = look.image_url || look.image || look.img || look.url || look.link || look.link || look.look || look.base_look || 'https://placehold.co/150x150/131313/FFF?text=No+Image';
                            const lookName = look.name || `Look ${idx + 1}`;
                            html += renderCard(lookImg, lookName, avatar.demo_voice, avatar.avatar_id, mainAvatarName, avatar.demo_audio_script);
                        });
                    }

                    html += renderAddLook();
                    avatarContainer.innerHTML = html;

                    // Re-bind Add Look button
                    const btnAddLookCard = document.getElementById('btn-add-look-card');
                    if (btnAddLookCard) {
                        btnAddLookCard.addEventListener('click', openAddLookModal);
                    }

                    // Add click listeners to cards
                    const cards = avatarContainer.querySelectorAll('.avatar-card');
                    cards.forEach(card => {
                        card.addEventListener('click', () => {
                            const isSelected = card.classList.contains('selected');

                            // Deselect all
                            cards.forEach(c => {
                                c.classList.remove('selected', 'border-inverse-primary', 'shadow-[0_0_15px_rgba(109,59,215,0.4)]');
                                c.classList.add('border-white/10');
                            });
                            
                            if (isSelected) {
                                // If it was already selected, it is now deselected
                                selectedAvatarId = null;
                                selectedAvatarName = null;
                                selectedAvatarImage = null;
                                selectedAvatarVoice = null;
                                selectedAvatarDemoAudioScript = null;
                            } else {
                                // Select this one
                                card.classList.remove('border-white/10');
                                card.classList.add('selected', 'border-inverse-primary', 'shadow-[0_0_15px_rgba(109,59,215,0.4)]');
                                
                                selectedAvatarId = card.dataset.id;
                                selectedAvatarName = card.dataset.avatarName || card.dataset.name;
                                selectedAvatarImage = card.dataset.img;
                                selectedAvatarVoice = card.dataset.voice;
                                selectedAvatarDemoAudioScript = card.dataset.demoAudioScript || '';
                            }
                            
                            validateForm();
                        });
                    });
                }
            }

            // 2. Fetch Scripts
            let scriptQuery = supabase
                .from('scripts_final')
                .select(`
                    *,
                    content_pipeline!inner (
                        current_stage
                    )
                `)
                .eq('owner_user_id', userId)
                .eq('status', 'approved')
                .eq('content_pipeline.current_stage', 'script')
                .order('created_at', { ascending: false });

            if (currentAvatarId) {
                scriptQuery = scriptQuery.eq('owner_avatar_id', currentAvatarId);
            }

            const { data: scripts, error: scriptsError } = await scriptQuery;

            if (scriptsError) throw scriptsError;

            if (selectScript) {
                if (scripts && scripts.length > 0) {
                    scripts.forEach(script => {
                        const topic = script.topic || 'Untitled Script';
                        const option = document.createElement('option');
                        option.value = script.content_id;
                        option.textContent = topic;
                        // Storing the actual text so we can push it to the queue
                        option.dataset.scriptText = script.final_script || script.full_script || script.script || script.script_text || script.content || '';
                        
                        selectScript.appendChild(option);
                        
                        if (modalSelectSavedScript) {
                            const modalOption = option.cloneNode(true);
                            modalSelectSavedScript.appendChild(modalOption);
                        }
                    });
                }
                
                // Auto-select script if passed in URL
                const urlParams = new URLSearchParams(window.location.search);
                const startScriptId = urlParams.get('start_script');
                if (startScriptId) {
                    setTimeout(() => {
                        selectScript.value = startScriptId;
                        selectScript.dispatchEvent(new Event('change'));
                        showCustomAlert("Your script has been loaded. Select your avatar, edit settings, and submit to production.", "Success");
                    }, 100);
                }
            }

        } catch (error) {
            console.error('Error loading data for RunPod Queue:', error);
            if (avatarContainer) {
                avatarContainer.innerHTML = `<p class="text-error text-sm p-4">Error loading data.</p>`;
            }
        }
    }

    loadData();

    // Handle Submission
    if (btnQueue) {
        btnQueue.addEventListener('click', async () => {
            const hasAvatar = selectedAvatarId !== null;
            const hasScript = selectScript.value !== '';
            
            if (!hasAvatar || !hasScript) {
                showCustomAlert("You have not selected an avatar look, or you have not selected a script to continue.", "Error");
                return;
            }

            try {
                btnQueue.classList.add('opacity-50', 'cursor-not-allowed', 'shadow-none');
                btnQueue.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Queuing...`;

                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                let finalScriptText = customScriptInput.value.trim();
                let selectedScriptId = selectScript.value;

                // Simple sanitization to remove < and >
                finalScriptText = finalScriptText.replace(/[<>]/g, '');
                
                // If custom input is empty but they selected a script (shouldn't happen with autofill, but just in case)
                if (selectedScriptId && !finalScriptText) {
                    const selectedOption = selectScript.options[selectScript.selectedIndex];
                    finalScriptText = selectedOption.dataset.scriptText;
                    finalScriptText = finalScriptText.replace(/[<>]/g, '');
                }

                // Collect Overlay options
                const overlayOptions = [];
                document.querySelectorAll('.edit-with-checkbox:checked').forEach(cb => {
                    overlayOptions.push(cb.value);
                });

                // Construct Edit Settings payload (JSONB)
                const editSettingsPayload = {
                    templateId: settingTemplate.value,
                    subtitleStyle: settingSubtitle.value,
                    overlays: overlayOptions,
                    "b-roll-animation": settingBRollAnimation?.value || 'none',
                    timeBetweenOverlays: parseInt(settingTimeBetweenOverlays?.value) || 5,
                    includeCharacterInCoverImage: toggleCharacterInCover?.checked ?? true,
                    creativeDirection: settingCreativeDirection?.value?.trim() || '',
                    coverDirection: settingCoverDirection?.value?.trim() || ''
                };

                // Check production approval settings
                let needsApproval = false;
                let approverUserId = null;
                if (selectedAvatarId) {
                    const { data: avatarData } = await supabase
                        .from('avatar_details')
                        .select('approver_user_id, approval_settings')
                        .eq('avatar_id', selectedAvatarId)
                        .single();
                    if (avatarData) {
                        approverUserId = avatarData.approver_user_id;
                        if (approverUserId && avatarData.approval_settings && String(avatarData.approval_settings.production) === 'true') {
                            needsApproval = true;
                        }
                    }
                }

                if (!selectedAvatarId) {
                    throw new Error("Please select an Avatar Look first.");
                }

                // Ensure a content_id exists
                let finalContentId = selectedScriptId;

                if (isVoiceoverFromScratch) {
                    const voTopic = document.getElementById('vo-new-topic')?.value?.trim();
                    const voScript = document.getElementById('vo-new-script')?.value?.trim() || "";
                    if (!voTopic) {
                        throw new Error("You must provide a Video Topic for your custom voiceover.");
                    }
                    
                    finalContentId = crypto.randomUUID();
                    finalScriptText = voScript;

                    btnQueue.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Creating Pipeline Data...`;
                    
                    // Create Content Pipeline row
                    const { error: cpError } = await supabase.from('content_pipeline').insert({
                        content_id: finalContentId,
                        owner_user_id: userId,
                        owner_avatar_id: selectedAvatarId,
                        approver_user_id: approverUserId,
                        current_stage: 'production',
                        approval_status: needsApproval ? 'pending' : (approverUserId ? 'approved' : null),
                        topic: voTopic, // Insert topic directly here!
                        stage_updated_at: new Date()
                    });
                    if (cpError) throw new Error("Failed to create pipeline entry: " + cpError.message);
                } else if (!finalContentId) {
                    throw new Error("Please select an approved script first.");
                }

                // Upload Custom Voiceover if provided
                let customVoiceoverUrl = null;
                const audioFile = customVoiceoverInput?.files[0];
                if (audioFile) {
                    btnQueue.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Uploading Audio...`;
                    
                    // Format required path: {avatarName}_Videos/{content_id}/custom_voiceover/{file_name} inside the video-folder bucket
                    const safeAvatarName = (selectedAvatarName || 'Unnamed').replace(/[^a-zA-Z0-9_-]/g, '_');
                    const customPath = `${safeAvatarName}_Videos/${finalContentId}/custom_voiceover/`;

                    const res = await apiFetch('/api/get-r2-upload-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileName: audioFile.name,
                            contentType: audioFile.type || 'audio/mpeg',
                            customPath: customPath,
                            customBucket: 'video-folder',
                            customPublicUrlBase: 'https://videos.youravatarstudio.com'
                        })
                    });
                    
                    const data = await res.json();
                    if (!res.ok) throw new Error("Local API Error generating upload URL: " + (data.error || res.statusText));

                    const uploadRes = await fetch(data.signedUrl, {
                        method: 'PUT',
                        body: audioFile,
                        headers: { 'Content-Type': audioFile.type || 'audio/mpeg' }
                    });

                    if (!uploadRes.ok) throw new Error("Failed to upload audio to Cloudflare R2");
                    customVoiceoverUrl = data.publicUrl;
                    
                    btnQueue.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Queuing...`;
                }

                if (!isVoiceoverFromScratch) {
                    // Update the existing content pipeline to 'production'
                    await supabase.from('content_pipeline')
                        .update({ 
                            current_stage: 'production', 
                            approval_status: needsApproval ? 'pending' : (approverUserId ? 'approved' : null),
                            stage_updated_at: new Date() 
                        })
                        .eq('content_id', finalContentId);

                    // Archive the script in scripts_final
                    await supabase.from('scripts_final')
                        .update({ status: 'archived' })
                        .eq('content_id', finalContentId);
                }

                // Insert into production_queue
                const { error } = await supabase
                    .from('production_queue')
                    .insert({
                        image_link: selectedAvatarImage || 'https://example.com/missing.png',
                        demo_voice: selectedAvatarVoice || 'elevenlabs_default',
                        script: finalScriptText,
                        demo_audio_script: selectedAvatarDemoAudioScript || '',
                        status: needsApproval ? 'pending_approval' : 'approved',
                        edit_settings: editSettingsPayload,
                        owner_avatar_id: selectedAvatarId,
                        content_id: finalContentId,
                        voiceover: customVoiceoverUrl,
                        segment_index: 1,
                        owner_user_id: userId
                    });

                if (error) throw error;

                // Success
                await showCustomAlert("Task has been added to the production queue.", 'Success');
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error("Error queuing job:", error);
                await showCustomAlert("Failed to queue video generation: " + error.message, 'Error');
                btnQueue.innerHTML = `<span class="material-symbols-outlined text-[18px]">error</span> Error`;
                setTimeout(() => {
                    btnQueue.innerHTML = `<span class="material-symbols-outlined text-[18px]">send</span> Send to Production Queue`;
                    validateForm();
                }, 2000);
            }
        });
    }
}
