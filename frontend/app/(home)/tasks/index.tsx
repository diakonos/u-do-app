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
  RefreshControl,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TaskItem } from '@/components/tasks/TaskItem';
import { Task, useTask } from '@/lib/context/task';
import { Colors } from '@/constants/Colors';
import { HTMLTitle } from '@/components/HTMLTitle';
import { useAuth } from '@/lib/context/auth';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Link } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TodoList() {
  const colorScheme = useColorScheme();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasksInTransition, setTasksInTransition] = useState<Record<number, boolean>>({});
  const [displayedTaskStates, setDisplayedTaskStates] = useState<Record<number, boolean>>({});
  const [displayedTaskNames, setDisplayedTaskNames] = useState<Record<number, string>>({});
  const [tasksBeingDeleted, setTasksBeingDeleted] = useState<Record<number, boolean>>({});
  const [isArchiveSectionCollapsed, setIsArchiveSectionCollapsed] = useState(true);
  const { tasks, fetchTasks, updateTask, deleteTask, createTask } = useTask();
  const timeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  const { isLoading: isLoadingAuth, session } = useAuth();
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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

  const toggleTaskCompletion = async (taskId: number, isDone: boolean) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      const originalState = taskToUpdate.is_done;

      setDisplayedTaskStates(prev => ({
        ...prev,
        [taskId]: isDone,
      }));

      setTasksInTransition(prev => ({
        ...prev,
        [taskId]: true,
      }));

      if (timeoutsRef.current[taskId]) {
        clearTimeout(timeoutsRef.current[taskId]);
      }

      const timeoutId = setTimeout(() => {
        setDisplayedTaskStates(prev => ({
          ...prev,
          [taskId]: originalState,
        }));

        setTasksInTransition(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        Alert.alert(
          'Request Timeout',
          'The task update is taking longer than expected. Please try again.',
        );
      }, 10000);

      timeoutsRef.current[taskId] = timeoutId;

      try {
        await updateTask(taskId, { is_done: isDone });

        clearTimeout(timeoutsRef.current[taskId]);
        delete timeoutsRef.current[taskId];

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
        clearTimeout(timeoutsRef.current[taskId]);
        delete timeoutsRef.current[taskId];

        setDisplayedTaskStates(prev => ({
          ...prev,
          [taskId]: originalState,
        }));

        setTasksInTransition(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        Alert.alert('Error', 'Failed to update task. Please try again.');
        console.error('Failed to update task:', error);
      }
    } catch (error) {
      setTasksInTransition(prev => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });

      Alert.alert('Error', 'Failed to update task');
      console.error('Failed to update task:', error);
    }
  };

  const handleUpdateTaskName = async (taskId: number, newTaskName: string) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;

      if (taskToUpdate.task_name === newTaskName) return;

      setDisplayedTaskNames(prev => ({
        ...prev,
        [taskId]: newTaskName,
      }));

      setTasksInTransition(prev => ({
        ...prev,
        [taskId]: true,
      }));

      if (timeoutsRef.current[taskId]) {
        clearTimeout(timeoutsRef.current[taskId]);
      }

      try {
        await updateTask(taskId, { task_name: newTaskName });

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
        setDisplayedTaskNames(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        setTasksInTransition(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

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
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) return;

      setTasksBeingDeleted(prev => ({
        ...prev,
        [taskId]: true,
      }));

      try {
        await deleteTask(taskId);

        setTasksBeingDeleted(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });
      } catch (error) {
        setTasksBeingDeleted(prev => {
          const updated = { ...prev };
          delete updated[taskId];
          return updated;
        });

        Alert.alert('Error', 'Failed to delete task. Please try again.');
        console.error('Failed to delete task:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
      console.error('Failed to delete task:', error);
    }
  };

  const handleCreateTask = async (taskName: string) => {
    setIsCreatingTask(true);
    try {
      await createTask(taskName);
    } catch (error) {
      Alert.alert('Error', 'Failed to create task. Please try again.');
      console.error('Failed to create task:', error);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const processFilteredTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredTasks = tasks.filter(task => {
      if (tasksBeingDeleted[task.id]) return false;

      if (!task.due_date) return true;

      const taskDueDate = new Date(task.due_date);
      taskDueDate.setHours(0, 0, 0, 0);

      return taskDueDate <= today;
    });

    return filteredTasks.map(task => ({
      ...task,
      displayed_is_done: tasksInTransition[task.id] ? displayedTaskStates[task.id] : task.is_done,
      task_name: displayedTaskNames[task.id] || task.task_name,
    }));
  };

  const getIncompleteTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const incompleteTasks = tasks.filter(
      task =>
        !tasksBeingDeleted[task.id] &&
        !(tasksInTransition[task.id] ? displayedTaskStates[task.id] : task.is_done),
    );

    const completedTodayTasks = tasks.filter(
      task =>
        !tasksBeingDeleted[task.id] &&
        (tasksInTransition[task.id] ? displayedTaskStates[task.id] : task.is_done) &&
        new Date(task.updated_at) >= today &&
        new Date(task.updated_at) < tomorrow,
    );

    return [...incompleteTasks, ...completedTodayTasks]
      .map(task => ({
        ...task,
        displayed_is_done: tasksInTransition[task.id] ? displayedTaskStates[task.id] : task.is_done,
        task_name: displayedTaskNames[task.id] || task.task_name,
      }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const getCompleteTasks = () => {
    const processedTasks = processFilteredTasks();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completeTasks = processedTasks.filter(task => {
      if (!task.displayed_is_done) return false;
      if (!task.due_date) return false;

      const taskDueDate = new Date(task.due_date);
      taskDueDate.setHours(0, 0, 0, 0);

      return taskDueDate.getTime() !== today.getTime();
    });

    return [...completeTasks].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  };

  const renderTaskItem = (item: Task) => {
    const isDone =
      displayedTaskStates[item.id] !== undefined ? displayedTaskStates[item.id] : item.is_done;

    return (
      <Swipeable
        key={item.id}
        renderRightActions={() => renderRightActions(item.id)}
        containerStyle={{}}
      >
        <TaskItem
          id={item.id}
          taskName={item.task_name}
          isDone={isDone}
          dueDate={item.due_date}
          isInTransition={tasksInTransition[item.id]}
          onToggleComplete={toggleTaskCompletion}
          onUpdateTaskName={handleUpdateTaskName}
          onDeleteTask={handleDeleteTask}
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
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* eslint-disable-next-line react-native/no-raw-text */}
      <HTMLTitle>Tasks</HTMLTitle>
      <Stack.Screen
        options={{
          title: 'Tasks',
          headerRight: () => (
            <View style={styles.headerRightRow}>
              {Platform.OS === 'web' && (
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
              )}
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

      <TaskItem isNewTask onCreateTask={handleCreateTask} isLoading={isCreatingTask} />

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
    paddingTop: 16,
  },
});
