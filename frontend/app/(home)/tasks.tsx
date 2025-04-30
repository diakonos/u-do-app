import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  SectionList,
  Alert,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatePicker, { DateType } from 'react-native-ui-datepicker';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Collapsible } from '@/components/Collapsible';
import { TaskInputHeader } from '@/components/tasks/TaskInputHeader';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTask } from '@/lib/context/task';
import { Colors } from '@/constants/Colors';
import { HTMLTitle } from '@/components/HTMLTitle';
import { useAuth } from '@/lib/context/auth';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Import an icon library
import { ThemedView } from '@/components/ThemedView';

interface Task {
  id: number;
  task_name: string;
  is_done: boolean;
  due_date: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function TodoList() {
  const colorScheme = useColorScheme() ?? 'light';

  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);
  const [tasksInTransition, setTasksInTransition] = useState<Record<number, boolean>>({});
  // Keep track of the displayed completion state (for visual purposes only)
  const [displayedTaskStates, setDisplayedTaskStates] = useState<Record<number, boolean>>({});
  const { tasks, fetchTasks, updateTask, deleteTask } = useTask();
  const timeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const { isLoading: isLoadingAuth, session } = useAuth();

  // Define loadTasks as a useCallback to fix the dependencies issue
  const loadTasks = useCallback(async () => {
    if (isLoadingAuth || !session) return; // Prevent loading tasks if auth is still loading
    try {
      setIsLoading(true);
      await fetchTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to load tasks');
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoadingAuth, session, fetchTasks, setIsLoading]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]); // Now loadTasks is properly memoized

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]); // Added loadTasks dependency

  const toggleTaskCompletion = async (taskId: number, isDone: boolean) => {
    try {
      // Find the task that's being toggled
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      // Optimistically update the UI first
      setDisplayedTaskStates(prev => ({
        ...prev,
        [taskId]: isDone,
      }));

      // Set task as in transition state
      setTasksInTransition(prev => ({
        ...prev,
        [taskId]: true,
      }));

      // Clear any existing timeout for this task
      if (timeoutsRef.current[taskId]) {
        clearTimeout(timeoutsRef.current[taskId]);
      }

      try {
        // Make the actual API request
        await updateTask(taskId, { is_done: isDone });

        // Success: clear the transition state
        setTasksInTransition(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        setDisplayedTaskStates(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });
      } catch (error) {
        // On error, revert the optimistic update
        setDisplayedTaskStates(prev => ({
          ...prev,
          [taskId]: !isDone, // Revert to the original state
        }));

        // Clear the transition state
        setTasksInTransition(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        // Alert the user about the error
        Alert.alert('Error', 'Failed to update task. Please try again.');
        console.error('Failed to update task:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      setShowDatePicker(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
      console.error('Failed to delete task:', error);
    }
  };

  const updateDueDate = async (taskId: number, date: Date) => {
    try {
      await updateTask(taskId, {
        due_date: date.toString(),
      });
      if (Platform.OS === 'android') {
        setShowDatePicker(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update due date');
      console.error('Failed to update due date:', error);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const renderDatePicker = (item: Task) => {
    if (showDatePicker !== item.id.toString()) return null;

    const defaultDate = item.due_date ? new Date(item.due_date) : new Date();
    defaultDate.setHours(0, 0, 0, 0);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDatePicker === item.id.toString()}
        onRequestClose={() => {
          setShowDatePicker(null);
          setTempDueDate(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDatePicker(null);
            setTempDueDate(null);
          }}
        >
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={[
              styles.modalContent,
              { backgroundColor: Colors[colorScheme ?? 'light'].background },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: Colors[colorScheme ?? 'light'].icon + '40' },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowDatePicker(null);
                  setTempDueDate(null);
                }}
              >
                <Text style={[styles.modalButton, { color: Colors[colorScheme ?? 'light'].tint }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const dateToSave = tempDueDate || defaultDate;
                  updateDueDate(item.id, dateToSave);
                  setShowDatePicker(null);
                  setTempDueDate(null);
                }}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.modalDoneButton,
                    { color: Colors[colorScheme ?? 'light'].tint },
                  ]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerWrapper}>
              {Platform.OS === 'web' ? (
                <DatePicker
                  style={{
                    ...styles.webDatePicker,
                    backgroundColor:
                      colorScheme === 'dark' ? Colors.dark.background : Colors.light.background,
                  }}
                  date={tempDueDate ? tempDueDate : defaultDate}
                  mode="single"
                  onChange={(params: { date: DateType }) => {
                    setTempDueDate(params.date as Date);
                  }}
                  styles={{
                    // Dark mode styles for the datepicker with more specific targeting
                    ...(colorScheme === 'dark'
                      ? {
                          day: {
                            color: Colors.dark.white,
                            borderColor: Colors.dark.border,
                          },
                          day_label: {
                            color: Colors.dark.white,
                          },
                          today: {
                            backgroundColor: Colors.dark.inputBackground,
                            color: Colors.dark.white,
                          },
                          today_label: {
                            color: 'red',
                          },
                          selected: {
                            backgroundColor: Colors.dark.tint,
                            borderColor: Colors.dark.tint,
                          },
                          selected_label: {
                            color: 'red',
                          },
                          header: {
                            color: Colors.dark.white,
                            backgroundColor: Colors.dark.background,
                          },
                          month_label: {
                            color: Colors.dark.white,
                          },
                          year: {
                            color: Colors.dark.white,
                          },
                          month: {
                            backgroundColor: Colors.dark.background,
                            borderColor: Colors.dark.border,
                          },
                          year_label: {
                            color: Colors.dark.white,
                          },
                          month_selector_label: {
                            color: Colors.dark.white,
                          },
                          year_selector_label: {
                            color: Colors.dark.white,
                          },
                          weekdays: {
                            backgroundColor: Colors.dark.background,
                          },
                          weekday_label: {
                            color: Colors.dark.white,
                          },
                        }
                      : {
                          // Light mode defaults
                          calendar: { backgroundColor: Colors[colorScheme].background },
                          today: { backgroundColor: Colors[colorScheme].inputBackground },
                          selected: {
                            backgroundColor: Colors[colorScheme].tint,
                            borderColor: Colors[colorScheme].tint,
                          },
                          selected_label: {
                            color: Colors[colorScheme].white,
                          },
                        }),
                  }}
                />
              ) : (
                <DateTimePicker
                  testID="datePicker"
                  value={tempDueDate || defaultDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={getMinDate()}
                  onChange={(event, date) => {
                    if (event.type === 'set' && date) {
                      console.log('Selected date:', date);
                      if (Platform.OS === 'android') {
                        updateDueDate(item.id, date);
                        setShowDatePicker(null);
                      } else {
                        setTempDueDate(date);
                      }
                    }
                  }}
                  style={[
                    styles.datePicker,
                    colorScheme === 'dark' ? { backgroundColor: Colors.dark.background } : {},
                  ]}
                  themeVariant={colorScheme!}
                />
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const categorizeTask = (task: Task): 'overdue' | 'today' | 'later' => {
    if (!task.due_date) return 'later';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(task.due_date);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate < today) return 'overdue';
    if (taskDate.getTime() === today.getTime()) return 'today';
    return 'later';
  };

  const getGroupedTasks = () => {
    // Process tasks with their displayed state during transitions
    const processedTasks = tasks.map(task => ({
      ...task,
      displayed_is_done: tasksInTransition[task.id] ? displayedTaskStates[task.id] : task.is_done,
    }));

    // Helper to check if a date is today
    const isTaskDueToday = (task: Task) => {
      if (!task.due_date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.due_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    };

    // --- Today's Tasks ---
    const allTodayTasks = processedTasks.filter(isTaskDueToday);
    const todayIncompleteTasks = allTodayTasks.filter(task => !task.displayed_is_done);
    const todayCompleteTasks = allTodayTasks.filter(task => task.displayed_is_done);

    // Sort Today's Incomplete Tasks by creation date
    const sortIncomplete = (taskGroup: Task[]) => {
      return [...taskGroup].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    };
    const sortedTodayIncomplete = sortIncomplete(todayIncompleteTasks);

    // Sort Today's Complete Tasks by updated_at (oldest to newest)
    const sortedTodayComplete = [...todayCompleteTasks].sort(
      (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    );

    // Combine incomplete and complete for the 'Today' section
    const finalTodayTasks = [...sortedTodayIncomplete, ...sortedTodayComplete];

    // --- Other Tasks (Not due today) ---
    const otherTasks = processedTasks.filter(task => !isTaskDueToday(task));

    // Overdue (Incomplete, Not Today)
    const overdueTasks = otherTasks.filter(
      task => !task.displayed_is_done && categorizeTask(task) === 'overdue',
    );
    const sortedOverdue = sortIncomplete(overdueTasks);

    // Later (Incomplete, Not Today)
    const laterTasks = otherTasks.filter(
      task => !task.displayed_is_done && categorizeTask(task) === 'later',
    );
    const sortedLater = sortIncomplete(laterTasks);

    // Done (Complete, Not Today)
    const doneTasks = otherTasks.filter(task => task.displayed_is_done);
    const sortedDone = [...doneTasks].sort(
      (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    );

    // --- Construct Sections ---
    // Filter out sections with no data to avoid rendering empty headers
    return [
      { title: 'Overdue', data: sortedOverdue },
      { title: 'Today', data: finalTodayTasks },
      { title: 'Later', data: sortedLater },
      { title: 'Done', data: sortedDone },
    ].filter(section => section.data.length > 0);
  };

  const renderRightActions = (taskId: number) => (
    <TouchableOpacity onPress={() => handleDeleteTask(taskId)} style={styles.deleteButton}>
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
  );

  if (isLoading && tasks.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
    >
      {/* eslint-disable-next-line react-native/no-raw-text */}
      <HTMLTitle>Tasks</HTMLTitle>
      <Stack.Screen
        options={{
          title: 'Tasks',
          headerRight: () =>
            Platform.OS === 'web' ? (
              <TouchableOpacity
                onPress={onRefresh}
                style={styles.refreshButton}
                disabled={refreshing} // Disable button while refreshing
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name="refresh"
                    size={24}
                    color="#ffffff" // Set color to white
                  />
                )}
              </TouchableOpacity>
            ) : null,
        }}
      />
      <SectionList
        ListHeaderComponent={<TaskInputHeader />}
        // Use RefreshControl for native pull-to-refresh
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined // No RefreshControl on web
        }
        // Remove refreshing/onRefresh props from SectionList if using RefreshControl
        // refreshing={refreshing || (isLoading && tasks.length > 0)}
        // onRefresh={onRefresh}
        sections={getGroupedTasks()}
        keyExtractor={item => item.id.toString()}
        renderSectionHeader={({ section: { title, data } }) => (
          <Collapsible
            title={`${title} (${data.length})`}
            defaultOpen={title !== 'Done'}
            titleStyle={{ color: Colors[colorScheme ?? 'light'].text }}
          >
            {data.map(item => (
              <Swipeable
                key={item.id}
                renderRightActions={() => renderRightActions(item.id)}
                containerStyle={{}}
              >
                <TaskItem
                  id={item.id}
                  taskName={item.task_name}
                  isDone={item.is_done}
                  dueDate={item.due_date}
                  isInTransition={tasksInTransition[item.id]}
                  onToggleComplete={toggleTaskCompletion}
                  onPressDate={id => setShowDatePicker(id.toString())}
                />
                {renderDatePicker(item)}
              </Swipeable>
            ))}
          </Collapsible>
        )}
        renderItem={() => null}
        stickySectionHeadersEnabled={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    // We'll set the background color dynamically based on theme in the component
    flex: 1,
  },
  datePicker: {
    // We'll set background color dynamically in the component
    height: 216,
    width: '100%', // Make date picker fill the screen width
  },
  datePickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'web' ? 20 : 0,
    width: '100%', // Add bottom padding on web
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: Colors.light.danger, // Use theme color instead of hardcoded 'red'
    height: '100%',
    justifyContent: 'center',
    width: 80,
  },
  deleteButtonText: {
    color: Colors.light.white, // Use theme color instead of hardcoded '#fff'
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButton: {
    // We'll set color dynamically in the component
    fontSize: 16,
  },
  modalContent: {
    // We'll set background color dynamically in the component
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: Platform.OS === 'web' ? 40 : 20, // Increased padding for web
    width: '100%', // Ensure the modal content fills the screen width
  },
  modalDoneButton: {
    fontWeight: '600',
  },
  modalHeader: {
    // We'll set border color dynamically in the component
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    width: '100%', // Ensure header spans the full width
  },
  modalOverlay: {
    backgroundColor: Colors.common.overlayBackground, // Use theme color instead of rgba literal
    flex: 1,
    justifyContent: 'flex-end',
  },
  refreshButton: { marginRight: 15 },
  webDatePicker: {
    height: 320,
    width: '100%',
  },
});
