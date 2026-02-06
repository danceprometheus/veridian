import { supabase } from './supabase.js';

let currentUser = null;

// Initialize authentication
export async function initAuth() {
  console.log('🔐 Checking authentication...');
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    currentUser = session.user;
    console.log('✓ User authenticated:', currentUser.email);
    onAuthSuccess(currentUser);
  } else {
    console.log('⚠️ No session found, showing auth modal');
    showAuthModal();
  }
  
  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    if (session) {
      currentUser = session.user;
      onAuthSuccess(currentUser);
    }
  });
}

// Called when user is authenticated
function onAuthSuccess(user) {
  hideAuthModal();
  updateUserDisplay(user);
  hideLoadingScreen();
  
  // Dispatch event for app.js to initialize world
  window.dispatchEvent(new CustomEvent('userAuthenticated', { detail: user }));
}

// Update user display in HUD
function updateUserDisplay(user) {
  const displayEl = document.getElementById('user-display-name');
  const signOutBtn = document.getElementById('sign-out-btn');
  
  if (displayEl) {
    displayEl.textContent = user.user_metadata?.display_name || user.email || 'User';
  }
  
  if (signOutBtn) {
    signOutBtn.style.display = 'block';
    signOutBtn.onclick = signOut;
  }
}

// Show authentication modal
export function showAuthModal() {
  // Remove existing modal if present
  const existing = document.getElementById('auth-modal');
  if (existing) existing.remove();
  
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-overlay">
      <div class="auth-container">
        <h1>VERIDIAN</h1>
        <p class="subtitle">Hall of Clarity</p>
        
        <div id="auth-forms">
          <!-- Sign In Form -->
          <div id="signin-form" class="auth-form active">
            <h2>Enter the Hall</h2>
            <input type="email" id="signin-email" placeholder="Email" autocomplete="email" />
            <input type="password" id="signin-password" placeholder="Password" autocomplete="current-password" />
            <button id="signin-btn" class="btn-primary">Sign In</button>
            <p class="form-switch">
              New visitor? <a href="#" id="show-signup">Create Account</a>
            </p>
          </div>
          
          <!-- Sign Up Form -->
          <div id="signup-form" class="auth-form">
            <h2>Create Account</h2>
            <input type="text" id="signup-username" placeholder="Username" autocomplete="username" />
            <input type="email" id="signup-email" placeholder="Email" autocomplete="email" />
            <input type="password" id="signup-password" placeholder="Password" autocomplete="new-password" />
            <button id="signup-btn" class="btn-primary">Create Account</button>
            <p class="form-switch">
              Already have an account? <a href="#" id="show-signin">Sign In</a>
            </p>
          </div>
          
          <!-- Guest Mode -->
          <div class="divider">
            <span>or</span>
          </div>
          <button id="guest-btn" class="btn-secondary">Continue as Guest</button>
        </div>
        
        <div id="auth-message"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  attachAuthHandlers();
}

function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  }
}

function attachAuthHandlers() {
  // Sign In
  const signinBtn = document.getElementById('signin-btn');
  const signinEmail = document.getElementById('signin-email');
  const signinPassword = document.getElementById('signin-password');
  
  signinBtn.addEventListener('click', async () => {
    const email = signinEmail.value.trim();
    const password = signinPassword.value;
    
    if (!email || !password) {
      showAuthMessage('Please enter email and password', 'error');
      return;
    }
    
    signinBtn.disabled = true;
    signinBtn.textContent = 'Signing in...';
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      showAuthMessage(error.message, 'error');
      signinBtn.disabled = false;
      signinBtn.textContent = 'Sign In';
    } else {
      showAuthMessage('Welcome back!', 'success');
      // onAuthSuccess will be called by auth state listener
    }
  });
  
  // Sign Up
  const signupBtn = document.getElementById('signup-btn');
  const signupUsername = document.getElementById('signup-username');
  const signupEmail = document.getElementById('signup-email');
  const signupPassword = document.getElementById('signup-password');
  
  signupBtn.addEventListener('click', async () => {
    const username = signupUsername.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    
    if (!username || !email || !password) {
      showAuthMessage('Please fill in all fields', 'error');
      return;
    }
    
    if (password.length < 6) {
      showAuthMessage('Password must be at least 6 characters', 'error');
      return;
    }
    
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        }
      }
    });
    
    if (error) {
      showAuthMessage(error.message, 'error');
      signupBtn.disabled = false;
      signupBtn.textContent = 'Create Account';
    } else {
      showAuthMessage('Account created! Welcome to Veridian.', 'success');
      // onAuthSuccess will be called by auth state listener
    }
  });
  
  // Guest Mode
  const guestBtn = document.getElementById('guest-btn');
  guestBtn.addEventListener('click', async () => {
    const timestamp = Date.now();
    const guestEmail = `guest_${timestamp}@metahvn.temp`;
    const guestPassword = `guest_${Math.random().toString(36).slice(-12)}`;
    const guestUsername = `Guest${timestamp.toString().slice(-6)}`;
    
    guestBtn.disabled = true;
    guestBtn.textContent = 'Entering as guest...';
    
    const { data, error } = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPassword,
      options: {
        data: {
          username: guestUsername,
          display_name: 'Guest',
          is_guest: true,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=guest${timestamp}`
        }
      }
    });
    
    if (error) {
      showAuthMessage('Guest mode error: ' + error.message, 'error');
      guestBtn.disabled = false;
      guestBtn.textContent = 'Continue as Guest';
    } else {
      showAuthMessage('Entering Veridian...', 'success');
      // onAuthSuccess will be called by auth state listener
    }
  });
  
  // Form switching
  document.getElementById('show-signup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signin-form').classList.remove('active');
    document.getElementById('signup-form').classList.add('active');
  });
  
  document.getElementById('show-signin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signup-form').classList.remove('active');
    document.getElementById('signin-form').classList.add('active');
  });
  
  // Enter key support
  signinPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') signinBtn.click();
  });
  
  signupPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') signupBtn.click();
  });
}

function showAuthMessage(message, type) {
  const msgEl = document.getElementById('auth-message');
  msgEl.textContent = message;
  msgEl.className = `auth-message ${type}`;
  msgEl.style.display = 'block';
}

// Sign out
export async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  window.location.reload();
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => loadingScreen.remove(), 1000);
  }
}
