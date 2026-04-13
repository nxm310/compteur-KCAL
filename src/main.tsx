import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('App prête hors-ligne');
  },
});

(window as any).__updateSW = updateSW;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

