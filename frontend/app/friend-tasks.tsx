import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, FlatList, RefreshControl, Alert, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFriends, FriendTask } from '@/lib/context/friends';

export default function FriendTasksScreen() {
  const { username, userId } = useLocalSearchParams();
  const [todayTasks, setTodayTasks] = useState<FriendTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const { getFriendTasks } = useFriends();

  const fetchFriendTasks = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      
      const tasks = await getFriendTasks(userId.toString());
      console.log('Friend tasks:', tasks);
      
      // Filter for tasks due today
      setTodayTasks(tasks);
    } catch (error) {
      console.error('Error fetching friend tasks:', error);
      Alert.alert('Error', 'Failed to load tasks for this friend');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, getFriendTasks]);

  // Fetch tasks when screen loads
  useEffect(() => {
    if (userId) {
      fetchFriendTasks();
    }
  }, [userId, fetchFriendTasks]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFriendTasks();
  }, [fetchFriendTasks]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{
          title: username?.toString() || 'Friend\'s Tasks',
          headerTintColor: '#ffffff',
          headerStyle: {
            backgroundColor: '#6936D8',
          },
        }} 
      />

      {isLoading && !isRefreshing ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6936D8" />
        </ThemedView>
      ) : (
        <FlatList
          data={todayTasks}
          renderItem={({ item }) => (
            <ThemedView style={styles.taskItem}>
              <TouchableOpacity 
                style={styles.checkbox}
                // Read-only - we don't allow toggling friend's tasks
                activeOpacity={1}
              >
                <View style={[
                  styles.checkboxInner, 
                  item.is_done && styles.checkboxChecked
                ]} />
              </TouchableOpacity>
              <ThemedView style={styles.taskInfo}>
                <ThemedText style={[
                  styles.taskName,
                  item.is_done && styles.completedTask
                ]}>
                  {item.task_name}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          )}
          keyExtractor={(item) => item.id.toString()}
          style={styles.tasksList}
          contentContainerStyle={[
            styles.tasksContent,
            todayTasks.length === 0 && styles.emptyListContent
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#6936D8']}
              tintColor={textColor}
            />
          }
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                No tasks due today
              </ThemedText>
            </ThemedView>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    gap: 12,
    paddingTop: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  taskItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedTask: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  checkboxChecked: {
    backgroundColor: '#6936D8',
  },
});