import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskInputHeader } from '@/components/tasks/TaskInputHeader';
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

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasksInTransition, setTasksInTransition] = useState<Record<number, boolean>>({});
  const [displayedTaskStates, setDisplayedTaskStates] = useState<Record<number, boolean>>({});
  // Track task names during editing
  const [displayedTaskNames, setDisplayedTaskNames] = useState<Record<number, string>>({});
  // Track tasks being deleted optimistically
  const [tasksBeingDeleted, setTasksBeingDeleted] = useState<Record<number, boolean>>({});
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

  const handleUpdateTaskName = async (taskId: number, newTaskName: string) => {
    try {
      // Find the task that's being updated
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      // Don't update if the name is the same
      if (taskToUpdate.task_name === newTaskName) return;

      // Optimistically update the UI first
      setDisplayedTaskNames(prev => ({
        ...prev,
        [taskId]: newTaskName,
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
        await updateTask(taskId, { task_name: newTaskName });

        // Success: clear the transition state
        setTasksInTransition(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        setDisplayedTaskNames(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });
      } catch (error) {
        // On error, revert the optimistic update
        setDisplayedTaskNames(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        // Clear the transition state
        setTasksInTransition(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        // Alert the user about the error
        Alert.alert('Error', 'Failed to update task name. Please try again.');
        console.error('Failed to update task name:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update task name');
      console.error('Failed to update task name:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      // Find the task being deleted
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) return;

      // Mark the task as being deleted optimistically
      setTasksBeingDeleted(prev => ({
        ...prev,
        [taskId]: true,
      }));

      try {
        // Make the actual API request
        await deleteTask(taskId);

        // Success: remove from the deleted tasks tracking
        setTasksBeingDeleted(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });
      } catch (error) {
        // On error, revert the optimistic deletion
        setTasksBeingDeleted(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        // Alert the user about the error
        Alert.alert('Error', 'Failed to delete task. Please try again.');
        console.error('Failed to delete task:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
      console.error('Failed to delete task:', error);
    }
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
    const todayTasks = tasks
      .filter(task => !tasksBeingDeleted[task.id] && isTaskDueToday(task))
      .sort((a, b) => {
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
      })
      .map(task => ({
        ...task,
        task_name: displayedTaskNames[task.id] || task.task_name,
      }));

    return todayTasks;
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

    // Count completed tasks
    const completedTasksCount = filteredTasks.filter(task => task.is_done).length;

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
    const tasksToShow = isExpanded ? sortedTasks : sortedTasks.slice(0, 5);
    const hasMoreTasks = sortedTasks.length > 5;

    return (
      <View key={`friend-${friendData.username}`} style={styles.friendTasksSection}>
        <TouchableOpacity
          style={styles.friendHeader}
          onPress={() => toggleSectionCollapse(friendData.username)}
        >
          <ThemedText style={styles.friendHeaderText}>
            {friendData.username}&apos;s Tasks
          </ThemedText>
          <ThemedText style={styles.taskCount}>
            {completedTasksCount} / {filteredTasks.length}
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
                isInTransition={tasksInTransition[task.id]}
                readOnly={true}
                hideDueDate={true}
              />
            ))}

            {hasMoreTasks && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() => toggleTaskListExpansion(friendData.username)}
              >
                <ThemedText style={styles.seeMoreText}>
                  {isExpanded ? 'Show less' : `See ${sortedTasks.length - 5} more tasks`}
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
    <ThemedView
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
          <Swipeable key={item.id} renderRightActions={() => renderRightActions(item.id)}>
            <TaskItem
              id={item.id}
              taskName={item.task_name}
              isDone={item.is_done}
              dueDate={item.due_date}
              isInTransition={tasksInTransition[item.id]}
              onToggleComplete={toggleTaskCompletion}
              onUpdateTaskName={handleUpdateTaskName}
              onDeleteTask={handleDeleteTask}
              readOnly={false}
              hideDueDate={true}
            />
          </Swipeable>
        )}
        keyExtractor={item => item.id.toString()}
        style={styles.tasksList}
        contentContainerStyle={[
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
          <View>
            <TaskInputHeader />
            <View style={styles.friendTasksContainer}>
              {pinnedFriendsTasks.map(renderFriendTasksSection)}
            </View>
          </View>
        }
      />
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
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  friendHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendTasksContainer: { marginTop: 16 },
  friendTasksSection: {
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  taskCount: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 'auto',
    marginRight: 8,
    opacity: 0.7,
  },
  tasksList: {
    flex: 1,
    paddingTop: 8,
  },
});
