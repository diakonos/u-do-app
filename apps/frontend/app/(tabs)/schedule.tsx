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
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';

function ScheduledTaskList() {
  const userId = useCurrentUserId();
  const { tasks, revalidateKey } = useScheduledTasks(userId);
  return <TaskList tasks={tasks} revalidateKey={revalidateKey} />;
}

export default function ScheduleScreen() {
  const theme = useTheme();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow);
  const [modalVisible, setModalVisible] = useState(false);
  const userId = useCurrentUserId();
  const { revalidateKey } = useScheduledTasks(userId);

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScreenTitle>Scheduled tasks</ScreenTitle>
        <NewTaskInput
          placeholder="New scheduled task"
          style={styles.newTask}
          dueDate={date}
          revalidateKey={revalidateKey}
        />
        <View style={styles.dueDateContainer}>
          <Text style={{ color: theme.secondary }}>for</Text>
          <Text style={styles.dueDateLabel} weight="medium">
            {formatDateUI(date)}
          </Text>
          <Button
            title="Edit"
            onPress={() => setModalVisible(true)}
            style={styles.editDateButton}
          />
        </View>
        <DatePickerModal
          visible={modalVisible}
          date={date}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flex: 1,
    justifyContent: 'flex-start',
  },
  dueDateContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    marginBottom: baseTheme.margin[2],
    paddingLeft: baseTheme.margin[3],
  },
  dueDateLabel: { marginLeft: baseTheme.margin[2] },
  editDateButton: { marginLeft: baseTheme.margin[3] },
  newTask: { marginBottom: baseTheme.margin[2], width: '100%' },
});
