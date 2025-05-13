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
import FriendTasksSection from '@/components/FriendTasksSection';

function TodayTaskList({ showFriendsTasks = true }: { showFriendsTasks?: boolean }) {
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
      {showFriendsTasks && (
        <Suspense fallback={<TaskListLoading />}>
          <FriendTasksSection userId={userId} friendTasksStyle={styles.friendTasks} />
        </Suspense>
      )}
    </View>
  );
}

export default function TodayScreen({ showFriendsTasks = true }: { showFriendsTasks?: boolean }) {
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
          <TodayTaskList showFriendsTasks={showFriendsTasks} />
        </Suspense>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  archiveButton: {
    flexGrow: 0,
    margin: baseTheme.margin[3],
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
