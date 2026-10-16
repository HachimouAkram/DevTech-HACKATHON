import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { getPendingSyncDemandes, markDemandeSyncStatus, getPendingUserActions, markUserActionSynced, addSyncedDemandeToCache, updateSyncedDemandeInCache } from '../database/localDb';
import { apiFetch, apiUpload, getAuthToken } from '../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, DeviceEventEmitter } from 'react-native';

const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  const status = error.status;
  
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }
  
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('aborted') ||
    msg.includes('timeout') ||
    msg.includes('unreachable') ||
    msg.includes('network') ||
    msg.includes('connection refused') ||
    msg.includes('timed out')
  );
};

const uploadOfflineFile = async (localUri: string): Promise<string> => {
  if (!localUri || typeof localUri !== 'string') return localUri;
  
  // Return early if the URI is a remote URL or already uploaded path
  if (
    localUri.startsWith('http://') || 
    localUri.startsWith('https://') || 
    localUri.includes('/uploads/') ||
    localUri.includes('/upload/')
  ) {
    return localUri;
  }

  if (!localUri.startsWith('file://') && !localUri.startsWith('content://') && !localUri.startsWith('/')) {
    return localUri;
  }
  
  const filename = localUri.split('/').pop() || `file_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  
  try {
    const res = await apiUpload('/upload', { uri: localUri, name: filename, type }, { headers: { 'X-Sync-Process': 'true' } });
    if (res.status === 'success' && res.data?.url) {
      return res.data.url;
    }
    throw new Error('Upload output format unexpected');
  } catch (e) {
    console.warn(`[SyncEngine] Failed to upload local file ${localUri}:`, e);
    throw e;
  }
};

let quickRetryCount = 0;
const MAX_QUICK_RETRIES = 3;

export const startSyncEngine = () => {
  // Try syncing immediately on start if online
  NetInfo.fetch().then(state => {
    if (state.isConnected) {
      syncOfflineDemandes().then(() => {
        DeviceEventEmitter.emit('sync_completed');
        refreshCatalogData();
      });
    }
  });

  // Debounce timer to prevent multiple rapid sync triggers on reconnection
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let wasOffline = false; // Track if we were offline

  NetInfo.addEventListener(state => {
    if (!state.isConnected) {
      wasOffline = true; // Mark that we went offline
    }

    if (state.isConnected) {
      quickRetryCount = 0;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      // Notify screens immediately that network is back
      if (wasOffline) {
        DeviceEventEmitter.emit('network_restored');
        wasOffline = false;
      }
      // Trigger sync after 500ms of stable connection
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        console.log('SyncEngine: Connection stable — triggering sync...');
        syncOfflineDemandes().then(() => {
          // Emit sync_completed to refresh all listening screens
          DeviceEventEmitter.emit('sync_completed');
          console.log('SyncEngine: sync_completed emitted after reconnection sync.');
        }).catch(err => {
          console.warn('SyncEngine: Sync on reconnect failed:', err);
          // Still emit so UI can refresh from cache
          DeviceEventEmitter.emit('sync_completed');
        });
      }, 500);
    }
  });

  // Listen for newly enqueued offline items to trigger sync immediately
  DeviceEventEmitter.addListener('offline_item_enqueued', () => {
    console.log('[SyncEngine] New offline item enqueued. Triggering immediate sync check...');
    quickRetryCount = 0;
    NetInfo.fetch().then(state => {
      if (state.isConnected) {
        syncOfflineDemandes().then(() => {
          DeviceEventEmitter.emit('sync_completed');
        });
      }
    });
  });

  // Listen for connection restored events from the API client
  DeviceEventEmitter.addListener('network_restored', () => {
    console.log('[SyncEngine] Network restored via API check. Triggering sync...');
    quickRetryCount = 0;
    syncOfflineDemandes().then(() => {
      DeviceEventEmitter.emit('sync_completed');
    });
    // Also refresh catalog right away when connection comes back
    refreshCatalogData();
  });

  // Periodic fallback: check every 8 seconds if online and there are pending items
  setInterval(async () => {
    try {
      const state = await NetInfo.fetch();
      const isOnline = !!state.isConnected;
      if (isOnline) {
        const pending = await getPendingSyncDemandes();
        const pendingActions = await getPendingUserActions();
        if (pending.length > 0 || pendingActions.length > 0) {
          console.log('[SyncEngine] Periodic check: pending offline actions found. Retrying sync...');
          quickRetryCount = 0; // Reset quick retries to allow fast polling on next fails
          await syncOfflineDemandes();
          DeviceEventEmitter.emit('sync_completed');
        }
      }
    } catch (e) {
      console.warn('[SyncEngine] Periodic check error:', e);
    }
  }, 8000); // Check every 8s for instant background recovery

  // ── Catalog refresh every 90 seconds ──────────────────────────────────────
  // This keeps services / activities fresh without the user needing to restart
  // the app or pull-to-refresh after an admin makes changes on the dashboard.
  setInterval(() => {
    refreshCatalogData();
  }, 90000); // 90 seconds
};


const batchPromises = async <T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => fn(item).catch(err => {
        console.warn(`[batchPromises] Error in batch processing:`, err);
        return null as unknown as R;
      }))
    );
    results.push(...batchResults);
  }
  return results;
};

/**
 * Silently refresh catalog data (bureaux → services → activités) in the
 * background and emit `catalog_updated` if anything has changed.
 * Called on startup and every 90 seconds while the app is running.
 */
export const refreshCatalogData = async () => {
  try {
    const token = getAuthToken() ||
                  (await SecureStore.getItemAsync('auth_token')) ||
                  (await SecureStore.getItemAsync('auth_cached_token'));
    if (!token) return;

    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    console.log('[SyncEngine] Background catalog refresh started...');

    // Fetch all bureaux
    const bureauxRes = await apiFetch(`/bureaux?t=${Date.now()}`).catch(() => null);
    if (!bureauxRes || bureauxRes.status !== 'success' || !Array.isArray(bureauxRes.data?.bureaux)) {
      console.warn('[SyncEngine] Catalog refresh: could not fetch bureaux.');
      return;
    }
    const bureaux = bureauxRes.data.bureaux;

    // Fetch services for ALL bureaux in parallel
    const servicesResults = await batchPromises(bureaux, 4, async (bureau: any) => {
      try {
        const res = await apiFetch(`/services?bureauId=${bureau.id}&t=${Date.now()}`);
        return { bureauId: bureau.id, services: res?.data?.services || [] };
      } catch {
        return { bureauId: bureau.id, services: [] };
      }
    });

    // Flatten all services and fetch their activities in parallel
    const allServices: any[] = servicesResults.flatMap((r: any) => r?.services || []);
    await batchPromises(allServices, 4, async (service: any) => {
      try {
        await apiFetch(`/activities?serviceId=${service.id}&t=${Date.now()}`);
      } catch { /* ignore */ }
    });

    console.log('[SyncEngine] Background catalog refresh completed.');
    // Notify all screens that catalog data may have changed
    DeviceEventEmitter.emit('catalog_updated');
  } catch (err) {
    console.warn('[SyncEngine] Catalog refresh error:', err);
  }
};


let isSyncing = false;

export const syncOfflineDemandes = async () => {
  if (isSyncing) {
    console.log('SyncEngine: syncOfflineDemandes already in progress. Skipping duplicate execution.');
    return;
  }
  isSyncing = true;
  console.log('SyncEngine: syncOfflineDemandes execution started...');
  DeviceEventEmitter.emit('sync_started');
  
  try {
    const token = getAuthToken() || 
                  (await SecureStore.getItemAsync('auth_token')) || 
                  (await SecureStore.getItemAsync('auth_cached_token'));
    console.log('SyncEngine: Token status =', token ? 'AVAILABLE' : 'NULL');
    if (!token) {
      isSyncing = false;
      DeviceEventEmitter.emit('sync_none');
      return;
    }

    const pending = await getPendingSyncDemandes();
    const pendingActions = await getPendingUserActions();
    console.log('SyncEngine: Pending SQLite demands count =', pending.length, 'actions =', pendingActions.length);
    
    if (pending.length === 0 && pendingActions.length === 0) {
      isSyncing = false;
      DeviceEventEmitter.emit('sync_none');
      return;
    }

    console.log(`SyncEngine: Found ${pending.length} pending offline demandes.`);

    let totalSynced = 0;
    let errorsCount = 0;
    let lastSyncErrorMsg = '';

    // Process all pending demands in parallel using Promise.all
    await Promise.all(pending.map(async (p) => {
      try {
        let payload = JSON.parse(p.payload);
        
        // 1. Check and upload local files in parallel if any
        const uploadPromises: Promise<any>[] = [];
        if (payload.documents_url) {
          const docs = payload.documents_url;
          if (docs.cni && (docs.cni.startsWith('file://') || docs.cni.startsWith('content://') || docs.cni.startsWith('/'))) {
            uploadPromises.push(uploadOfflineFile(docs.cni).then(url => { docs.cni = url; }));
          }
          if (docs.justificatif && (docs.justificatif.startsWith('file://') || docs.justificatif.startsWith('content://') || docs.justificatif.startsWith('/'))) {
            uploadPromises.push(uploadOfflineFile(docs.justificatif).then(url => { docs.justificatif = url; }));
          }
        }
        
        // Also check inside dynamic fields in case files are stored there
        if (payload.donnees) {
          for (const key of Object.keys(payload.donnees)) {
            const val = payload.donnees[key];
            if (val && typeof val === 'string' && (val.startsWith('file://') || val.startsWith('content://') || val.startsWith('/'))) {
              uploadPromises.push(uploadOfflineFile(val).then(url => {
                payload.donnees[key] = url;
              }));
            }
          }
        }

        await Promise.all(uploadPromises);

        // Remove UI helper metadata before sending request to server
        if (payload._offline_metadata) {
          delete payload._offline_metadata;
        }

        // 2. Process based on method
        if (p.method === 'PUT') {
          console.log(`SyncEngine: Syncing PUT request individual to ${p.endpoint}...`);
          const res = await apiFetch(p.endpoint, {
            method: 'PUT',
            bodyData: payload,
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Sync-Process': 'true'
            }
          });
          if (res && res.status === 'success') {
            const syncedDemande = res.data?.demande;
            if (syncedDemande) {
              await updateSyncedDemandeInCache(syncedDemande);
            }
            await markDemandeSyncStatus(p.id, 'synced');
            totalSynced++;
            DeviceEventEmitter.emit('sync_completed'); // Rafraîchissement direct de l'UI
            console.log(`SyncEngine: Synchronized PUT request ${p.id} successfully.`);
          } else {
            const errorMsg = res?.message || 'Erreur serveur';
            console.warn(`SyncEngine: Failed to sync PUT request ${p.id}.`);
            await markDemandeSyncStatus(p.id, 'error', errorMsg);
            errorsCount++;
            lastSyncErrorMsg = errorMsg;
          }
        } else {
          // POST request
          console.log(`SyncEngine: Syncing POST request individual to /demandes...`);
          const res = await apiFetch('/demandes', {
            method: 'POST',
            bodyData: payload,
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Sync-Process': 'true'
            }
          });
          if (res && res.status === 'success') {
            const syncedDemande = res.data?.demande;
            if (syncedDemande) {
              await addSyncedDemandeToCache(syncedDemande);
            }
            await markDemandeSyncStatus(p.id, 'synced');
            totalSynced++;
            DeviceEventEmitter.emit('sync_completed'); // Rafraîchissement direct de l'UI
            console.log(`SyncEngine: Sync of request ${p.id} succeeded.`);
          } else {
            const errorMsg = res?.message || 'Erreur serveur';
            console.warn(`SyncEngine: Individual sync failed for request ${p.id}:`, res);
            await markDemandeSyncStatus(p.id, 'error', errorMsg);
            errorsCount++;
            lastSyncErrorMsg = errorMsg;
          }
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(`SyncEngine: Failed to process offline request ${p.id}:`, err);
        
        if (isNetworkError(err)) {
          // Network error: keep it in pending_sync to retry later, no red error bubble
          await markDemandeSyncStatus(p.id, 'pending_sync', errorMsg);
        } else {
          // Hard client/validation error
          await markDemandeSyncStatus(p.id, 'error', errorMsg);
          errorsCount++;
          lastSyncErrorMsg = errorMsg;
        }
      }
    }));

    // 4. Sync pending user actions (profile/password changes) in parallel
    let totalActionsSynced = 0;
    try {
      if (pendingActions.length > 0) {
        console.log(`SyncEngine: Found ${pendingActions.length} pending user action(s). Syncing...`);
        await Promise.all(pendingActions.map(async (action) => {
          try {
            const payload = JSON.parse(action.payload);
            const res = await apiFetch(payload.endpoint, {
              method: payload.method || 'PUT',
              bodyData: payload.body,
              headers: { 'Authorization': `Bearer ${token}`, 'X-Sync-Process': 'true' }
            });
            if (res && res.status === 'success') {
              await markUserActionSynced(action.id);
              console.log(`SyncEngine: User action ${action.id} (${action.action_type}) synced.`);
              DeviceEventEmitter.emit('user_action_synced', { type: action.action_type, data: res.data });
              totalActionsSynced++;
            } else {
              const errorMsg = res?.message || 'Erreur serveur';
              console.warn(`SyncEngine: User action ${action.id} sync failed.`);
              errorsCount++;
              lastSyncErrorMsg = errorMsg;
            }
          } catch (err: any) {
            const errorMsg = err?.message || String(err);
            console.warn(`SyncEngine: Exception syncing user action ${action.id}:`, err);
            if (!isNetworkError(err)) {
              errorsCount++;
              lastSyncErrorMsg = errorMsg;
            }
          }
        }));
      }
    } catch (err) {
      console.warn('SyncEngine: Error syncing user actions:', err);
    }

    if (totalSynced > 0 || totalActionsSynced > 0) {
      DeviceEventEmitter.emit('sync_success', { count: totalSynced + totalActionsSynced });
      if (totalSynced > 0) {
        Alert.alert(
          'Synchronisation réussie ✓',
          `${totalSynced} demande(s) enregistrée(s) hors-ligne ont été synchronisée(s) avec succès avec le serveur !`
        );
      }
    } else if (errorsCount > 0) {
      DeviceEventEmitter.emit('sync_error', { message: lastSyncErrorMsg });
    } else {
      DeviceEventEmitter.emit('sync_none');
    }

  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.warn('SyncEngine: Error during sync:', error);
    DeviceEventEmitter.emit('sync_error', { message: errorMsg });
  } finally {
    isSyncing = false;
    DeviceEventEmitter.emit('sync_completed');

    // Quick, responsive retry loop: if online and pending items still exist, retry after 4 seconds.
    // This solves connection-reachability delay and trips/failures during transition states.
    if (quickRetryCount < MAX_QUICK_RETRIES) {
      setTimeout(async () => {
        try {
          const state = await NetInfo.fetch();
          if (state.isConnected) {
            const pending = await getPendingSyncDemandes();
            const pendingActions = await getPendingUserActions();
            if (pending.length > 0 || pendingActions.length > 0) {
              console.log(`[SyncEngine] Quick retry attempt ${quickRetryCount + 1}/${MAX_QUICK_RETRIES}...`);
              quickRetryCount++;
              syncOfflineDemandes();
            }
          }
        } catch (err) {}
      }, 4000);
    } else {
      console.log('[SyncEngine] Maximum quick retries reached. Falling back to periodic check.');
    }
  }
};
