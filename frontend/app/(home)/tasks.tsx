import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TaskInputHeader } from '@/components/tasks/TaskInputHeader';
import { TaskItem } from '@/components/tasks/TaskItem';
import { Task, useTask } from '@/lib/context/task';
import { Colors } from '@/constants/Colors';
import { HTMLTitle } from '@/components/HTMLTitle';
import { useAuth } from '@/lib/context/auth';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function TodoList() {
  const colorScheme = useColorScheme() ?? 'light';

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasksInTransition, setTasksInTransition] = useState<Record<number, boolean>>({});
  // Keep track of the displayed completion state (for visual purposes only)
  const [displayedTaskStates, setDisplayedTaskStates] = useState<Record<number, boolean>>({});
  // Add state for tracking collapsed sections - Done section starts collapsed by default
  const [isDoneSectionCollapsed, setIsDoneSectionCollapsed] = useState(true);
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
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
      console.error('Failed to delete task:', error);
    }
  };

  // Process and filter tasks
  const processFilteredTasks = () => {
    // Get current date without time for date comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out tasks with future due dates first
    const filteredTasks = tasks.filter(task => {
      // Include tasks with no due date or due date today or in the past
      if (!task.due_date) return true;

      const taskDueDate = new Date(task.due_date);
      taskDueDate.setHours(0, 0, 0, 0);

      return taskDueDate <= today;
    });

    // Process tasks with their displayed state during transitions
    return filteredTasks.map(task => ({
      ...task,
      displayed_is_done: tasksInTransition[task.id] ? displayedTaskStates[task.id] : task.is_done,
    }));
  };

  // Get incomplete tasks
  const getIncompleteTasks = () => {
    const processedTasks = processFilteredTasks();
    const incompleteTasks = processedTasks.filter(task => !task.displayed_is_done);

    // Sort incomplete tasks by creation date (oldest to newest)
    return [...incompleteTasks].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  };

  // Get complete tasks
  const getCompleteTasks = () => {
    const processedTasks = processFilteredTasks();
    const completeTasks = processedTasks.filter(task => task.displayed_is_done);

    // Sort complete tasks by updated_at (newest to oldest)
    return [...completeTasks].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  };

  const renderTaskItem = (item: Task) => {
    return (
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
          hideDueDate={true}
        />
      </Swipeable>
    );
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

  const incompleteTasks = getIncompleteTasks();
  const completeTasks = getCompleteTasks();

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

      {/* Add extra padding below the navigation bar */}
      <View style={styles.headerPadding} />

      {/* Use RefreshControl for pull-to-refresh */}
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
        <View />
      </RefreshControl>

      {/* Active Tasks section */}
      <FlatList
        data={incompleteTasks}
        renderItem={({ item }) => renderTaskItem(item)}
        keyExtractor={item => item.id.toString()}
        style={styles.tasksList}
      />

      {/* Task Input - placed between incomplete tasks and completed tasks */}
      <TaskInputHeader />

      {/* Done section with collapsible header */}
      {completeTasks.length > 0 && (
        <View style={styles.doneSection}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setIsDoneSectionCollapsed(!isDoneSectionCollapsed)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderContent}>
              <ThemedText style={styles.sectionHeaderText}>
                {`Done (${completeTasks.length})`}
              </ThemedText>
              <Ionicons
                name={isDoneSectionCollapsed ? 'chevron-down' : 'chevron-up'}
                size={18}
                color={Colors[colorScheme ?? 'light'].text}
                style={styles.sectionHeaderIcon}
              />
            </View>
          </TouchableOpacity>

          {/* Completed tasks list - only shown when not collapsed */}
          {!isDoneSectionCollapsed && (
            <FlatList
              data={completeTasks}
              renderItem={({ item }) => renderTaskItem(item)}
              keyExtractor={item => item.id.toString()}
            />
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  doneSection: {
    marginTop: 8,
  },
  headerPadding: {
    padding: 10, // Adjust the value as needed
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: { marginRight: 15 },
  sectionHeader: {
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeaderIcon: {
    marginLeft: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  tasksList: {
    flexGrow: 0,
  },
});
