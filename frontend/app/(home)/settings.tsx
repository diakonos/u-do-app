import { useState, useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { StyleSheet, ScrollView, Text } from 'react-native';
import { User } from '@supabase/supabase-js';
import { Colors } from '@/constants/Colors';

import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { supabase } from '@/lib/supabase';
import { HTMLTitle } from '@/components/ui/HTMLTitle';

export default function SettingsScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  return (
    <ThemedView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.container}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            <Text>Profile</Text>
          </ThemedText>
          <ProfileInfo />

          <ThemedText style={styles.logoutButton} onPress={handleLogout}>
            <Text>Log Out</Text>
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

function ProfileInfo() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemedView style={styles.profileContainer}>
      <Stack.Screen options={{ headerTitle: 'Settings' }} />
      {/* eslint-disable-next-line react-native/no-raw-text */}
      <HTMLTitle>Settings</HTMLTitle>
      <ThemedText>
        <Text>Email: {user?.email}</Text>
      </ThemedText>
      <ThemedText>
        <Text>Username: {user?.user_metadata?.username || 'Not set'}</Text>
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  logoutButton: {
    color: Colors.light.danger,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
  },
  profileContainer: {
    gap: 8,
    marginBottom: 16,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  sectionTitle: {
    marginBottom: 8,
  },
});
