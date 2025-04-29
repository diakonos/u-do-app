import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, FlatList, Alert, ActivityIndicator, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFriends, FriendTask } from '@/lib/context/friends';
import { HTMLTitle } from '@/components/HTMLTitle';
import { TaskItem } from '@/components/tasks/TaskItem';

export default function FriendTasksScreen() {
  const { username } = useLocalSearchParams();
  const [todayTasks, setTodayTasks] = useState<FriendTask[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const secondaryTextColor = useThemeColor({}, 'secondaryText');
  const { getFriendTasks } = useFriends();

  const fetchFriendTasks = useCallback(async () => {
    if (!username) return;

    try {
      setIsRefreshing(true);
      const tasks = await getFriendTasks(username.toString());

      // Filter for tasks due today
      setTodayTasks(tasks);
    } catch (error) {
      console.error('Error fetching friend tasks:', error);
      Alert.alert('Error', 'Failed to load tasks for this friend');
    } finally {
      setIsRefreshing(false);
    }
  }, [username, getFriendTasks]);

  // Fetch tasks when screen loads
  useEffect(() => {
    if (username) {
      fetchFriendTasks();
    }
  }, [username, fetchFriendTasks]);

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
          />
        )}
        keyExtractor={item => item.id.toString()}
        style={styles.tasksList}
        contentContainerStyle={[
          styles.tasksContent,
          todayTasks.length === 0 && styles.emptyListContent,
        ]}
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
    padding: 16,
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
  tasksContent: {
    gap: 12,
    paddingTop: 8,
  },
  tasksList: {
    flex: 1,
  },
});
