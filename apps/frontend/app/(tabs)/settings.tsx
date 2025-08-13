import React from 'react';
import { View, StyleSheet } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import Button from '@/components/Button';
// import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth-client';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import { clearAppCache } from '@/lib/state';
import { useSWRConfig } from 'swr';
import { useQuery } from 'convex/react';
import { api } from '../../../backend/convex/_generated/api';
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
  const { cache } = useSWRConfig();
  const [alertVisible, setAlertVisible] = React.useState(false);
  const [alertTitle, setAlertTitle] = React.useState('');
  const [alertMessage, setAlertMessage] = React.useState('');

  // Use Convex query to fetch current user profile
  const profile = useQuery(api.auth.getCurrentUser);

  const showAlert = (title: string, message?: string) => {
    setAlertTitle(title);
    setAlertMessage(message || '');
    setAlertVisible(true);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e: any) {
      showAlert('Logout failed', e?.message ?? '');
    }
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
