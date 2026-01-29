// Environment Configuration
const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://api.metahvn.com',
  assetsUrl: import.meta.env.VITE_ASSETS_URL || 'https://metahvn.com',
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  }
};

console.log('🚀 Veridian starting...');
console.log('📍 API URL:', config.apiUrl);
console.log('🎨 Assets URL:', config.assetsUrl);
console.log('🔥 Firebase Project:', config.firebase.projectId);

// Import main application
import './app.js';

// Export config for use throughout the app
export default config;
