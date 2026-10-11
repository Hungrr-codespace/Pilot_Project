import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/buttons.css';

// iOS Safari only shows :active (the press colours in styles/buttons.css) when the page listens for touches.
document.addEventListener('touchstart', () => {}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
