import React from 'react';
import { View, StyleSheet } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useTodayTasks } from '@/db/hooks/useTodayTasks';
import { Suspense } from 'react';
import { useCurrentUserId } from '@/lib/auth';
import NewTaskInput from '@/components/NewTaskInput';
import { formatDateUI } from '@/lib/date';

function TodayTaskList() {
  const userId = useCurrentUserId();
  const { tasks, revalidateKey } = useTodayTasks(userId);
  return (
    <View>
      <TaskList hideDueDate tasks={tasks} revalidateKey={revalidateKey} />
      <NewTaskInput />
    </View>
  );
}

export default function TodayScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background || '#fff' }]}>
      <Text style={styles.title} size="large" weight="semibold">
        Today{' '}
        <Text style={[styles.date, { color: theme.brand }]} size="large">
          {formatDateUI(new Date())}
        </Text>
      </Text>
      <Suspense fallback={<TaskListLoading />}>
        <TodayTaskList />
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
  },
  date: {
    marginLeft: baseTheme.margin[1],
  },
  title: {
    marginBottom: baseTheme.margin[4],
    marginLeft: baseTheme.margin[3],
  },
});
