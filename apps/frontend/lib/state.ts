import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

export function localStorageSWRProvider<Data>(): Map<string, Data> {
  const map: Map<string, Data> = new Map();

  // Restore data from AsyncStorage on init (async, so may be empty at first)
  AsyncStorage.getItem('app-cache').then(stored => {
    if (stored) {
      try {
        const entries = JSON.parse(stored);
        if (Array.isArray(entries)) {
          entries.forEach(([key, value]) => map.set(key, value));
        }
      } catch (e) {
        console.warn('Failed to parse app-cache from AsyncStorage:', e);
      }
    }
  });

  // Persist data to AsyncStorage when app goes to background or inactive
  const handleAppStateChange = (state: string) => {
    if (state === 'background' || state === 'inactive') {
      const appCache = JSON.stringify(Array.from(map.entries()));
      AsyncStorage.setItem('app-cache', appCache).catch(e => {
        console.warn('Failed to save app-cache to AsyncStorage:', e);
      });
    }
  };
  AppState.addEventListener('change', handleAppStateChange);

  return map;
}
