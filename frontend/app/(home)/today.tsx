import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatePicker, { DateType } from 'react-native-ui-datepicker';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTask } from '@/lib/context/task';
import { useDashboard } from '@/lib/context/dashboard';
import { useFriends } from '@/lib/context/friends';
import { Colors } from '@/constants/Colors';
import { HTMLTitle } from '@/components/HTMLTitle';
import { useAuth } from '@/lib/context/auth';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface Task {
  id: number;
  task_name: string;
  is_done: boolean;
  due_date: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface DashboardConfig {
  id: number;
  block_type: string;
  value: string;
  position: number;
  user_id: string;
}

export default function TodayTasksList() {
  const colorScheme = useColorScheme();
  const { loadDashboardConfig } = useDashboard();
  const { getFriendTasks } = useFriends();
  const [pinnedFriendsTasks, setPinnedFriendsTasks] = useState<
    Array<{ username: string; tasks: Task[] }>
  >([]);
  // Track collapsed state for each friend's task section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  // Track expanded task list state for each friend
  const [expandedTaskLists, setExpandedTaskLists] = useState<Record<string, boolean>>({});

  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);
  const [tasksInTransition, setTasksInTransition] = useState<Record<number, boolean>>({});
  const [displayedTaskStates, setDisplayedTaskStates] = useState<Record<number, boolean>>({});
  const { tasks, fetchTasks, updateTask, deleteTask } = useTask();
  const timeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const { isLoading: isLoadingAuth, session } = useAuth();

  // Define loadTasks as a useCallback to fix the dependencies issue
  const loadTasks = useCallback(async () => {
    const loadPinnedFriendsTasks = async (configs: DashboardConfig[]) => {
      try {
        const friendConfigs = configs.filter(
          (config: DashboardConfig) => config.block_type === 'friend_tasks',
        );
        if (friendConfigs.length === 0) return;

        const friendsTasksPromises = friendConfigs.map(async (config: DashboardConfig) => {
          const username = config.value;
          try {
            const tasks = await getFriendTasks(username);
            return { username, tasks };
          } catch (error) {
            console.error(`Error fetching tasks for friend ${username}:`, error);
            return { username, tasks: [] };
          }
        });

        const results = await Promise.all(friendsTasksPromises);
        setPinnedFriendsTasks(results);
      } catch (error) {
        console.error("Error loading pinned friends' tasks:", error);
      }
    };

    if (isLoadingAuth || !session) return; // Prevent loading tasks if auth is still loading
    try {
      setIsLoading(true);
      await fetchTasks();

      // Load dashboard configuration
      const configs = await loadDashboardConfig();

      // Load pinned friends' tasks
      await loadPinnedFriendsTasks(configs as unknown as DashboardConfig[]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoadingAuth, session, getFriendTasks, fetchTasks, loadDashboardConfig]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

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
                            borderColor: Colors.dark.tint,
                            color: Colors.dark.white,
                          },
                          today_label: {
                            color: Colors.dark.white,
                          },
                          selected: {
                            backgroundColor: Colors.dark.tint,
                            borderColor: Colors.dark.tint,
                          },
                          selected_label: {
                            color: Colors.dark.white,
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
                          calendar: { backgroundColor: Colors.light.background },
                          today: { borderColor: Colors.light.tint },
                          selected: {
                            backgroundColor: Colors.light.tint,
                            borderColor: Colors.light.tint,
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

  // Filter for tasks due today
  const isTaskDueToday = (task: Task) => {
    if (!task.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(task.due_date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime();
  };

  // Get tasks due today and sort them appropriately
  const getTodayTasks = () => {
    // Get all tasks due today
    const todayTasks = tasks.filter(isTaskDueToday);

    // Sort tasks: incomplete first, then by creation date
    return todayTasks.sort((a, b) => {
      // First, group by completion status (incomplete first)
      const aIsDone = tasksInTransition[a.id] ? displayedTaskStates[a.id] : a.is_done;
      const bIsDone = tasksInTransition[b.id] ? displayedTaskStates[b.id] : b.is_done;

      if (aIsDone !== bIsDone) {
        return aIsDone ? 1 : -1;
      }

      // For incomplete tasks, sort by creation date
      if (!aIsDone) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      // For completed tasks, sort by updated_at
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    });
  };

  // Render the delete action when swiping a task to the right
  const renderRightActions = (taskId: number) => (
    <TouchableOpacity onPress={() => handleDeleteTask(taskId)} style={styles.deleteButton}>
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
  );

  // Toggle the collapsed state for a specific friend's section
  const toggleSectionCollapse = (username: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  // Toggle the expanded state for a friend's task list
  const toggleTaskListExpansion = (username: string) => {
    setExpandedTaskLists(prev => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  // Add proper type for friendData parameter
  const renderFriendTasksSection = (friendData: { username: string; tasks: Task[] }) => {
    if (!friendData.tasks || friendData.tasks.length === 0) return null;

    // Filter for tasks that are due today (both complete and incomplete)
    const filteredTasks = friendData.tasks.filter(isTaskDueToday);
    if (filteredTasks.length === 0) return null;

    // Sort tasks: incomplete first, then completed
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      if (a.is_done !== b.is_done) {
        return a.is_done ? 1 : -1; // Incomplete tasks first
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // Then by creation date
    });

    // Get the collapsed state for this section
    const isCollapsed = collapsedSections[friendData.username] || false;
    // Get the expanded state for this task list
    const isExpanded = expandedTaskLists[friendData.username] || false;

    // Determine how many tasks to show based on expanded state
    const tasksToShow = isExpanded ? sortedTasks : sortedTasks.slice(0, 3);
    const hasMoreTasks = sortedTasks.length > 3;

    return (
      <View key={`friend-${friendData.username}`} style={styles.friendTasksSection}>
        <TouchableOpacity
          style={styles.friendHeader}
          onPress={() => toggleSectionCollapse(friendData.username)}
        >
          <ThemedText style={styles.friendHeaderText}>
            <Text>{friendData.username}&apos;s Tasks</Text>
          </ThemedText>
          <Ionicons
            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={Colors[colorScheme ?? 'light'].text}
          />
        </TouchableOpacity>

        {!isCollapsed && (
          <>
            {tasksToShow.map(task => (
              <TaskItem
                key={task.id}
                id={task.id}
                taskName={task.task_name}
                isDone={task.is_done}
                dueDate={task.due_date}
                readOnly={true}
              />
            ))}

            {hasMoreTasks && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() => toggleTaskListExpansion(friendData.username)}
              >
                <ThemedText style={styles.seeMoreText}>
                  {isExpanded ? 'Show less' : `See ${sortedTasks.length - 3} more tasks`}
                </ThemedText>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  if (isLoading && tasks.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const todayTasks = getTodayTasks();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
    >
      {/* eslint-disable-next-line react-native/no-raw-text */}
      <HTMLTitle>Today</HTMLTitle>
      <Stack.Screen
        options={{
          headerTitle: 'Today',
          headerRight: () =>
            Platform.OS === 'web' ? (
              <TouchableOpacity
                onPress={onRefresh}
                style={styles.refreshButton}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="refresh" size={24} color="#ffffff" />
                )}
              </TouchableOpacity>
            ) : null,
        }}
      />

      <FlatList
        data={todayTasks}
        renderItem={({ item }) => (
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
        )}
        keyExtractor={item => item.id.toString()}
        style={styles.tasksList}
        contentContainerStyle={[
          styles.tasksContent,
          todayTasks.length === 0 && pinnedFriendsTasks.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors[colorScheme ?? 'light'].text}
          />
        }
        ListEmptyComponent={
          pinnedFriendsTasks.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                <Text>No tasks due today</Text>
              </ThemedText>
            </ThemedView>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.friendTasksContainer}>
            {pinnedFriendsTasks.map(renderFriendTasksSection)}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  datePicker: {
    height: 216,
    width: '100%',
  },
  datePickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'web' ? 20 : 0,
    width: '100%',
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
  emptyListContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  friendHeader: {
    alignItems: 'center',
    borderBottomColor: Colors.light.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  friendHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendTasksContainer: {
    marginTop: 24,
  },
  friendTasksSection: {
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButton: {
    fontSize: 16,
  },
  modalContent: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: Platform.OS === 'web' ? 40 : 20,
    width: '100%',
  },
  modalDoneButton: {
    fontWeight: '600',
  },
  modalHeader: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    width: '100%',
  },
  modalOverlay: {
    backgroundColor: Colors.common.overlayBackground,
    flex: 1,
    justifyContent: 'flex-end',
  },
  refreshButton: {
    marginRight: 15,
  },
  seeMoreButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  seeMoreText: {
    fontSize: 14,
    opacity: 0.7,
  },
  tasksContent: {
    gap: 12, // Adding gap between tasks
  },
  tasksList: {
    flex: 1,
  },
  webDatePicker: {
    height: 320,
    width: '100%',
  },
});
