// Storage Utility - MMKV + AsyncStorage Wrapper
import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mmkv = new MMKV({
  id: 'kiki-storage',
  encryptionKey: 'kiki-encryption-key-2026',
});

export const storage = {
  // MMKV methods (synchronous, encrypted)
  set: (key: string, value: string) => {
    try {
      mmkv.set(key, value);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  get: (key: string): string | undefined => {
    try {
      return mmkv.getString(key) || undefined;
    } catch (error) {
      console.error('Storage get error:', error);
      return undefined;
    }
  },

  delete: (key: string): boolean => {
    try {
      mmkv.delete(key);
      return true;
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      mmkv.clearAll();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  },

  // AsyncStorage methods (asynchronous, for larger data)
  asyncSet: async (key: string, value: string): Promise<boolean> => {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('AsyncStorage set error:', error);
      return false;
    }
  },

  asyncGet: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('AsyncStorage get error:', error);
      return null;
    }
  },

  asyncDelete: async (key: string): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('AsyncStorage delete error:', error);
      return false;
    }
  },

  asyncClear: async (): Promise<boolean> => {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
      return false;
    }
  },

  // JSON helpers
  setJSON: <T>(key: string, value: T): boolean => {
    try {
      const json = JSON.stringify(value);
      return storage.set(key, json);
    } catch (error) {
      console.error('Storage setJSON error:', error);
      return false;
    }
  },

  getJSON: <T>(key: string): T | undefined => {
    try {
      const value = storage.get(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      console.error('Storage getJSON error:', error);
      return undefined;
    }
  },

  asyncSetJSON: async <T>(key: string, value: T): Promise<boolean> => {
    try {
      const json = JSON.stringify(value);
      return await storage.asyncSet(key, json);
    } catch (error) {
      console.error('AsyncStorage setJSON error:', error);
      return false;
    }
  },

  asyncGetJSON: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await storage.asyncGet(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('AsyncStorage getJSON error:', error);
      return null;
    }
  },

  // Keys management
  getAllKeys: (): string[] => {
    return mmkv.getAllKeys();
  },

  asyncGetAllKeys: async (): Promise<string[]> => {
    return await AsyncStorage.getAllKeys();
  },

  // Specific app keys
  keys: {
    authToken: '@kiki/auth/token',
    refreshToken: '@kiki/auth/refresh-token',
    user: '@kiki/auth/user',
    tenant: '@kiki/auth/tenant',
    biometricEnabled: '@kiki/auth/biometric-enabled',
    theme: '@kiki/ui/theme',
    pushToken: '@kiki/notifications/push-token',
    notificationSettings: '@kiki/notifications/settings',
    offlineQueue: '@kiki/offline/queue',
    lastSync: '@kiki/sync/last-sync',
    deviceId: '@kiki/device/id',
    appVersion: '@kiki/app/version',
    onboardingComplete: '@kiki/onboarding/complete',
  },
};

export default storage;