import AsyncStorage from '@react-native-async-storage/async-storage';

// Persistent cache utility for storing data with a timestamp
export const PersistentCache = {
  async get(key: string) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(key: string, value: any) {
    const data = {
      value,
      updatedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  },
  async clear(key: string) {
    await AsyncStorage.removeItem(key);
  },
};
