import React, { Suspense, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useScheduledTasks } from '@/db/hooks/useScheduledTasks';
import { useCurrentUserId } from '@/lib/auth';
import NewTaskInput from '@/components/NewTaskInput';
import DatePicker from '@/components/DatePicker';
import { formatDateUI } from '@/lib/date';
import Button from '@/components/Button';
import { ModalSheet } from '@/components/ModalSheet';

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
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

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
        <Button
          title="Edit"
          onPress={() => {
            setPendingDate(date);
            setModalVisible(true);
          }}
          style={styles.editDateButton}
        />
      </View>
      <ModalSheet visible={modalVisible} onClose={() => setModalVisible(false)}>
        <View style={styles.modal}>
          <DatePicker date={pendingDate || date} onChange={d => setPendingDate(d)} />
          <View style={styles.buttons}>
            <Button title="Cancel" onPress={() => setModalVisible(false)} />
            <Button
              title="Confirm"
              onPress={() => {
                if (pendingDate) setDate(pendingDate);
                setModalVisible(false);
              }}
            />
          </View>
        </View>
      </ModalSheet>
      <Suspense fallback={<TaskListLoading />}>
        <ScheduledTaskList />
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  buttons: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: baseTheme.margin[2],
    marginTop: baseTheme.margin[3],
    width: '100%',
  },
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
  modal: { paddingVertical: baseTheme.margin[3] },
  newTask: { marginBottom: baseTheme.margin[2] },
  title: { marginBottom: baseTheme.margin[4], marginLeft: baseTheme.margin[3] },
});
