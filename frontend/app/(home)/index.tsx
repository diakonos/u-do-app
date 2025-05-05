import React, { useState, useEffect, useCallback } from 'react';
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
import { useTask } from '@/lib/context/task';
import { useDashboard } from '@/lib/context/dashboard';
import { useFriends } from '@/lib/context/friends';
import { Colors } from '@/constants/Colors';
import { HTMLTitle } from '@/components/ui/HTMLTitle';
import { useAuth } from '@/lib/context/auth';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';

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
  const { dashboardConfigs, loadDashboardConfig } = useDashboard();
  const { getFriendTasks } = useFriends();
  const router = useRouter();
  const [pinnedFriendsTasks, setPinnedFriendsTasks] = useState<
    Array<{ username: string; tasks: Task[] }>
  >([]);
  // Track collapsed state for each friend's task section
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  // Track expanded task list state for each friend
  const [expandedTaskLists, setExpandedTaskLists] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { tasks, fetchTasks, deleteTask } = useTask();
  const { isLoading: isLoadingAuth, session } = useAuth();

  const today = new Date();
  const longDate = today.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const loadUserTasks = useCallback(async () => {
    if (isLoadingAuth || !session) return;
    try {
      setIsLoading(true);
      await fetchTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to load tasks');
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoadingAuth, session, fetchTasks]);

  const loadPinnedFriendsTasks = useCallback(async () => {
    try {
      let configs = dashboardConfigs.filter(
        (config: DashboardConfig) => config.block_type === 'friend_tasks',
      );
      if (!configs || configs.length === 0) {
        setPinnedFriendsTasks([]);
        return;
      }
      const friendsTasksPromises = configs.map(async (config: DashboardConfig) => {
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
  }, [dashboardConfigs, getFriendTasks]);

  useEffect(() => {
    loadUserTasks();
    loadDashboardConfig().then(loadPinnedFriendsTasks);
  }, [loadUserTasks, loadPinnedFriendsTasks, loadDashboardConfig]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadUserTasks();
    await loadDashboardConfig();
    await loadPinnedFriendsTasks();
    setRefreshing(false);
  }, [loadDashboardConfig, loadPinnedFriendsTasks, loadUserTasks]);

  const handleDeleteTask = async (taskId: number) => {
    try {
      // Find the task being deleted
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) return;

      try {
        // Make the actual API request
        await deleteTask(taskId);
      } catch (error) {
        // Alert the user about the error
        Alert.alert('Error', 'Failed to delete task. Please try again.');
        console.error('Failed to delete task:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
      console.error('Failed to delete task:', error);
    }
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

    // Today's date at 00:00:00 for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter tasks according to the rules:
    // 1. Incomplete with no due date
    // 2. Incomplete with due date before or equal to today
    // 3. Complete with updated_at of today
    const filteredTasks = friendData.tasks.filter(task => {
      if (!task.is_done) {
        if (!task.due_date) return true;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate <= today) return true;
      } else {
        // Completed tasks with updated_at of today
        const updatedDate = new Date(task.updated_at);
        updatedDate.setHours(0, 0, 0, 0);
        if (updatedDate.getTime() === today.getTime()) return true;
      }
      return false;
    });

    if (filteredTasks.length === 0) return null;

    // Count completed tasks (from filtered)
    const completedTasksCount = filteredTasks.filter(task => task.is_done).length;

    // Sort tasks: by creation date ascending
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
            color={Colors[colorScheme].text}
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

  const todayTasks = tasks;

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* eslint-disable-next-line react-native/no-raw-text */}
      <HTMLTitle>Today</HTMLTitle>
      <Stack.Screen
        options={{
          headerTitle: `Today - ${longDate}`,
          headerRight: () => (
            <View style={styles.headerRightRow}>
              <TouchableOpacity
                onPress={() => router.push('/(home)/tasks/schedule')}
                style={styles.calendarButton}
                accessibilityLabel="Schedule tasks"
              >
                <Ionicons name="calendar" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ),
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
            tintColor={Colors[colorScheme].text}
          />
        }
        ListEmptyComponent={
          pinnedFriendsTasks.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                <Text>No incomplete tasks</Text>
              </ThemedText>
            </ThemedView>
          ) : null
        }
        ListFooterComponent={
          <View>
            <TaskItem isNewTask />
          </View>
        }
      />
      <View style={styles.friendTasksContainer}>
        {pinnedFriendsTasks.map(renderFriendTasksSection)}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  calendarButton: {
    marginLeft: Platform.OS === 'web' ? 0 : 15,
    marginRight: 10,
  },
  container: {
    flex: 1,
    overflowY: 'scroll',
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
  headerRightRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    flexGrow: 0,
    flexShrink: 0,
    paddingTop: 8,
  },
});
