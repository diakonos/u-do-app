import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  View,
  StyleSheet,
  Platform,
  FlatList,
  Text,
  Alert,
  Pressable,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatePicker from 'react-native-ui-datepicker';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTask } from '@/lib/context/task';
import { HTMLTitle } from '@/components/HTMLTitle';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

export default function ScheduleTasksScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { tasks, createTask, updateTask, deleteTask } = useTask();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [tempDate, setTempDate] = useState(selectedDate);
  const [showPicker, setShowPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [overlayAnim] = useState(() => new Animated.Value(0));
  const [sheetAnim] = useState(() => new Animated.Value(0));
  const [tasksBeingDeleted, setTasksBeingDeleted] = useState<Record<number, boolean>>({});

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
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start();
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };
  const closePicker = () => {
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start();
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => setShowPicker(false));
  };
  const confirmPicker = () => {
    setSelectedDate(tempDate);
    closePicker();
  };

  // Handler to open the date picker for a specific task
  const handlePressDate = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.due_date) {
      setEditingTaskDate(new Date(task.due_date));
    } else {
      setEditingTaskDate(new Date());
    }
    setEditingTaskId(taskId);
    setShowPicker(true);
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start();
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
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
    setTasksBeingDeleted(prev => ({ ...prev, [taskId]: true }));
    try {
      await deleteTask(taskId);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task. Please try again.');
      console.error('Failed to delete task:', error);
      setTasksBeingDeleted(prev => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
    }
  };

  // Helper for portal root (web only)
  const getPortalRoot = () => {
    if (typeof window !== 'undefined') {
      let portalRoot = document.getElementById('modal-root');
      if (!portalRoot) {
        portalRoot = document.createElement('div');
        portalRoot.id = 'modal-root';
        document.body.appendChild(portalRoot);
      }
      return portalRoot;
    }
    return null;
  };

  // Only show tasks scheduled for a future date (due_date > today)
  const futureTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks
      .filter(t => t.due_date && new Date(t.due_date) > today && !tasksBeingDeleted[t.id])
      .sort((a, b) => {
        const dueA = new Date(a.due_date!).getTime();
        const dueB = new Date(b.due_date!).getTime();
        if (dueA !== dueB) return dueA - dueB;
        // If due dates are equal, sort by creation date
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [tasks, tasksBeingDeleted]);

  const handleCreateTask = async (taskName: string) => {
    setIsCreating(true);
    try {
      await createTask(taskName, formatLocalDate(selectedDate));
    } catch (error) {
      Alert.alert('Error', 'Failed to create task. Please try again.');
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Format date in long format, e.g., Friday, May 3, 2025
  const longDate = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
        {showPicker &&
          (Platform.OS === 'web' ? (
            (() => {
              const portalRoot = getPortalRoot();
              return portalRoot
                ? createPortal(
                    <Animated.View style={[styles.modalOverlay, { opacity: overlayAnim }]}>
                      <Animated.View
                        style={[
                          styles.modalSheet,
                          {
                            transform: [
                              {
                                translateY: sheetAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [Dimensions.get('window').height, 0],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <DatePicker
                          date={tempDate}
                          onChange={e => {
                            setTempDate(new Date(e.date!.toString()));
                          }}
                          mode="single"
                          minDate={new Date()}
                          styles={{
                            today: { backgroundColor: Colors[colorScheme].inputBackground },
                            selected: { backgroundColor: Colors[colorScheme].brand },
                            selected_label: { color: Colors[colorScheme].white },
                          }}
                        />
                        <View style={styles.modalActions}>
                          <Pressable style={styles.modalButton} onPress={closePicker}>
                            <ThemedText>Cancel</ThemedText>
                          </Pressable>
                          <Pressable style={styles.modalButton} onPress={confirmPicker}>
                            <ThemedText style={{ color: Colors[colorScheme].brand }}>
                              Confirm
                            </ThemedText>
                          </Pressable>
                        </View>
                      </Animated.View>
                    </Animated.View>,
                    portalRoot,
                  )
                : null;
            })()
          ) : (
            <Animated.View style={[styles.modalOverlay, { opacity: overlayAnim }]}>
              <Animated.View
                style={[
                  styles.modalSheet,
                  {
                    transform: [
                      {
                        translateY: sheetAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [Dimensions.get('window').height, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={new Date()}
                  onChange={(e, d) => d && setTempDate(d)}
                />
                <View style={styles.nativeDateInfoRow}>
                  <ThemedText style={styles.nativeSelectedText}>
                    <Text>
                      Selected:{' '}
                      {tempDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </ThemedText>
                  <ThemedText style={styles.nativeTodayText}>
                    <Text>
                      Today:{' '}
                      {new Date().toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </ThemedText>
                </View>
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalButton} onPress={closePicker}>
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable style={styles.modalButton} onPress={confirmPicker}>
                    <ThemedText style={{ color: Colors[colorScheme].brand }}>Confirm</ThemedText>
                  </Pressable>
                </View>
              </Animated.View>
            </Animated.View>
          ))}
      </View>
      <View style={styles.newTaskMargin}>
        <TaskItem isNewTask onCreateTask={handleCreateTask} isLoading={isCreating} />
      </View>
      <FlatList
        data={futureTasks}
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
              onPressDate={handlePressDate}
              isInTransition={isUpdatingDueDate && editingTaskId === item.id}
              onUpdateTaskName={async (taskId, newTaskName) => {
                try {
                  await updateTask(taskId, { task_name: newTaskName });
                } catch (error) {
                  Alert.alert('Error', 'Failed to update task name. Please try again.');
                  console.error('Failed to update task name:', error);
                }
              }}
            />
          </Swipeable>
        )}
      />
      {/* Date picker for editing a task's due date */}
      {editingTaskId &&
        showPicker &&
        (Platform.OS === 'web' ? (
          (() => {
            const portalRoot = getPortalRoot();
            if (!portalRoot) return null;
            return createPortal(
              <Animated.View style={[styles.modalOverlay, { opacity: overlayAnim }]}>
                <Animated.View
                  style={[
                    styles.modalSheet,
                    {
                      transform: [
                        {
                          translateY: sheetAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [Dimensions.get('window').height, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <DatePicker
                    date={editingTaskDate}
                    onChange={e => {
                      setEditingTaskDate(new Date(e.date!.toString()));
                    }}
                    mode="single"
                    minDate={new Date()}
                    styles={{
                      today: { backgroundColor: Colors[colorScheme].inputBackground },
                      selected: { backgroundColor: Colors[colorScheme].brand },
                      selected_label: { color: Colors[colorScheme].white },
                    }}
                  />
                  <View style={styles.modalActions}>
                    <Pressable
                      style={styles.modalButton}
                      onPress={closePicker}
                      disabled={isUpdatingDueDate}
                    >
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
                </Animated.View>
              </Animated.View>,
              portalRoot,
            );
          })()
        ) : (
          <Animated.View style={[styles.modalOverlay, { opacity: overlayAnim }]}>
            <Animated.View
              style={[
                styles.modalSheet,
                {
                  transform: [
                    {
                      translateY: sheetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [Dimensions.get('window').height, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <DateTimePicker
                value={editingTaskDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(e, d) => d && setEditingTaskDate(d)}
              />
              <View style={styles.nativeDateInfoRow}>
                <ThemedText style={styles.nativeSelectedText}>
                  <Text>
                    Selected:{' '}
                    {editingTaskDate.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </ThemedText>
                <ThemedText style={styles.nativeTodayText}>
                  <Text>
                    Today:{' '}
                    {new Date().toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </ThemedText>
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalButton}
                  onPress={closePicker}
                  disabled={isUpdatingDueDate}
                >
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
            </Animated.View>
          </Animated.View>
        ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  modalOverlay: {
    alignItems: 'stretch',
    backgroundColor: Colors.common.overlayBackground,
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  modalSheet: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 10,
    maxHeight: '80%',
    overflow: 'visible',
    padding: 12,
    shadowColor: Colors.light.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: '100%',
  },
  nativeDateInfoRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  nativeSelectedText: {
    color: Colors.light.brand,
    fontSize: 12,
  },
  nativeTodayText: {
    fontSize: 12,
  },
  newTaskMargin: { marginBottom: 16 },
  pickerContainer: { marginBottom: 12 },
  pickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 16,
    marginTop: 16,
  },
});
