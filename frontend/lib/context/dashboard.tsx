import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { PersistentCache } from '../persistentCache';

// Define the type for a dashboard configuration item
type DashboardConfig = {
  id: number;
  user_id: string;
  block_type: string;
  value: string;
  order: number;
};

// Define the dashboard context type
type DashboardContextType = {
  dashboardConfigs: DashboardConfig[];
  loadDashboardConfig: (forceRefresh?: boolean) => Promise<DashboardConfig[]>;
  isLoading: boolean;
  checkIfConfigExists: (blockType: string, value: string) => boolean;
  createDashboardConfig: (blockType: string, value: string) => Promise<DashboardConfig>;
  deleteDashboardConfig: (blockType: string, value: string) => Promise<void>;
};

// Create the dashboard context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [dashboardConfigs, setDashboardConfigs] = useState<DashboardConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const DASHBOARD_CACHE_KEY = 'dashboard-configs-cache';
  const DASHBOARD_REVALIDATE_MS = 60 * 1000;

  // Load dashboard configs from persistent cache on mount
  useEffect(() => {
    (async () => {
      const cached = await PersistentCache.get(DASHBOARD_CACHE_KEY);
      if (cached && cached.value) {
        setDashboardConfigs(cached.value);
      }
    })();
  }, []);

  // Function to load dashboard configuration for the current user, with cache and revalidation
  const loadDashboardConfig = useCallback(
    async (forceRefresh = false): Promise<DashboardConfig[]> => {
      const now = Date.now();
      const cached = await PersistentCache.get(DASHBOARD_CACHE_KEY);
      if (
        !forceRefresh &&
        cached &&
        cached.value &&
        cached.updatedAt &&
        now - cached.updatedAt < DASHBOARD_REVALIDATE_MS
      ) {
        setDashboardConfigs(cached.value);
        return cached.value;
      }
      try {
        setIsLoading(true);

        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) throw new Error('User not authenticated');

        // Query the dashboard_configs table for the current user
        const { data, error } = await supabase
          .from('dashboard_configs')
          .select('*')
          .eq('user_id', session.user.id)
          .order('order', { ascending: true });

        if (error) throw error;

        // Update the state with the fetched configurations
        setDashboardConfigs(data || []);
        PersistentCache.set(DASHBOARD_CACHE_KEY, data || []);
        return data || [];
      } catch (error) {
        console.error('Error loading dashboard config:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Function to check if a specific configuration already exists
  const checkIfConfigExists = useCallback(
    (blockType: string, value: string): boolean => {
      return dashboardConfigs.some(
        config => config.block_type === blockType && config.value === value,
      );
    },
    [dashboardConfigs],
  );

  // Function to create a new dashboard configuration
  const createDashboardConfig = useCallback(
    async (blockType: string, value: string): Promise<DashboardConfig> => {
      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) throw new Error('User not authenticated');

        // Find the maximum order value for the current user
        const maxOrder =
          dashboardConfigs.length > 0
            ? Math.max(...dashboardConfigs.map(config => config.order))
            : 0;

        const newConfig = {
          user_id: session.user.id,
          block_type: blockType,
          value: value,
          order: maxOrder + 1,
        };

        // Insert the new configuration
        const { data, error } = await supabase
          .from('dashboard_configs')
          .insert([newConfig])
          .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Failed to create dashboard configuration');

        // Update the local state
        setDashboardConfigs(prev => {
          const updated = [...prev, data[0]];
          PersistentCache.set(DASHBOARD_CACHE_KEY, updated);
          return updated;
        });
        return data[0];
      } catch (error) {
        console.error('Error creating dashboard config:', error);
        throw error;
      }
    },
    [dashboardConfigs],
  );

  // Function to delete a dashboard configuration
  const deleteDashboardConfig = useCallback(
    async (blockType: string, value: string): Promise<void> => {
      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) throw new Error('User not authenticated');

        // Delete the configuration
        const { error } = await supabase
          .from('dashboard_configs')
          .delete()
          .eq('user_id', session.user.id)
          .eq('block_type', blockType)
          .eq('value', value);

        if (error) throw error;

        // Update the local state
        setDashboardConfigs(prev => {
          const updated = prev.filter(
            config => !(config.block_type === blockType && config.value === value),
          );
          PersistentCache.set(DASHBOARD_CACHE_KEY, updated);
          return updated;
        });
      } catch (error) {
        console.error('Error deleting dashboard config:', error);
        throw error;
      }
    },
    [],
  );

  return (
    <DashboardContext.Provider
      value={{
        dashboardConfigs,
        loadDashboardConfig,
        isLoading,
        checkIfConfigExists,
        createDashboardConfig,
        deleteDashboardConfig,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

// Custom hook for using the dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
