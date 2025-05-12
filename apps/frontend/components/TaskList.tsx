import React from 'react';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import { ScrollView, StyleSheet, View } from 'react-native';
import TaskItem from '@/components/TaskItem';
import { Task } from '@/db/tasks';

interface TaskListProps {
  hideDueDate?: boolean;
  revalidateKey?: string | null;
  tasks: Task[];
}

export default function TaskList({ hideDueDate, tasks, revalidateKey }: TaskListProps) {
  return (
    <ScrollView style={styles.scroll}>
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          hideDueDate={hideDueDate}
          task={task}
          revalidateKey={revalidateKey}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
  },
});

export function TaskListLoading({ count = 3 }: { count?: number }) {
  return (
    <View testID="task-list-loading">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={shimmerStyles.row}>
          <ShimmerPlaceHolder style={shimmerStyles.checkbox} shimmerStyle={shimmerStyles.shimmer} />
          <ShimmerPlaceHolder style={shimmerStyles.text} shimmerStyle={shimmerStyles.shimmer} />
        </View>
      ))}
    </View>
  );
}

const shimmerStyles = StyleSheet.create({
  checkbox: {
    borderRadius: 4,
    height: 20,
    marginRight: 12,
    width: 20,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 40,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  shimmer: { borderRadius: 4 },
  text: {
    borderRadius: 4,
    flex: 1,
    height: 20,
  },
});
