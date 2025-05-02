import AsyncStorage from '@react-native-async-storage/async-storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _subscribers: Record<string, Set<(update: any, updatedAt: number) => void>> = {};

export const PersistentCache = {
  async get<T>(key: string): Promise<{ value: T; updatedAt: number } | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T) {
    const data = {
      value,
      updatedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
    if (_subscribers[key]) {
      _subscribers[key].forEach(cb => cb(value, data.updatedAt));
    }
  },

  async clear(key: string) {
    await AsyncStorage.removeItem(key);
    if (_subscribers[key]) {
      _subscribers[key].forEach(cb => cb(null, Date.now()));
    }
  },

  subscribe<T>(key: string, callback: (update: T, updatedAt: number) => void) {
    if (!_subscribers[key]) {
      _subscribers[key] = new Set();
    }
    _subscribers[key].add(callback);
    return () => {
      _subscribers[key].delete(callback);
      if (_subscribers[key].size === 0) {
        delete _subscribers[key];
      }
    };
  },

  unsubscribe<T>(key: string, callback: (update: T, updatedAt: number) => void) {
    if (_subscribers[key]) {
      _subscribers[key].delete(callback);
      if (_subscribers[key].size === 0) {
        delete _subscribers[key];
      }
    }
  },
};
