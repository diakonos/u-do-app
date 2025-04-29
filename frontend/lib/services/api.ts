import { supabase } from '../supabase';

/**
 * Base API service with common methods for interacting with Supabase
 */

// Define a proper type for the payload and export it for use in other files
export interface RealtimePayload {
  commit_timestamp: string;
  errors: unknown[] | null;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown> | null;
  schema: string;
  table: string;
}

export class ApiService {
  /**
   * Get the current authenticated user session
   */
  static async getSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session found');
    }
    return session;
  }

  /**
   * Get the current authenticated user
   */
  static async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('No authenticated user found');
    }
    return user;
  }

  /**
   * Perform a database query with authenticated user check
   * @param callback Function that performs the actual query
   */
  static async authenticatedQuery<T>(callback: () => Promise<T>): Promise<T> {
    // Ensure we have an authenticated user
    await this.getCurrentUser();

    // Execute the provided query
    return await callback();
  }

  /**
   * Set up a real-time subscription to table changes
   * @param tableName Table to subscribe to
   * @param event Event type ('INSERT', 'UPDATE', 'DELETE', '*')
   * @param filter Optional filter expression
   * @param callback Callback function when data changes
   */
  static subscribeToChanges(
    tableName: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    filter: string | null,
    callback: (payload: RealtimePayload) => void,
  ) {
    const channel = supabase.channel(`changes_${tableName}`);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: tableName,
          filter,
        },
        payload => {
          callback(payload);
        },
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  }
}
