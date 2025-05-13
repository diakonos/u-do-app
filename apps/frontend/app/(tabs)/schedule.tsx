import React, { Suspense, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useScheduledTasks } from '@/db/hooks/useScheduledTasks';
import { useCurrentUserId } from '@/lib/auth';
import NewTaskInput from '@/components/NewTaskInput';
import DatePickerModal from '@/components/DatePickerModal';
import { formatDateUI } from '@/lib/date';
import Button from '@/components/Button';

function ScheduledTaskList() {
  const userId = useCurrentUserId();
  const { tasks, revalidateKey } = useScheduledTasks(userId);
  return <TaskList tasks={tasks} revalidateKey={revalidateKey} />;
}

export default function ScheduleScreen() {
  const theme = useTheme();
  // Set default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={styles.title} size="large" weight="semibold">
        Scheduled
      </Text>
      <NewTaskInput placeholder="New scheduled task" style={styles.newTask} dueDate={date} />
      <View style={styles.dueDateContainer}>
        <Text style={{ color: theme.secondary }}>for</Text>
        <Text style={styles.dueDateLabel} weight="medium">
          {formatDateUI(date)}
        </Text>
        <Button title="Edit" onPress={() => setModalVisible(true)} style={styles.editDateButton} />
      </View>
      <DatePickerModal
        visible={modalVisible}
        date={date}
        onChange={() => {}}
        onCancel={() => setModalVisible(false)}
        onConfirm={d => {
          setDate(d);
          setModalVisible(false);
        }}
      />
      <Suspense fallback={<TaskListLoading />}>
        <ScheduledTaskList />
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 32,
  },
  dueDateContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    marginBottom: baseTheme.margin[4],
    paddingLeft: baseTheme.margin[3],
  },
  dueDateLabel: { marginLeft: baseTheme.margin[2] },
  editDateButton: { marginLeft: baseTheme.margin[3] },
  newTask: { marginBottom: baseTheme.margin[2] },
  title: { marginBottom: baseTheme.margin[4], marginLeft: baseTheme.margin[3] },
});
