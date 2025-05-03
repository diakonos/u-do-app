import { Link } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TaskItem } from '@/components/tasks/TaskItem';
import { type Task, useTask } from '@/lib/context/task';
import { Colors } from '@/constants/Colors';
import { HTMLTitle } from '@/components/ui/HTMLTitle';
import { useAuth } from '@/lib/context/auth';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TodoList() {
  const colorScheme = useColorScheme();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isArchiveSectionCollapsed, setIsArchiveSectionCollapsed] = useState(true);
  const { tasks, archivedTasks, fetchTasks, deleteTask } = useTask();
  const { isLoading: isLoadingAuth, session } = useAuth();

  const loadTasks = useCallback(async () => {
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
  }, [isLoadingAuth, session, fetchTasks, setIsLoading]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  const handleDeleteTask = async (taskId: number) => {
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) return;

      try {
        await deleteTask(taskId);
      } catch (error) {
        Alert.alert('Error', 'Failed to delete task. Please try again.');
        console.error('Failed to delete task:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
      console.error('Failed to delete task:', error);
    }
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

  const incompleteTasks = tasks;
  const completeTasks = archivedTasks;

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* eslint-disable-next-line react-native/no-raw-text */}
      <HTMLTitle>Tasks</HTMLTitle>
      <Stack.Screen
        options={{
          title: 'Tasks',
          headerRight: () => (
            <View style={styles.headerRightRow}>
              <Link href="/tasks/schedule" style={styles.calendarLink}>
                <Ionicons name="calendar" size={24} color="#ffffff" style={styles.calendarIcon} />
              </Link>
            </View>
          ),
        }}
      />

      <FlatList
        data={incompleteTasks}
        renderItem={({ item }) => renderTaskItem(item)}
        keyExtractor={item => item.id.toString()}
        style={styles.tasksList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors[colorScheme].text}
          />
        }
      />

      <TaskItem isNewTask />

      {completeTasks.length > 0 && (
        <View style={styles.doneSection}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setIsArchiveSectionCollapsed(!isArchiveSectionCollapsed)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderContent}>
              <ThemedText style={styles.sectionHeaderText}>
                {`Archive (${completeTasks.length})`}
              </ThemedText>
              <Ionicons
                name={isArchiveSectionCollapsed ? 'chevron-down' : 'chevron-up'}
                size={18}
                color={Colors[colorScheme].text}
                style={styles.sectionHeaderIcon}
              />
            </View>
          </TouchableOpacity>

          {!isArchiveSectionCollapsed && (
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
  calendarIcon: {
    marginRight: 10,
  },
  calendarLink: {
    height: 24,
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
  doneSection: {
    marginTop: 8,
  },
  headerRightRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    flexShrink: 0,
    paddingTop: 8,
  },
});
