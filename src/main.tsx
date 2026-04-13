import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Enregistre le Service Worker et gère les mises à jour
const updateSW = registerSW({
    onNeedRefresh() {
          // Déclenche un événement custom que App.tsx peut écouter
      window.dispatchEvent(new CustomEvent('pwa-update-available'));
    },
    onOfflineReady() {
          console.log('App prête en mode hors-ligne');
    },
});

// Expose la fonction de mise à jour pour que le bouton dans l'App puisse l'appeler
(window as any).__updateSW = updateSW;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>StrictMode>,
  );</StrictMode>
