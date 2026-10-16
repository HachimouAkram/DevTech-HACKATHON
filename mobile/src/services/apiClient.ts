import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter } from 'react-native';
import { getFromCache, saveToCache, enqueueOfflineDemande } from '../database/localDb';

// Dynamically retrieve the host machine's IP address from Expo's Metro bundler host URI
const getHostIp = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost') {
      return ip;
    }
  }
  return '192.168.34.27'; // Fallback to last known local IP
};

const DEFAULT_API_URL = `http://${getHostIp()}:5000/api`;


let customApiUrl: string | null = null;
let authToken: string | null = null;

export const initApiUrl = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem('@custom_api_url');
    if (savedUrl) {
      const currentHostIp = getHostIp();
      const match = savedUrl.match(/http:\/\/(\d+\.\d+\.\d+\.\d+)/);
      if (match && match[1]) {
        const savedIp = match[1];
        if (savedIp !== currentHostIp) {
          console.log(`[API] Stale IP detected in custom URL (${savedIp} vs current ${currentHostIp}). Clearing custom URL to use dynamic host IP.`);
          await AsyncStorage.removeItem('@custom_api_url');
          customApiUrl = null;
          return;
        }
      }
      customApiUrl = savedUrl;
      console.log(`[API] Loaded custom API URL from storage: ${customApiUrl}`);
    }
  } catch (err) {
    console.warn('[API] Failed to load custom API URL:', err);
  }
};

export const setCustomApiUrl = (url: string) => {
  try {
    if (!url || !url.trim()) {
      customApiUrl = null;
      AsyncStorage.removeItem('@custom_api_url').catch((err: any) => {
        console.warn('[API] Failed to clear custom API URL:', err);
      });
    } else {
      customApiUrl = url;
      AsyncStorage.setItem('@custom_api_url', url).catch((err: any) => {
        console.warn('[API] Failed to persist custom API URL:', err);
      });
    }
  } catch (err) {
    console.warn('[API] Failed to save custom API URL:', err);
  }
};

