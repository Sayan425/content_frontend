import './style.css';
import { supabase } from './supabaseClient.js';

// Redirect if already logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    window.location.href = '/dashboard.html';
  }
});

// ---- Toast Notifications ----
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  } else if (type === 'error') {
    iconHtml = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  }

  toast.innerHTML = `
    ${iconHtml}
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 5000);
}


// ---- DOM Elements ----
const viewLogin = document.getElementById('view-login');
const viewSignup = document.getElementById('view-signup');
const viewForgot = document.getElementById('view-forgot');

const linkShowSignup = document.getElementById('link-show-signup');
const linkShowLoginFromSignup = document.getElementById('link-show-login-from-signup');
const linkForgotPassword = document.getElementById('link-forgot-password');
const linkShowLoginFromForgot = document.getElementById('link-show-login-from-forgot');

const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const btnLoginSubmit = document.getElementById('btn-login-submit');

const signupForm = document.getElementById('signup-form');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupConfirmPassword = document.getElementById('signup-confirm-password');
const btnSignupSubmit = document.getElementById('btn-signup-submit');

const forgotForm = document.getElementById('forgot-form');
const forgotEmail = document.getElementById('forgot-email');
const btnForgotSubmit = document.getElementById('btn-forgot-submit');

const googleBtn = document.getElementById('btn-google');

// ---- View Switching Logic ----
function showView(viewToShow) {
  viewLogin.classList.add('hidden');
  viewSignup.classList.add('hidden');
  viewForgot.classList.add('hidden');
  viewToShow.classList.remove('hidden');
}

linkShowSignup.addEventListener('click', (e) => {
  e.preventDefault();
  showView(viewSignup);
});

linkShowLoginFromSignup.addEventListener('click', (e) => {
  e.preventDefault();
  showView(viewLogin);
});

linkForgotPassword.addEventListener('click', (e) => {
  e.preventDefault();
  showView(viewForgot);
});

linkShowLoginFromForgot.addEventListener('click', (e) => {
  e.preventDefault();
  showView(viewLogin);
});

// ---- Supabase Auth Logic ----

// 1. Handle Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value;
  const password = loginPassword.value;
  
  const originalText = btnLoginSubmit.textContent;
  btnLoginSubmit.textContent = 'Signing In...';
  btnLoginSubmit.disabled = true;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showToast('Successfully logged in as ' + data.user.email, 'success');
    console.log('Session:', data.session);
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1000);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btnLoginSubmit.textContent = originalText;
    btnLoginSubmit.disabled = false;
  }
});

// 2. Handle Sign Up
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = signupEmail.value;
  const password = signupPassword.value;
  const confirmPassword = signupConfirmPassword.value;

  if (password !== confirmPassword) {
    showToast("Passwords do not match!", 'error');
    return;
  }

  const selectedRole = document.querySelector('input[name="signup-role"]:checked')?.value || 'creator';

  const originalText = btnSignupSubmit.textContent;
  btnSignupSubmit.textContent = 'Creating Account...';
  btnSignupSubmit.disabled = true;

  try {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { role: selectedRole }
      }
    });
    if (error) throw error;
    
    if (data?.user) {
      await supabase.from('users').update({ role: selectedRole }).eq('user_id', data.user.id);
    }

    showToast('Sign up successful! Please check your email.', 'success');
    showView(viewLogin);
    signupForm.reset();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btnSignupSubmit.textContent = originalText;
    btnSignupSubmit.disabled = false;
  }
});

// 3. Handle Forgot Password
forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = forgotEmail.value;

  const originalText = btnForgotSubmit.textContent;
  btnForgotSubmit.textContent = 'Sending...';
  btnForgotSubmit.disabled = true;

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    showToast('If an account exists, a reset link has been sent.', 'success');
    showView(viewLogin);
    forgotForm.reset();
  } catch (error) {
    // Specifically catch and beautifully display any backend errors
    if (error.message.toLowerCase().includes('user not found') || error.message.toLowerCase().includes('not found')) {
      showToast('Account not found with that email.', 'error');
    } else {
      showToast(error.message, 'error');
    }
  } finally {
    btnForgotSubmit.textContent = originalText;
    btnForgotSubmit.disabled = false;
  }
});

// 4. Handle Google OAuth
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard.html' } });
      if (error) throw error;
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

// ---- Password Visibility Toggle ----
const toggleButtons = document.querySelectorAll('.password-toggle');
toggleButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';
    
    if (isPassword) {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-off-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    } else {
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    }
  });
});
