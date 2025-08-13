import React, { ReactNode } from 'react';
import ShimmerPlaceHolder from 'react-native-shimmer-placeholder';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import TaskItem from '@/components/TaskItem';
import { Task } from '@/db/tasks-convex';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';

interface TaskListProps {
  emptyMessage?: string | ReactNode;
  hideDueDate?: boolean;
  style?: ViewStyle | ViewStyle[];
  tasks: Task[];
  readonly?: boolean; // Add readonly prop
}

export default function TaskList({
  emptyMessage = 'No tasks',
  hideDueDate,
  tasks,
  readonly = false,
  style,
}: TaskListProps) {
  const theme = useTheme();

  if (!tasks || tasks.length === 0) {
    return (
      <View style={[styles.empty, style]}>
        <Text style={{ color: theme.secondary }}>{emptyMessage}</Text>
      </View>
    );
  }
  return (
    <ScrollView style={[styles.scroll, style]}>
      {tasks.map(task => (
        <TaskItem
          key={task._id}
          hideDueDate={hideDueDate}
          task={task}
          readonly={readonly} // Pass readonly prop
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingHorizontal: baseTheme.margin[3],
    paddingVertical: baseTheme.margin[2],
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
});

export function TaskListLoading({ count = 3 }: { count?: number }) {
  return (
    <View style={shimmerStyles.loadingContainer} testID="task-list-loading">
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
  loadingContainer: { paddingHorizontal: baseTheme.margin[3] },
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
