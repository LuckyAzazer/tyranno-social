import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

// Apply saved theme hue immediately before first render to avoid flash of default color
import { applyHue, getSavedHue } from './lib/applyHue';
applyHue(getSavedHue());

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// Import handwriting fonts
import '@fontsource/caveat';
import '@fontsource/dancing-script';
import '@fontsource/pacifico';
import '@fontsource/kalam';
import '@fontsource/indie-flower';
import '@fontsource/permanent-marker';
import '@fontsource/patrick-hand-sc';

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Register Service Worker for PWA functionality.
// Skip entirely when running inside the Shakespeare preview iframe
// (*.iframe.diy) — the SW's activate/claim cycle causes the preview to
// reload in an infinite loop there.
const isPreviewIframe = window.location.hostname.endsWith('.iframe.diy');

if ('serviceWorker' in navigator && !isPreviewIframe) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered successfully:', registration.scope);
        // Check for updates every hour
        setInterval(() => registration.update(), 3_600_000);
      })
      .catch((error) => {
        console.log('[PWA] Service Worker registration failed:', error);
      });
  });
} else if (isPreviewIframe && 'serviceWorker' in navigator) {
  // In the preview, unregister any previously installed SW so it can't
  // interfere with hot-reloaded builds.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}
