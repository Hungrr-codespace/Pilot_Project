import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/buttons.css';

// iOS Safari only shows :active (the press colours in styles/buttons.css) when the page listens for touches.
document.addEventListener('touchstart', () => {}, { passive: true });

// The service worker (public/sw.js) makes the site installable ("Add to home screen") and lets it open offline.
// Only in the built site: during development it would keep old files around.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
