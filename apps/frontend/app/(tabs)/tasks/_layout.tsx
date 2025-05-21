import { Stack, Slot, Link } from 'expo-router';
import { SafeAreaView, useWindowDimensions, View, StyleSheet } from 'react-native';
import ScheduleScreen from '@/app/(tabs)/schedule';
import { useCurrentUserId } from '@/lib/auth';
import FriendTasksSection from '@/components/FriendTasksSection';
import { baseTheme, useTheme } from '@/lib/theme';
import ScreenTitle from '@/components/ScreenTitle';
import Button from '@/components/Button';
import Text from '@/components/Text';

export default function TasksLayout() {
  const { width } = useWindowDimensions();
  const userId = useCurrentUserId();
  const theme = useTheme();

  if (width >= 1200) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.column}>
          <Slot />
        </View>
        <View style={styles.column}>
          <ScheduleScreen />
        </View>
        <View style={styles.column}>
          <View style={styles.friendsHeader}>
            <ScreenTitle>Pinned friends</ScreenTitle>
            <Link href="/(tabs)/friends" style={styles.friendsLink}>
              <Text style={{ color: theme.success }}>View all</Text>
            </Link>
          </View>
          <FriendTasksSection userId={userId} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Today' }} />
      <Stack.Screen
        name="archive"
        options={{
          title: 'Archive',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1 },
  container: { flex: 1, flexDirection: 'row' },
  friendsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingRight: baseTheme.margin[3],
  },
  friendsLink: { marginBottom: baseTheme.margin[3], marginTop: baseTheme.margin[2] },
});
