import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, SafeAreaView } from 'react-native';
import { User } from '@supabase/supabase-js';

import { Collapsible } from '@/components/Collapsible';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Settings</ThemedText>
        
        <Collapsible title="Profile">
          <ProfileInfo />
        </Collapsible>
        
        <ThemedText 
          style={styles.logoutButton} 
          onPress={handleLogout}>
          Log Out
        </ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

function ProfileInfo() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user }}) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription }} = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemedView style={styles.profileContainer}>
      <ThemedText>Email: {user?.email}</ThemedText>
      <ThemedText>Username: {user?.user_metadata?.username || 'Not set'}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  profileContainer: {
    gap: 8,
  },
  logoutButton: {
    marginTop: 24,
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
});