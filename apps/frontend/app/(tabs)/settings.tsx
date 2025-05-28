import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import Button from '@/components/Button';
import { useCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import useSWR from 'swr';
import { fetchProfile } from '@/db/profiles';

export default function SettingsScreen() {
  const theme = useTheme();
  const userId = useCurrentUserId();
  const { data: profile } = useSWR(userId ? `profile:${userId}` : null, () =>
    userId ? fetchProfile(userId) : null,
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Logout failed', error.message);
  };

  return (
    <Screen>
      <ScreenTitle>Settings</ScreenTitle>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Text weight="medium">Username:</Text>
            <Text style={styles.value}>{profile?.username ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text weight="medium">Email:</Text>
            <Text style={styles.value}>{profile?.email ?? '-'}</Text>
          </View>
        </View>
        <Button title="Log out" onPress={handleLogout} style={styles.logoutButton} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: baseTheme.margin[3],
  },
  infoBox: {
    gap: baseTheme.margin[2],
  },
  logoutButton: {
    flexGrow: 0,
    marginTop: baseTheme.margin[2],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: baseTheme.margin[3],
  },
  value: {
    flexShrink: 1,
    marginLeft: baseTheme.margin[2],
  },
});
