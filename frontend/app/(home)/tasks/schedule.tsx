import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text, Alert, Pressable } from 'react-native';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTask } from '@/lib/context/task';
import { HTMLTitle } from '@/components/ui/HTMLTitle';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';

export default function ScheduleTasksScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { scheduledTasks, updateTask, deleteTask } = useTask();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [tempDate, setTempDate] = useState(selectedDate);
  const [showPicker, setShowPicker] = useState(false);

  // State for editing a task's due date
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskDate, setEditingTaskDate] = useState<Date>(new Date());
  const [isUpdatingDueDate, setIsUpdatingDueDate] = useState(false);

  // Helper to format a Date as YYYY-MM-DD in local time
  function formatLocalDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const openPicker = () => {
    setTempDate(selectedDate);
    setShowPicker(true);
  };
  const closePicker = () => {
    setShowPicker(false);
  };
  const confirmPicker = () => {
    setSelectedDate(tempDate);
    closePicker();
  };

  // Handler to confirm the new due date for a task
  const confirmTaskDueDate = async () => {
    if (editingTaskId) {
      setIsUpdatingDueDate(true);
      try {
        // Format date as YYYY-MM-DD string in local time
        const formattedDate = formatLocalDate(editingTaskDate);
        await updateTask(editingTaskId, { due_date: formattedDate });
      } catch (error) {
        Alert.alert('Error', 'Failed to update due date. Please try again.');
        console.error('Failed to update due date:', error);
      } finally {
        setIsUpdatingDueDate(false);
        setEditingTaskId(null);
        closePicker();
      }
    } else {
      closePicker();
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task. Please try again.');
      console.error('Failed to delete task:', error);
    }
  };

  // Format date in long format, e.g., Friday, May 3, 2025
  const longDate = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Modal content for date picker (web and native)
  let datePickerModal: React.ReactNode = null;
  if (showPicker && !editingTaskId) {
    datePickerModal = (
      <ModalSheet
        visible={showPicker}
        onClose={closePicker}
        backgroundColor={Colors[colorScheme].background}
        shadowColor={Colors[colorScheme].black}
      >
        <CalendarDatePicker
          date={tempDate}
          onChange={setTempDate}
          minDate={new Date()}
          colorScheme={colorScheme}
        />
        <View style={styles.modalActions}>
          <Pressable style={styles.modalButton} onPress={closePicker}>
            <ThemedText>Cancel</ThemedText>
          </Pressable>
          <Pressable style={styles.modalButton} onPress={confirmPicker}>
            <ThemedText style={{ color: Colors[colorScheme].brand }}>Confirm</ThemedText>
          </Pressable>
        </View>
      </ModalSheet>
    );
  }

  // Modal for editing a task's due date
  let editTaskDateModal: React.ReactNode = null;
  if (editingTaskId && showPicker) {
    editTaskDateModal = (
      <ModalSheet
        visible={showPicker}
        onClose={closePicker}
        backgroundColor={Colors[colorScheme].background}
        shadowColor={Colors[colorScheme].black}
      >
        <CalendarDatePicker
          date={editingTaskDate}
          onChange={setEditingTaskDate}
          minDate={new Date()}
          colorScheme={colorScheme}
        />
        <View style={styles.modalActions}>
          <Pressable style={styles.modalButton} onPress={closePicker} disabled={isUpdatingDueDate}>
            <ThemedText>Cancel</ThemedText>
          </Pressable>
          <Pressable
            style={styles.modalButton}
            onPress={confirmTaskDueDate}
            disabled={isUpdatingDueDate}
          >
            <ThemedText style={{ color: Colors[colorScheme].brand }}>
              {isUpdatingDueDate ? 'Saving...' : 'Confirm'}
            </ThemedText>
          </Pressable>
        </View>
      </ModalSheet>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* eslint-disable-next-line react-native/no-raw-text */}
      <HTMLTitle>Schedule Tasks</HTMLTitle>
      <Stack.Screen options={{ title: 'Schedule Tasks' }} />
      <View style={styles.pickerContainer}>
        <View style={styles.pickerRow}>
          <ThemedText style={styles.longDate}>{longDate}</ThemedText>
          <ThemedText style={styles.dateButton} onPress={openPicker} accessibilityRole="button">
            Change
          </ThemedText>
        </View>
      </View>
      <View style={styles.newTaskMargin}>
        <TaskItem isNewTask dueDate={formatLocalDate(selectedDate)} />
      </View>
      <FlatList
        data={scheduledTasks}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <Swipeable
            renderRightActions={() => (
              <Pressable style={styles.deleteButton} onPress={() => handleDeleteTask(item.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            )}
          >
            <TaskItem
              id={item.id}
              taskName={item.task_name}
              isDone={item.is_done}
              dueDate={item.due_date}
              readOnly={false}
              hideDueDate={false}
              isInTransition={isUpdatingDueDate && editingTaskId === item.id}
            />
          </Swipeable>
        )}
        style={styles.scheduledList}
      />
      {datePickerModal}
      {editTaskDateModal}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflowY: 'scroll' },
  dateButton: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 6,
    color: Colors.light.brand,
    fontSize: 16,
    marginLeft: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: Colors.light.danger,
    height: '100%',
    justifyContent: 'center',
    width: 80,
  },
  deleteButtonText: {
    color: Colors.light.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  longDate: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
    width: '100%',
  },
  modalButton: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newTaskMargin: { marginBottom: 8 },
  pickerContainer: { marginBottom: 12 },
  pickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 16,
    marginTop: 16,
  },
  scheduledList: { flexGrow: 0, flexShrink: 0 },
});
