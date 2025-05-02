import { useCallback, useEffect, useState } from 'react';
import { PersistentCache } from '@/lib/persistentCache';

export default function useCache<T>(
  key: string,
  defaultValue: T,
): [T, (update: T | ((prevValue: T) => T)) => void, updatedAt: number] {
  const [cache, setCache] = useState<T>(defaultValue);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);

  const updateCache = useCallback(
    (update: T | ((prevValue: T) => T)) => {
      let newValue: T;
      if (typeof update === 'function') {
        setCache(prevValue => {
          newValue = (update as (prevValue: T) => T)(prevValue);
          PersistentCache.set(key, newValue);
          return newValue;
        });
      } else {
        newValue = update;
        setCache(update);
        PersistentCache.set(key, newValue);
      }
    },
    [key],
  );

  // Load from persistent cache on mount
  useEffect(() => {
    const loadCache = async () => {
      const cached = await PersistentCache.get<T>(key);
      if (cached) {
        setCache(cached.value);
        setLastUpdatedAt(cached.updatedAt);
      } else {
        setCache(defaultValue);
        setLastUpdatedAt(Date.now());
      }
    };

    loadCache();
  }, [key]);

  // Subscribe to updates
  useEffect(() => {
    const handleUpdate = (update: T, updatedAt: number) => {
      setCache(update);
      setLastUpdatedAt(updatedAt);
    };
    PersistentCache.subscribe<T>(key, handleUpdate);

    return () => {
      PersistentCache.unsubscribe<T>(key, handleUpdate);
    };
  }, [key]);

  return [cache, updateCache, lastUpdatedAt];
}
