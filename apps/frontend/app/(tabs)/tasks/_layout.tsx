import { Stack } from 'expo-router';
import { SafeAreaView, useWindowDimensions, View, StyleSheet } from 'react-native';
import ScheduleScreen from '@/app/(tabs)/schedule';
import TodayScreen from '.';
import { useCurrentUserId } from '@/lib/auth';
import FriendTasksSection from '@/components/FriendTasksSection';
import { useTheme } from '@/lib/theme';

export default function TasksLayout() {
  const { width } = useWindowDimensions();
  const userId = useCurrentUserId();
  const theme = useTheme();

  if (width >= 1200) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.column}>
          <TodayScreen showFriendsTasks={false} />
        </View>
        <View style={styles.column}>
          <ScheduleScreen />
        </View>
        <View style={styles.column}>
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
});
