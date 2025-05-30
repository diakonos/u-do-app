import useSWR from 'swr';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

const AuthContext = createContext<{ session: Session | null; loading: boolean }>({
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useCurrentUserId() {
  const { session } = useAuth();
  const userId = session?.user.id || null;
  return userId;
}

export function useCurrentUserUsername() {
  const userId = useCurrentUserId();
  const { data: username, isLoading } = useSWR<string>(
    userId ? `userProfile:${userId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data?.username || null;
    },
  );
  return [username, isLoading];
}
