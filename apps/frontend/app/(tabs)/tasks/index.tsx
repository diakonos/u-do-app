import { Link } from 'expo-router';
import React, { Suspense } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
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
import FriendTasksSection from '@/components/FriendTasksSection';

function TodayTaskList({ showFriendsTasks = true }: { showFriendsTasks?: boolean }) {
  const userId = useCurrentUserId();
  const { tasks, revalidateKey } = useTodayTasks(userId);
  const theme = useTheme();
  return (
    <View>
      <TaskList hideDueDate tasks={tasks} revalidateKey={revalidateKey} />
      <NewTaskInput revalidateKey={revalidateKey} />
      <Link href="/tasks/archive" style={styles.archiveLink}>
        <Button
          title="Archived tasks"
          onPress={() => {} /* router.push('/tasks/archive') */}
          style={[styles.archiveButton, { backgroundColor: theme.backgroundSecondary }]}
          labelStyle={{ color: theme.textSecondary }}
          labelAlign="left"
          icon={<CaretRightIcon color={theme.textSecondary} />}
        />
      </Link>

      {showFriendsTasks && (
        <Suspense fallback={<TaskListLoading />}>
          <FriendTasksSection userId={userId} friendTasksStyle={styles.friendTasks} />
        </Suspense>
      )}
    </View>
  );
}

export default function TodayScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const showFriendsTasks = width < 1200;

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
          <TodayTaskList showFriendsTasks={showFriendsTasks} />
        </Suspense>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  archiveButton: {
    margin: baseTheme.margin[3],
  },
  archiveLink: {
    display: 'flex',
    width: '100%',
  },
  container: {
    flex: 1,
  },
  date: {
    marginLeft: baseTheme.margin[1],
  },
  friendTasks: { marginBottom: baseTheme.margin[3] },
});
