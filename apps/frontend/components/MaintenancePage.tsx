import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { NAV_THEME } from '@/lib/constants';

export function MaintenancePage() {
  const { colorScheme } = useColorScheme();
  const theme = NAV_THEME[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Under Maintenance</Text>
        <Text style={[styles.message, { color: theme.text }]}>
          Doing some things behind the scenes. We&apos;ll be back shortly!
        </Text>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          Thank you for your patience. ❤️
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});
