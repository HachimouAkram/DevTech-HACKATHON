import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

// Initialize the database asynchronously
let db: SQLite.SQLiteDatabase | null = null;

// Pre-open the database immediately so first call to getDb() is instant (cached)
SQLite.openDatabaseAsync('teranga_civil.db').then(d => { db = d; }).catch(() => {});

export const getDb = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('teranga_civil.db');
  return db;
};

// Initialize the schema
export const initLocalDb = async () => {
  const database = await getDb();
  
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -4000;
    PRAGMA temp_store = MEMORY;
    
    CREATE TABLE IF NOT EXISTS services_cache (
      id TEXT PRIMARY KEY,
      data TEXT,
      last_updated INTEGER
    );

    CREATE TABLE IF NOT EXISTS activites_cache (
      id TEXT PRIMARY KEY,
      service_id TEXT,
      data TEXT,
      last_updated INTEGER
    );

    CREATE TABLE IF NOT EXISTS demandes_offline (
      id TEXT PRIMARY KEY,
      endpoint TEXT,
      method TEXT,
      payload TEXT,
      status TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS historique_cache (
      id TEXT PRIMARY KEY,
      data TEXT,
      last_updated INTEGER
    );

    CREATE TABLE IF NOT EXISTS pdf_cache (
      demande_id TEXT PRIMARY KEY,
      local_uri TEXT,
      cached_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_actions_offline (
      id TEXT PRIMARY KEY,
      action_type TEXT,
      payload TEXT,
      status TEXT,
      created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_historique_cache_id ON historique_cache(id);
    CREATE INDEX IF NOT EXISTS idx_demandes_offline_status ON demandes_offline(status);
    CREATE INDEX IF NOT EXISTS idx_demandes_offline_created ON demandes_offline(created_at);
    CREATE INDEX IF NOT EXISTS idx_user_actions_status ON user_actions_offline(status);
  `);

  try {
    await database.execAsync(`ALTER TABLE demandes_offline ADD COLUMN endpoint TEXT;`);
  } catch (e) {}
  try {
    await database.execAsync(`ALTER TABLE demandes_offline ADD COLUMN method TEXT;`);
  } catch (e) {}
  try {
    await database.execAsync(`ALTER TABLE demandes_offline ADD COLUMN error_message TEXT;`);
  } catch (e) {}

  // We keep the cache on startup to allow instant loading of dashboard and history.
  // Cache is safely cleared on login/logout in AuthContext.
};

// --- Cache Helpers ---

export const saveToCache = async (table: string, id: string, data: any, extraField: string | null = null, extraValue: string | null = null) => {
  const database = await getDb();
  const timestamp = Date.now();
  const dataString = JSON.stringify(data);
  
  if (extraField && extraValue) {
    await database.runAsync(
      `INSERT OR REPLACE INTO ${table} (id, ${extraField}, data, last_updated) VALUES (?, ?, ?, ?)`,
      [id, extraValue, dataString, timestamp]
    );
  } else {
    await database.runAsync(
      `INSERT OR REPLACE INTO ${table} (id, data, last_updated) VALUES (?, ?, ?)`,
      [id, dataString, timestamp]
    );
  }
};

export const getFromCache = async (table: string, id: string): Promise<any | null> => {
  const database = await getDb();
  const result = await database.getFirstAsync<{ data: string }>(`SELECT data FROM ${table} WHERE id = ?`, [id]);
  if (result && result.data) {
    return JSON.parse(result.data);
  }
  return null;
};

export const getAllFromCache = async (table: string, condition?: string, params?: any[]): Promise<any[]> => {
  const database = await getDb();
  const query = condition ? `SELECT data FROM ${table} WHERE ${condition}` : `SELECT data FROM ${table}`;
  const results = await database.getAllAsync<{ data: string }>(query, params || []);
  return results.map(row => JSON.parse(row.data));
};

// --- Offline Queue Helpers ---

export const enqueueOfflineDemande = async (endpoint: string, method: string, payload: any) => {
  const database = await getDb();
  const id = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const payloadString = JSON.stringify(payload);
  await database.runAsync(
    `INSERT INTO demandes_offline (id, endpoint, method, payload, status, created_at) VALUES (?, ?, ?, ?, 'pending_sync', ?)`,
    [id, endpoint, method, payloadString, Date.now()]
  );
  DeviceEventEmitter.emit('offline_item_enqueued');
  return id;
};

export const getPendingSyncDemandes = async () => {
  const database = await getDb();
  return await database.getAllAsync<{ id: string, endpoint: string, method: string, payload: string, status: string, error_message: string | null }>(
    `SELECT id, endpoint, method, payload, status, error_message FROM demandes_offline WHERE status = 'pending_sync' ORDER BY created_at ASC`
  );
};

export const markDemandeSyncStatus = async (id: string, status: string, errorMessage?: string) => {
  const database = await getDb();
  if (status === 'synced') {
    await database.runAsync(`DELETE FROM demandes_offline WHERE id = ?`, [id]);
  } else {
    await database.runAsync(`UPDATE demandes_offline SET status = ?, error_message = ? WHERE id = ?`, [status, errorMessage || null, id]);
  }
};

// --- PDF Cache ---

export const savePdfToCache = async (demandeId: string, localUri: string) => {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO pdf_cache (demande_id, local_uri, cached_at) VALUES (?, ?, ?)`,
    [demandeId, localUri, Date.now()]
  );
};

export const getPdfFromCache = async (demandeId: string): Promise<string | null> => {
  const database = await getDb();
  const result = await database.getFirstAsync<{ local_uri: string }>(
    `SELECT local_uri FROM pdf_cache WHERE demande_id = ?`, [demandeId]
  );
  return result?.local_uri || null;
};

// --- User Actions Offline Queue ---

export const enqueueUserAction = async (actionType: string, payload: any) => {
  const database = await getDb();
  const id = 'ua_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  await database.runAsync(
    `INSERT INTO user_actions_offline (id, action_type, payload, status, created_at) VALUES (?, ?, ?, 'pending_sync', ?)`,
    [id, actionType, JSON.stringify(payload), Date.now()]
  );
  DeviceEventEmitter.emit('offline_item_enqueued');
  return id;
};

export const getPendingUserActions = async () => {
  const database = await getDb();
  return await database.getAllAsync<{ id: string, action_type: string, payload: string }>(
    `SELECT id, action_type, payload FROM user_actions_offline WHERE status = 'pending_sync' ORDER BY created_at ASC`
  );
};

export const markUserActionSynced = async (id: string) => {
  const database = await getDb();
  await database.runAsync(`DELETE FROM user_actions_offline WHERE id = ?`, [id]);
};

export const addSyncedDemandeToCache = async (syncedDemande: any) => {
  if (!syncedDemande) return;
  try {
    const cached = await getFromCache('historique_cache', '/demandes');
    if (cached && cached.status === 'success' && cached.data) {
      const list = cached.data.demandes || [];
      const exists = list.some((d: any) => d.id === syncedDemande.id);
      if (!exists) {
        cached.data.demandes = [syncedDemande, ...list];
        await saveToCache('historique_cache', '/demandes', cached);
      }
    }
  } catch (err) {
    console.warn('[LocalDb] Failed to add synced demand to cache:', err);
  }
};

export const updateSyncedDemandeInCache = async (syncedDemande: any) => {
  if (!syncedDemande) return;
  try {
    const cached = await getFromCache('historique_cache', '/demandes');
    if (cached && cached.status === 'success' && cached.data) {
      const list = cached.data.demandes || [];
      const index = list.findIndex((d: any) => d.id === syncedDemande.id);
      if (index !== -1) {
        list[index] = { ...list[index], ...syncedDemande };
        cached.data.demandes = [...list];
        await saveToCache('historique_cache', '/demandes', cached);
      }
    }
  } catch (err) {
    console.warn('[LocalDb] Failed to update synced demand in cache:', err);
  }
};
