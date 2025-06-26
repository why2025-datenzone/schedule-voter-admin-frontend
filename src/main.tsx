// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { initializeAppConfig } from './config/appConfig.ts'; // ++ Import the initializer

// Create a client instance
const queryClient = new QueryClient();

// ++ Call the configuration initializer BEFORE any other app logic ++
initializeAppConfig();

async function enableMocking() {
  // Check if we are in a development environment (or any other condition you prefer for debug mode)
  // Vite uses import.meta.env.DEV for this.
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser'); // Adjust path if needed
    // `worker.start()` returns a Promise that resolves
    // once the Service Worker is up and ready to intercept requests.
    // 'onUnhandledRequest: 'bypass'' ensures that any requests not handled by MSW
    // are passed through to the network as usual.
    return worker.start({
      onUnhandledRequest: 'bypass', // or 'warn' or a custom function like (req) => req.url.pathname.startsWith('/api') ? console.warn(...) : undefined
      serviceWorker: {
        // Point to the DEDICATED Service Worker public asset.
        url: '/mockServiceWorker.js',
      },
    });
  }
  return Promise.resolve(); // Return a resolved promise if not mocking
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}> {/* Wrap App with QueryClientProvider */}
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
});