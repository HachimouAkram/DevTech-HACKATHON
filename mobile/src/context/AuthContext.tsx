import * as SecureStore from 'expo-secure-store';
import React, { createContext, useState, useEffect, useContext } from 'react';
import { setAuthToken } from '../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256, normalizePhone } from '../utils/hash';
import { DeviceEventEmitter } from 'react-native';

interface User {
  id: number;
  nom_complet: string;
  telephone: string;
  email?: string;
  role: string;
  lieu_naissance?: string;
  commune_id?: number;
  centre_id?: number;
  commune_nom?: string;
  centre_nom?: string;
  bureau_id?: number;
  bureau_nom?: string;
  bureau_code?: string;
  avatar_url?: string;
  permissions?: string[];
  activities?: any[];
  actif?: boolean;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User, rememberMe?: boolean, password?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  loading: boolean;
  attemptOfflineLogin: (telephone: string, passwordString: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedUser = await AsyncStorage.getItem('@auth_user');
        if (storedToken && storedUser) {
          setTokenState(storedToken);
          setUserState(JSON.parse(storedUser));
          setAuthToken(storedToken);
        }
      } catch (e) {
        console.error('Failed to load session', e);
      } finally {
        setLoading(false);
      }
    };
    loadSession();

    const sub = DeviceEventEmitter.addListener('auth_state_changed', loadSession);
    return () => {
      sub.remove();
    };
  }, []);

  const login = async (newToken: string, newUser: User, rememberMe: boolean = true, password?: string) => {
    // Clear old SQLite cache on login to prevent stale data from other users
    try {
      const { getDb } = require('../database/localDb');
      const database = await getDb();
      await database.execAsync(`DELETE FROM historique_cache;`);
      console.log('[AuthContext] Cache cleared on login.');
    } catch (e) {
      console.warn('Failed to clear cache on login:', e);
    }

    setTokenState(newToken);
    setUserState(newUser);
    setAuthToken(newToken);

    // Always cache token, user, and credentials hash for offline capability
    await SecureStore.setItemAsync('auth_cached_token', newToken);
    await AsyncStorage.setItem('@auth_cached_user', JSON.stringify(newUser));
    if (password) {
      const hash = sha256(normalizePhone(newUser.telephone) + ':' + password);
      await SecureStore.setItemAsync('auth_credential_hash', hash);
    }

    if (rememberMe) {
      await SecureStore.setItemAsync('auth_token', newToken);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(newUser));
    }
  };

  const logout = async () => {
    setTokenState(null);
    setUserState(null);
    setAuthToken(null);
    await SecureStore.deleteItemAsync('auth_token');
    await AsyncStorage.removeItem('@auth_user');
    
    // Clear SQLite cache on logout so the next session starts fresh without leaking data
    try {
      const { getDb } = require('../database/localDb');
      const database = await getDb();
      await database.execAsync(`DELETE FROM historique_cache;`);
      console.log('[AuthContext] Cache cleared on logout.');
    } catch (e) {
      console.warn('Failed to clear cache on logout:', e);
    }
  };

  const attemptOfflineLogin = async (telephone: string, passwordString: string): Promise<boolean> => {
    try {
      const storedHash = await SecureStore.getItemAsync('auth_credential_hash');
      if (!storedHash) return false;

      const enteredHash = sha256(normalizePhone(telephone) + ':' + passwordString);
      if (enteredHash === storedHash) {
        const storedToken = await SecureStore.getItemAsync('auth_cached_token');
        const storedUser = await AsyncStorage.getItem('@auth_cached_user');
        if (storedToken && storedUser) {
          setTokenState(storedToken);
          setUserState(JSON.parse(storedUser));
          setAuthToken(storedToken);

          // Persist the session to active session so they remain logged in
          await SecureStore.setItemAsync('auth_token', storedToken);
          await AsyncStorage.setItem('@auth_user', storedUser);

          return true;
        }
      }
      return false;
    } catch (e) {
      console.warn('Failed offline login check', e);
      return false;
    }
  };

  const updateUser = async (newUser: User) => {
    setUserState(newUser);
    if (token) {
      await AsyncStorage.setItem('@auth_user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser,
        loading,
        attemptOfflineLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
