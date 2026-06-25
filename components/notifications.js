export function showCustomAlert(message, title = 'Notice') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
        
        const modal = document.createElement('div');
        modal.className = 'bg-surface-variant/80 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl transform scale-95 transition-all duration-300 flex flex-col gap-4';
        
        modal.innerHTML = `
            <div class="flex items-center gap-3 text-white">
                <span class="material-symbols-outlined text-primary text-2xl">info</span>
                <h3 class="font-bold text-lg font-headline-sm">${title}</h3>
            </div>
            <p class="text-white/80 text-sm leading-relaxed">${message}</p>
            <div class="flex justify-end mt-2">
                <button id="alert-ok-btn" class="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-6 py-2 rounded-xl text-sm font-bold transition-colors">
                    OK
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Trigger enter animation
        void overlay.offsetWidth;
        overlay.classList.remove('opacity-0');
        modal.classList.remove('scale-95');
        
        const close = () => {
            overlay.classList.add('opacity-0');
            modal.classList.add('scale-95');
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 300);
        };
        
        modal.querySelector('#alert-ok-btn').addEventListener('click', close);
    });
}

export function showCustomConfirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
        
        const modal = document.createElement('div');
        modal.className = 'bg-surface-variant/80 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl transform scale-95 transition-all duration-300 flex flex-col gap-4';
        
        modal.innerHTML = `
            <div class="flex items-center gap-3 text-white">
                <span class="material-symbols-outlined text-secondary text-2xl">help</span>
                <h3 class="font-bold text-lg font-headline-sm">${title}</h3>
            </div>
            <p class="text-white/80 text-sm leading-relaxed">${message}</p>
            <div class="flex justify-end gap-3 mt-2">
                <button id="confirm-cancel-btn" class="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 px-5 py-2 rounded-xl text-sm font-bold transition-colors">
                    Cancel
                </button>
                <button id="confirm-ok-btn" class="bg-error/20 hover:bg-error/30 text-error border border-error/50 px-5 py-2 rounded-xl text-sm font-bold transition-colors">
                    Confirm
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Trigger enter animation
        void overlay.offsetWidth;
        overlay.classList.remove('opacity-0');
        modal.classList.remove('scale-95');
        
        const close = (result) => {
            overlay.classList.add('opacity-0');
            modal.classList.add('scale-95');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 300);
        };
        
        modal.querySelector('#confirm-cancel-btn').addEventListener('click', () => close(false));
        modal.querySelector('#confirm-ok-btn').addEventListener('click', () => close(true));
    });
}
