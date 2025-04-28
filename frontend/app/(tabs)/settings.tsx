import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { User } from '@supabase/supabase-js';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';
import { HTMLTitle } from '@/components/HTMLTitle';

export default function SettingsScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.container}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Profile</ThemedText>
          <ProfileInfo />
          
          <ThemedText 
            style={styles.logoutButton} 
            onPress={handleLogout}>
            Log Out
          </ThemedText>
        </ThemedView>
      </ScrollView>
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
      <HTMLTitle>Settings</HTMLTitle>
      <ThemedText>Email: {user?.email}</ThemedText>
      <ThemedText>Username: {user?.user_metadata?.username || 'Not set'}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  profileContainer: {
    gap: 8,
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 24,
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
});