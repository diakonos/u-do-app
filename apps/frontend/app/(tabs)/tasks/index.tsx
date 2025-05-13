import { useRouter } from 'expo-router';
import React, { Suspense } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import useSWR from 'swr';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useTodayTasks } from '@/db/hooks/useTodayTasks';
import { useCurrentUserId } from '@/lib/auth';
import NewTaskInput from '@/components/NewTaskInput';
import { formatDateUI } from '@/lib/date';
import Screen from '@/components/Screen';
import Button from '@/components/Button';
import CaretRightIcon from '@/assets/icons/caret-right.svg';
import ScreenTitle from '@/components/ScreenTitle';
import { loadDashboardFriendTasks } from '@/db/dashboard';
import FriendTasksCollapse from '@/components/FriendTasksCollapse';

function FriendTasksSection({ userId }: { userId: string | null }) {
  const { data, isLoading, error } = useSWR(
    userId ? `dashboard-friend-tasks:${userId}` : null,
    () => loadDashboardFriendTasks(userId!),
  );
  const [expanded, setExpanded] = React.useState<{ [friendId: string]: boolean }>({});
  const theme = useTheme();
  if (!userId || isLoading) return null;
  if (error) return null;
  if (!data || data.length === 0) return null;
  return (
    <View style={{ marginTop: 24 }}>
      {data.map((friend: any) => {
        const tasks = friend.tasks || [];
        return (
          <View key={friend.friend_id} style={styles.friendTasks}>
            <FriendTasksCollapse friendName={friend.friend_username} tasks={tasks} />
          </View>
        );
      })}
    </View>
  );
}

function TodayTaskList() {
  const userId = useCurrentUserId();
  const { tasks, revalidateKey } = useTodayTasks(userId);
  const router = useRouter();
  const theme = useTheme();
  return (
    <View>
      <TaskList hideDueDate tasks={tasks} revalidateKey={revalidateKey} />
      <NewTaskInput />
      <Button
        title="Archived tasks"
        onPress={() => router.push('/tasks/archive')}
        style={[styles.archiveButton, { backgroundColor: theme.backgroundSecondary }]}
        labelStyle={{ color: theme.textSecondary }}
        labelAlign="left"
        icon={<CaretRightIcon color={theme.textSecondary} />}
      />
      <Suspense fallback={<TaskListLoading />}>
        <FriendTasksSection userId={userId} />
      </Suspense>
    </View>
  );
}

export default function TodayScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <ScrollView style={[styles.container, { backgroundColor: theme.background || '#fff' }]}>
        <ScreenTitle>
          Today{' '}
          <Text style={[styles.date, { color: theme.brand }]} size="large">
            {formatDateUI(new Date())}
          </Text>
        </ScreenTitle>
        <Suspense fallback={<TaskListLoading />}>
          <TodayTaskList />
        </Suspense>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  archiveButton: {
    flexGrow: 0,
    marginHorizontal: baseTheme.margin[3],
    marginTop: baseTheme.margin[3],
  },
  container: {
    flex: 1,
  },
  date: {
    marginLeft: baseTheme.margin[1],
  },
  friendTasks: { marginBottom: baseTheme.margin[3] },
  title: {
    marginBottom: baseTheme.margin[4],
    marginLeft: baseTheme.margin[3],
  },
});
