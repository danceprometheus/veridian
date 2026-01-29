// Configuration
const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://api.metahvn.com',
  assetsUrl: import.meta.env.VITE_ASSETS_URL || 'https://metahvn.com',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  }
};

console.log('🚀 Veridian initializing...');
console.log('💾 Supabase URL:', config.supabase.url);

// Make config globally available
window.config = config;

// Import and start authentication
import { initAuth } from './auth.js';
import './app.js';

// Initialize authentication flow
initAuth();

export default config;
