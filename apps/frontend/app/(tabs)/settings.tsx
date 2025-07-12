import React from 'react';
import { View, StyleSheet } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import Button from '@/components/Button';
import { useCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import useSWR from 'swr';
import { fetchProfile } from '@/db/profiles';
import { clearAppCache } from '@/lib/state';
import { useSWRConfig } from 'swr';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SettingsScreen() {
  const theme = useTheme();
  const userId = useCurrentUserId();
  const { data: profile } = useSWR(userId ? `profile:${userId}` : null, () =>
    userId ? fetchProfile(userId) : null,
  );
  const { cache } = useSWRConfig();
  const [alertVisible, setAlertVisible] = React.useState(false);
  const [alertTitle, setAlertTitle] = React.useState('');
  const [alertMessage, setAlertMessage] = React.useState('');

  const showAlert = (title: string, message?: string) => {
    setAlertTitle(title);
    setAlertMessage(message || '');
    setAlertVisible(true);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showAlert('Logout failed', error.message);
  };

  const handleClearCache = async () => {
    try {
      await clearAppCache(cache);
      showAlert('Cache cleared', 'App cache has been cleared. Restart the app for best results.');
    } catch {
      showAlert('Error', 'Failed to clear app cache.');
    }
  };

  return (
    <Screen>
      <AlertDialog open={alertVisible} onOpenChange={setAlertVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
            {alertMessage ? <AlertDialogDescription>{alertMessage}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          <AlertDialogAction onPress={() => setAlertVisible(false)}>
            <Text style={{ color: theme.textInverse }}>OK</Text>
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
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
        <Button
          title="Clear App Cache"
          onPress={handleClearCache}
          style={[styles.logoutButton, { backgroundColor: theme.secondary }]}
        />
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
