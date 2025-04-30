import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFriends, FriendTask } from '@/lib/context/friends';
import { useDashboard } from '@/lib/context/dashboard';
import { HTMLTitle } from '@/components/HTMLTitle';
import { TaskItem } from '@/components/tasks/TaskItem';

export default function FriendTasksScreen() {
  const { username } = useLocalSearchParams();
  const [todayTasks, setTodayTasks] = useState<FriendTask[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isTogglingPin, setIsTogglingPin] = useState(false);

  const secondaryTextColor = useThemeColor({}, 'secondaryText');
  const whiteColor = useThemeColor({}, 'white');
  const brandColor = useThemeColor({}, 'brand');
  const tintColor = useThemeColor({}, 'tint');

  const { getFriendTasks } = useFriends();
  const {
    dashboardConfigs,
    loadDashboardConfig,
    checkIfConfigExists,
    createDashboardConfig,
    deleteDashboardConfig,
  } = useDashboard();

  const fetchFriendTasks = useCallback(async () => {
    if (!username) return;

    try {
      setIsRefreshing(true);
      const tasks = await getFriendTasks(username.toString());

      // Sort tasks:
      // 1. First group by completion status (incomplete first)
      // 2. Sort incomplete tasks by creation date
      // 3. Sort complete tasks by updated date
      const sortedTasks = [...tasks].sort((a, b) => {
        // First, group by completion status (incomplete first)
        if (a.is_done !== b.is_done) {
          return a.is_done ? 1 : -1;
        }

        // For incomplete tasks, sort by creation date
        if (!a.is_done) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }

        // For complete tasks, sort by updated_at date
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      });

      setTodayTasks(sortedTasks);
    } catch (error) {
      console.error('Error fetching friend tasks:', error);
      Alert.alert('Error', 'Failed to load tasks for this friend');
    } finally {
      setIsRefreshing(false);
    }
  }, [username, getFriendTasks]);

  // Check if this friend is pinned to dashboard
  useEffect(() => {
    if (!username || dashboardConfigs.length === 0) return;

    const isPinnedToToday = checkIfConfigExists('friend_tasks', username.toString());
    setIsPinned(isPinnedToToday);
  }, [username, dashboardConfigs, checkIfConfigExists]);

  // Fetch tasks when screen loads
  useEffect(() => {
    if (username) {
      fetchFriendTasks();
      loadDashboardConfig(); // Load dashboard configs to check if this friend is pinned
    }
  }, [username, fetchFriendTasks, loadDashboardConfig]);

  // Handle pin/unpin action
  const togglePinToToday = async () => {
    if (!username) return;

    try {
      setIsTogglingPin(true);

      if (isPinned) {
        // Unpin - delete the config
        await deleteDashboardConfig('friend_tasks', username.toString());
        setIsPinned(false);
      } else {
        // Pin - create the config
        await createDashboardConfig('friend_tasks', username.toString());
        setIsPinned(true);
      }
    } catch (error) {
      console.error('Error toggling pin status:', error);
      Alert.alert('Error', 'Failed to update dashboard configuration');
    } finally {
      setIsTogglingPin(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchFriendTasks();
  }, [fetchFriendTasks]);

  return (
    <ThemedView style={styles.container}>
      <HTMLTitle>
        <Text>{`${username}'s tasks`}</Text>
      </HTMLTitle>
      <Stack.Screen
        options={{
          title: username ? `${username}\'s tasks` : "Friend's Tasks",
          headerBackTitle: 'Friends',
          headerRight: () => (
            <TouchableOpacity
              onPress={togglePinToToday}
              disabled={isTogglingPin}
              style={[styles.pinButton, { backgroundColor: isPinned ? brandColor : tintColor }]}
            >
              {isTogglingPin ? (
                <ActivityIndicator size="small" color={whiteColor} />
              ) : (
                <Text style={[styles.pinButtonText, { color: whiteColor }]}>
                  {isPinned ? 'Pinned to Today' : 'Pin to Today'}
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={todayTasks}
        renderItem={({ item }) => (
          <TaskItem
            id={item.id}
            taskName={item.task_name}
            isDone={item.is_done}
            dueDate={item.due_date}
            readOnly={true}
            hideDueDate={true}
          />
        )}
        keyExtractor={item => item.id.toString()}
        style={styles.tasksList}
        contentContainerStyle={todayTasks.length === 0 && styles.emptyListContent}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <ThemedText
              style={{
                ...styles.emptyStateText,
                color: secondaryTextColor,
              }}
            >
              {isRefreshing ? <ActivityIndicator size="large" /> : 'No tasks due today'}
            </ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  pinButton: {
    borderRadius: 4,
    marginRight: 8,
    padding: 8,
  },
  pinButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tasksList: {
    flex: 1,
    paddingTop: 8,
  },
});