export const getApiUrl = () => {
  return customApiUrl || DEFAULT_API_URL;
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => {
  return authToken;
};

export class ApiError {
  message: string;
  status: number;
  constructor(message: string, status: number) {
    this.message = message;
    this.status = status;
  }
}

// ─── Cached network state ──────────────────────────────────────────────────────
// We maintain a single up-to-date flag instead of calling NetInfo.fetch() on
// every request (which blocks for 1-3 s when offline → UI freezes).
let cachedIsOnline: boolean = true; // optimistic default until first event

// Initialise once: get current state then listen for changes
NetInfo.fetch().then(state => {
  cachedIsOnline = !!state.isConnected;
});

NetInfo.addEventListener(state => {
  const prev = cachedIsOnline;
  cachedIsOnline = !!state.isConnected;
  if (prev !== cachedIsOnline) {
    console.log(`[Network] Status changed → ${cachedIsOnline ? 'ONLINE' : 'OFFLINE'}`);
    if (cachedIsOnline) {
      lastNetworkErrorTime = 0; // reset circuit breaker instantly when connection is back online
    }
  }
});

let lastNetworkErrorTime: number = 0;
const CIRCUIT_BREAKER_DURATION = 8000; // 8 seconds of offline simulation on network error (was 15s)

/** Instant, zero-latency offline check — uses the cached listener value and circuit breaker. */
const isCurrentlyOffline = (isSyncProcess = false) => {
  if (isSyncProcess) return false;
  
  // If hitting a local server, bypass the NetInfo offline check.
  // NetInfo checks internet reachability which might report offline even if the local network backend is accessible.
  const apiUrl = getApiUrl();
  const isLocalServer = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1') || apiUrl.includes('192.168.') || apiUrl.includes('10.');
  
  if (!isLocalServer && !cachedIsOnline) return true;
  
  // If a network error just occurred, trip the circuit breaker and serve from cache immediately
  if (Date.now() - lastNetworkErrorTime < CIRCUIT_BREAKER_DURATION) {
    console.log('[Circuit Breaker] Server unreachable. Serving from cache without attempting fetch.');
    return true;
  }
  return false;
};
// ──────────────────────────────────────────────────────────────────────────────

// Helper to strip cache-busting timestamp queries (t=...) to ensure consistent cache keys when offline
const cleanEndpointForCache = (endpoint: string) => {
  let cleaned = endpoint;
  cleaned = cleaned.replace(/[?&]t=\d+/, '');
  if (cleaned.endsWith('?')) {
    cleaned = cleaned.slice(0, -1);
  }
  cleaned = cleaned.replace(/\?&/, '?');
  cleaned = cleaned.replace(/&&/, '&');
  return cleaned;
};

const handleOfflineFallback = async (endpoint: string, method: string, bodyData: any, originalError?: any) => {
  const isOnline = cachedIsOnline;
  const targetUrl = `${getApiUrl()}${endpoint}`;
  const errorDetail = originalError?.message || String(originalError || 'Échec de la connexion réseau');

  if ((method === 'POST' || method === 'PUT') && endpoint.includes('/demandes') && !endpoint.includes('/sync')) {
    await enqueueOfflineDemande(endpoint, method, bodyData);
    return { status: 'success', data: { message: 'Demande enregistrée hors-ligne' }, offline: true };
  }
  
  if (!method || method === 'GET') {
    const cacheKey = cleanEndpointForCache(endpoint);
    const cachedData = await getFromCache('historique_cache', cacheKey);
    if (cachedData) {
      console.log(`[Resilient Offline] Serving ${cacheKey} from cache`);
      return cachedData;
    }
    if (isOnline) {
      throw new ApiError(`Serveur injoignable (${targetUrl}) : ${errorDetail}`, 503);
    }
    throw new ApiError('Aucune connexion internet et aucune donnée en cache.', 503);
  }

  if (isOnline) {
    throw new ApiError(`Action impossible. Le serveur à ${targetUrl} est injoignable (${errorDetail}).`, 503);
  }
  throw new ApiError('Action impossible hors-ligne.', 503);
};

const fetchWithTimeoutAndRetry = async (
  url: string,
  config: RequestInit,
  timeoutDuration: number,
  retries = 3,
  delay = 500
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  const activeConfig = {
    ...config,
    signal: controller.signal as any,
  };

  try {
    const response = await fetch(url, activeConfig);
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    const isTransientError = error.message && (
      error.message.includes('Network request failed') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'AbortError' ||
      error.message.includes('aborted')
    );

    if (retries > 0 && isTransientError) {
      console.log(`[API Retry] Request failed for ${url}. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await fetchWithTimeoutAndRetry(url, config, timeoutDuration, retries - 1, delay * 2);
    }
    throw error;
  }
};

interface RequestOptions extends RequestInit {
  bodyData?: any;
}

export const apiFetch = async (endpoint: string, options: RequestOptions = {}) => {
  const url = `${getApiUrl()}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  let activeToken = authToken;
  if (!activeToken) {
    try {
      activeToken = (await SecureStore.getItemAsync('auth_token')) || (await SecureStore.getItemAsync('auth_cached_token'));
    } catch (err) {
      console.warn('[apiFetch] Failed to retrieve token from storage:', err);
    }
  }

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.bodyData) {
    config.body = JSON.stringify(options.bodyData);
  }

  // ── Instant offline check (no network probe, no delay) ──
  const isSyncProcess = options.headers && (options.headers as any)['X-Sync-Process'] === 'true';
  const offline = isCurrentlyOffline(isSyncProcess);

  if (offline) {
    if (isSyncProcess) {
      throw new ApiError(`Offline during sync execution to ${url}`, 503);
    }
    const method = options.method || 'GET';
    console.log(`[Offline] Pre-intercepting ${method} ${endpoint}`);
    return await handleOfflineFallback(endpoint, method, options.bodyData);
  }

  try {
    const method = options.method || 'GET';
    const timeoutDuration = (method === 'GET') ? 15000 : 20000;
    const retries = method === 'GET' ? 0 : 2;
    const response = await fetchWithTimeoutAndRetry(url, config, timeoutDuration, retries);
    
    // If successful, reset circuit breaker and ensure we mark online
    const wasOffline = lastNetworkErrorTime > 0 || !cachedIsOnline;
    lastNetworkErrorTime = 0;
    cachedIsOnline = true;

    if (wasOffline) {
      console.log('[API] Connection restored via successful fetch! Triggering sync...');
      DeviceEventEmitter.emit('network_restored');
    }

    const responseText = await response.text();
    let data: any = null;
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        // Not a JSON response
      }
    }
    
    if (!response.ok) {
      throw new ApiError((data && data.message) || `Erreur API ${response.status} sur ${endpoint}`, response.status);
    }
    
    if (!options.method || options.method === 'GET') {
      if (endpoint === '/demandes') {
        const listCount = data?.data?.demandes?.length ?? 0;
        const totalElements = data?.data?.totalElements ?? 0;
        console.log(`[apiFetch] GET /demandes succeeded. Loaded ${listCount} demands from backend (total elements on server: ${totalElements}).`);
      }
      const cacheKey = cleanEndpointForCache(endpoint);
      await saveToCache('historique_cache', cacheKey, data || responseText);
    }

    return data;
  } catch (error: any) {
    const method = options.method || 'GET';
    
    // If it's a network/connection failure (not a managed ApiError response from the server)
    if (!(error instanceof ApiError)) {
      // Trip the circuit breaker for 8s
      lastNetworkErrorTime = Date.now();
      
      if (isSyncProcess) {
        throw new ApiError(`Échec de connexion sync vers ${url} : ${error.message || 'Réseau coupé ou timeout'}`, 503);
      }
      console.warn(`[Resilient Offline Fallback] Fetch failed for ${method} ${endpoint}. Serving from cache/queue...`);
      return await handleOfflineFallback(endpoint, method, options.bodyData, error);
    }

    console.log(`API Fetch Managed Error [${endpoint}]:`, error.message);
    throw error;
  }
};

export const apiUpload = async (
  endpoint: string, 
  fileData: { uri: string; name: string; type: string },
  options: { headers?: Record<string, string> } = {}
) => {
  const isSyncProcess = options.headers && options.headers['X-Sync-Process'] === 'true';

  // ── Instant offline check ──
  if (isCurrentlyOffline(isSyncProcess)) {
    if (isSyncProcess) {
      throw new ApiError('Offline during sync file upload', 503);
    }
    console.log(`[Offline] Deferring upload of local file: ${fileData.uri}`);
    return { status: 'success', data: { url: fileData.uri }, offline: true };
  }

  const url = `${getApiUrl()}${endpoint}`;
  
  const formData = new FormData();
  formData.append('file', {
    uri: fileData.uri,
    name: fileData.name,
    type: fileData.type,
  } as any);

  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data',
  };

  let activeToken = authToken;
  if (!activeToken) {
    try {
      activeToken = (await SecureStore.getItemAsync('auth_token')) || (await SecureStore.getItemAsync('auth_cached_token'));
    } catch (err) {}
  }

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  try {
    const response = await fetchWithTimeoutAndRetry(url, {
      method: 'POST',
      headers,
      body: formData,
    }, 15000); // 15s timeout for uploads

    // Reset circuit breaker on successful upload
    const wasOffline = lastNetworkErrorTime > 0 || !cachedIsOnline;
    lastNetworkErrorTime = 0;
    cachedIsOnline = true;

    if (wasOffline) {
      console.log('[API] Connection restored via successful upload! Triggering sync...');
      DeviceEventEmitter.emit('network_restored');
    }

    const responseText = await response.text();
    let data: any = null;
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        // Not a JSON response
      }
    }
    if (!response.ok) {
      throw new ApiError((data && data.message) || `Erreur d'upload ${response.status}`, response.status);
    }
    return data;
  } catch (error: any) {
    const isNetworkError = error.message && (
      error.message.includes('Network request failed') || 
      error.message.includes('network') || 
      error.message.includes('Failed to fetch') ||
      error.name === 'AbortError' ||
      error.message.includes('aborted')
    );
    if (isNetworkError) {
      // Trip circuit breaker on network error
      lastNetworkErrorTime = Date.now();
      if (isSyncProcess) {
        throw new ApiError(`Échec upload sync vers ${url} : ${error.message || 'Réseau coupé ou timeout'}`, 503);
      }
      console.log(`[Resilient Offline Fallback] Upload failed. Deferring upload: ${fileData.uri}`);
      return { status: 'success', data: { url: fileData.uri }, offline: true };
    }
    throw error;
  }
};
