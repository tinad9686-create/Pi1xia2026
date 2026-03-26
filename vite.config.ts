
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');
  
  return {
    define: {
      // Expose API_KEY to the client as process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.apiKey),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.authDomain),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.projectId),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.storageBucket),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.messagingSenderId),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.appId),
    },
    plugins: [react()],
    build: {
      target: 'esnext'
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
    },
  };
});
