import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

// Intercepteur global pour inclure les cookies HttpOnly dans toutes les requêtes
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (!config) {
    config = {};
  }
  
  // Forcer l'envoi des cookies
  config.credentials = 'include';
  
  // Nettoyer le header Authorization si le composant a injecté "Bearer null" ou "Bearer undefined"
  if (config.headers) {
    if (config.headers instanceof Headers) {
      const auth = config.headers.get('Authorization');
      if (auth && (auth.includes('null') || auth.includes('undefined'))) {
        config.headers.delete('Authorization');
      }
    } else {
      const authKey = Object.keys(config.headers).find(k => k.toLowerCase() === 'authorization');
      if (authKey) {
        const authVal = String(config.headers[authKey]);
        if (authVal.includes('null') || authVal.includes('undefined')) {
          delete config.headers[authKey];
        }
      }
    }
  }
  
  return originalFetch(resource, config);
};
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
