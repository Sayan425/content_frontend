import { supabase } from './supabaseClient.js';

// DOM Elements
const avatarsContainer = document.getElementById('avatars-container');
const loadingState = document.getElementById('loading-state');
const btnLogout = document.getElementById('btn-logout');

const createModal = document.getElementById('create-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalContent = document.getElementById('modal-content');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const createAvatarForm = document.getElementById('create-avatar-form');
const btnSubmitModal = document.getElementById('btn-submit-modal');

let currentUser = null;

window.currentAudio = null;
window.currentAudioBtn = null;
window.currentAudioUrl = null;

const playIconHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>';
const pauseIconHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';

window.playAudio = (e, url, btnElement) => {
    e.stopPropagation();
    if (!url || url === 'undefined') {
        const textSpan = btnElement.querySelector('.preview-text');
        if (textSpan) {
            const originalText = textSpan.textContent;
            textSpan.textContent = 'No Voice Provided';
            textSpan.classList.add('text-error');
            setTimeout(() => {
                textSpan.textContent = originalText;
                textSpan.classList.remove('text-error');
            }, 2000);
        }
        return;
    }
    
    const textSpan = btnElement.querySelector('.preview-text');
    const iconSvg = btnElement.querySelector('.audio-icon');

    const resetCurrentBtn = () => {
        if (window.currentAudioBtn) {
            window.currentAudioBtn.querySelector('.preview-text').textContent = "Preview Voice";
            window.currentAudioBtn.querySelector('.audio-icon').innerHTML = playIconHTML;
        }
    };

    if (window.currentAudio && window.currentAudioUrl === url) {
        if (!window.currentAudio.paused) {
            window.currentAudio.pause();
            textSpan.textContent = "Preview Voice";
            iconSvg.innerHTML = playIconHTML;
        } else {
            window.currentAudio.play();
            textSpan.textContent = "Pause Voice";
            iconSvg.innerHTML = pauseIconHTML;
        }
        return;
    }

    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
        resetCurrentBtn();
    }

    window.currentAudioUrl = url;
    window.currentAudio = new Audio(url);
    window.currentAudioBtn = btnElement;
    textSpan.textContent = "Pause Voice";
    iconSvg.innerHTML = pauseIconHTML;
    
    window.currentAudio.play().catch(err => {
        console.error("Error playing audio:", err);
        resetCurrentBtn();
    });

    window.currentAudio.addEventListener('ended', () => {
        resetCurrentBtn();
    });
};

// Template for the "Generate New AI Avatar" button
const addAvatarHTML = `
<button id="btn-open-modal" class="group flex flex-col items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-2 transition-transform duration-300 hover:scale-105">
    <div class="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] flex items-center justify-center bg-surface/50 backdrop-blur-xl border border-white/8 text-on-surface-variant avatar-ring transition-colors duration-300 group-hover:bg-surface-container group-hover:text-primary relative overflow-hidden group-hover:shadow-[0_0_30px_rgba(208,188,255,0.3)]">
        <span class="material-symbols-outlined text-4xl font-light" style="font-variation-settings: 'wght' 300;">add</span>
        <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
    <div class="text-center max-w-[120px]">
        <div class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface-variant group-hover:text-primary transition-colors tracking-wide">Create</div>
        <div class="font-body-sm text-body-sm text-on-surface-variant mt-1 opacity-70">New AI Avatar</div>
    </div>
</button>
`;

// Initialize Page
async function init() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
        window.location.href = '/index.html'; // Redirect to login
        return;
    }
    
    currentUser = session.user;
    fetchAvatars();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('create_avatar') === 'true') {
        openModal();
    }
}

// Fetch Avatars
async function fetchAvatars() {
    try {
        const { data: avatars, error } = await supabase
            .from('avatar_details')
            .select('*')
            .eq('owner_user_id', currentUser.id);

        if (error) throw error;
        renderAvatars(avatars);
    } catch (error) {
        console.error("Error fetching avatars:", error);
        loadingState.textContent = "Error loading avatars. Check console.";
    }
}

function renderAvatars(avatars) {
    avatarsContainer.innerHTML = '';

    avatars.forEach(avatar => {
        const avatarHTML = `
        <button onclick="localStorage.setItem('activeAvatarId', '${avatar.avatar_id}'); window.location.href='/analytics'" class="group flex flex-col items-center gap-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-2 transition-transform duration-300 hover:scale-105 max-w-[200px]">
            <div class="w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] overflow-hidden border border-white/10 avatar-ring bg-surface-container-high relative shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)] group-hover:shadow-[0_20px_50px_-12px_rgba(208,188,255,0.4)] transition-all duration-500">
                <img alt="${avatar.name} Avatar" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="${avatar.base_look || 'https://via.placeholder.com/160'}" />
                <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div class="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2.5rem]"></div>
            </div>
            <div class="text-center w-full">
                <div class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface group-hover:text-primary transition-colors tracking-wide truncate px-2 text-shadow-sm">${avatar.name || 'Unnamed'}</div>
                <div class="font-body-sm text-body-sm text-on-surface-variant mt-2.5 flex items-center justify-center gap-1.5 hover:text-primary transition-colors cursor-pointer bg-white/5 hover:bg-primary/20 backdrop-blur-md rounded-full py-1.5 px-4 mx-auto w-max shadow-sm border border-white/5" onclick="playAudio(event, '${avatar.demo_voice}', this)">
                    <svg class="audio-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    <span class="preview-text font-medium tracking-wide">Preview Voice</span>
                </div>
            </div>
        </button>
        `;
        avatarsContainer.insertAdjacentHTML('beforeend', avatarHTML);
    });

    // Append the "Generate" button at the end
    avatarsContainer.insertAdjacentHTML('beforeend', addAvatarHTML);

    // Re-attach modal listener to the newly inserted button
    document.getElementById('btn-open-modal').addEventListener('click', openModal);
}

// ---- Modal Logic ----
function openModal() {
    createModal.classList.remove('hidden');
    const errCont = document.getElementById('create-avatar-error');
    const succCont = document.getElementById('create-avatar-success');
    if (errCont) errCont.classList.add('hidden');
    if (succCont) succCont.classList.add('hidden');
    // small delay for transition
    setTimeout(() => {
        modalContent.classList.remove('opacity-0', 'scale-95');
        modalContent.classList.add('opacity-100', 'scale-100');
    }, 10);
}

function closeModal() {
    modalContent.classList.remove('opacity-100', 'scale-100');
    modalContent.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        createModal.classList.add('hidden');
    }, 300);
}

modalBackdrop.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

createAvatarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errCont = document.getElementById('create-avatar-error');
    const errTxt = document.getElementById('create-avatar-error-text');
    const succCont = document.getElementById('create-avatar-success');
    const succTxt = document.getElementById('create-avatar-success-text');
    
    if (errCont) errCont.classList.add('hidden');
    if (succCont) succCont.classList.add('hidden');
    
    const name = document.getElementById('avatar-name').value;
    const imageFile = document.getElementById('avatar-image').files[0];
    const voiceFile = document.getElementById('avatar-voice').files[0];
    const voiceText = document.getElementById('avatar-voice-text').value;

    btnSubmitModal.textContent = "Creating...";
    btnSubmitModal.disabled = true;

    try {
        // 1. Get Presigned URLs from local Vite API Plugin
        const getPresignedUrl = async (file, avatarName) => {
            const res = await fetch('/api/get-r2-upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || 'application/octet-stream',
                    avatarName: avatarName,
                    userId: currentUser.id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error("Local API Error: " + (data.error || res.statusText));
            return data;
        };

        const imageUrls = await getPresignedUrl(imageFile, name);
        const voiceUrls = await getPresignedUrl(voiceFile, name);

        // 2. Upload directly to Cloudflare R2 using the Presigned URLs
        btnSubmitModal.textContent = "Uploading Image...";
        const imgUploadRes = await fetch(imageUrls.signedUrl, {
            method: 'PUT',
            body: imageFile,
            headers: { 'Content-Type': imageFile.type || 'application/octet-stream' }
        });
        if (!imgUploadRes.ok) throw new Error("Failed to upload image to Cloudflare R2");

        btnSubmitModal.textContent = "Uploading Voice...";
        const voiceUploadRes = await fetch(voiceUrls.signedUrl, {
            method: 'PUT',
            body: voiceFile,
            headers: { 'Content-Type': voiceFile.type || 'application/octet-stream' }
        });
        if (!voiceUploadRes.ok) throw new Error("Failed to upload voice to Cloudflare R2");

        // 3. Save to database
        btnSubmitModal.textContent = "Saving Avatar...";
        const { error: insertError } = await supabase.from('avatar_details').insert([{
            owner_user_id: currentUser.id,
            name: name,
            base_look: imageUrls.publicUrl,
            demo_voice: voiceUrls.publicUrl,
            other_looks: null
        }]);

        if (insertError) throw new Error("Database Insert Error: " + insertError.message);

        if (succCont) {
            succTxt.textContent = "Avatar Created Successfully!";
            succCont.classList.remove('hidden');
        }
        
        setTimeout(() => {
            closeModal();
            createAvatarForm.reset();
            fetchAvatars();
        }, 1500);
        
    } catch (error) {
        console.error(error);
        if (errCont) {
            errTxt.textContent = "Error: " + error.message;
            errCont.classList.remove('hidden');
        }
    } finally {
        btnSubmitModal.textContent = "Create";
        btnSubmitModal.disabled = false;
    }
});

// Logout
btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
});

// Run Init
init();
