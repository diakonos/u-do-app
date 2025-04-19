import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  Modal,
  SafeAreaView,
  SectionList,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Collapsible } from '@/components/Collapsible';
import { useTask } from '@/lib/context/task';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'dueDate' | 'creationDate'>('dueDate');
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);
  const { createTask, fetchTasks, updateTask, deleteTask } = useTask();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const fetchedTasks = await fetchTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      Alert.alert('Error', 'Failed to load tasks');
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, []);

  const addTask = async () => {
    if (taskName.trim()) {
      try {
        const dueDate = selectedDate?.toISOString() ?? new Date().toISOString();
        const newTask = await createTask(taskName, dueDate);
        setTasks(prevTasks => [newTask, ...prevTasks]);
        setTaskName('');
        setSelectedDate(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to create task. Please try again.');
        console.error('Failed to create task:', error);
      }
    }
  };

  const toggleTaskCompletion = async (taskId: number, isDone: boolean) => {
    try {
      await updateTask(taskId, { is_done: isDone });
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, is_done: !task.is_done } : task
      ));
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
      setShowDatePicker(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
      console.error('Failed to delete task:', error);
    }
  };

  const updateDueDate = async (taskId: number, date: Date) => {
    try {
      const updatedTask = await updateTask(taskId, { 
        due_date: date.toISOString() 
      });
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, due_date: updatedTask.due_date } : task
      ));
      if (Platform.OS === 'android') {
        setShowDatePicker(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update due date');
      console.error('Failed to update due date:', error);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  const isToday = (date: string) => {
    const today = new Date();
    const taskDate = new Date(date);
    return taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear();
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
          <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setShowDatePicker(null);
                setTempDueDate(null);
              }}>
                <Text style={styles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  const dateToSave = tempDueDate || defaultDate;
                  updateDueDate(item.id, dateToSave);
                  setShowDatePicker(null);
                  setTempDueDate(null);
                }}
              >
                <Text style={[styles.modalButton, styles.modalDoneButton]}>Done</Text>
              </TouchableOpacity>
            </View>
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
              style={styles.datePicker}
            />
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
    const filteredTasks = showCompleted 
      ? tasks 
      : tasks.filter(task => !task.is_done);

    const overdueTasks = filteredTasks.filter(task => categorizeTask(task) === 'overdue');
    const todayTasks = filteredTasks.filter(task => categorizeTask(task) === 'today');
    const laterTasks = filteredTasks.filter(task => categorizeTask(task) === 'later');

    const sortTaskGroup = (taskGroup: Task[]) => {
      return [...taskGroup].sort((a, b) => {
        if (sortBy === 'dueDate') {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
        } else {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      });
    };

    return [
      { title: 'Overdue', data: sortTaskGroup(overdueTasks) },
      { title: 'Today', data: sortTaskGroup(todayTasks) },
      { title: 'Later', data: sortTaskGroup(laterTasks) }
    ];
  };

  const toggleSortBy = () => {
    setSortBy(current => current === 'dueDate' ? 'creationDate' : 'dueDate');
  };

  const toggleShowCompleted = () => {
    setShowCompleted(current => !current);
  };

  const renderRightActions = (taskId: number) => (
    <TouchableOpacity 
      onPress={() => handleDeleteTask(taskId)}
      style={[styles.deleteButton]}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
  );

  if (isLoading && tasks.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter task name"
        value={taskName}
        onChangeText={setTaskName}
        onSubmitEditing={addTask}
      />
      <View style={styles.buttonContainer}>
        <Button title="Add Task" onPress={addTask} />
      </View>
      <View style={styles.sortContainer}>
        <Button 
          title={`Sort: ${sortBy === 'dueDate' ? 'Due Date' : 'Creation Date'}`}
          onPress={toggleSortBy}
        />
        <Button 
          title={showCompleted ? 'Hide Done' : 'Show Done'}
          onPress={toggleShowCompleted}
        />
      </View>
      <SectionList
        refreshControl={
          <RefreshControl refreshing={refreshing || (isLoading && tasks.length > 0)} onRefresh={onRefresh} />
        }
        sections={getGroupedTasks()}
        keyExtractor={(item) => item.id.toString()}
        renderSectionHeader={({ section: { title, data } }) => (
          <Collapsible title={`${title} (${data.length})`}>
            {data.map(item => (
              <Swipeable 
                key={item.id}
                renderRightActions={() => renderRightActions(item.id)} 
                containerStyle={{}}
              >
                <TouchableOpacity style={styles.taskContainer}>
                  <View style={styles.taskHeader}>
                    <TouchableOpacity 
                      style={styles.checkbox}
                      onPress={() => toggleTaskCompletion(item.id, !item.is_done)}
                    >
                      <View style={[styles.checkboxInner, item.is_done && styles.checkboxChecked]} />
                    </TouchableOpacity>
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskText, item.is_done && styles.completedTask]}>
                        {item.task_name}
                      </Text>
                      <View style={styles.dueDateContainer}>
                        {item.due_date ? (
                          <Text style={[
                            styles.dueDate,
                            isToday(item.due_date) && styles.todayDate
                          ]}>
                            Due: {formatDate(item.due_date)}
                          </Text>
                        ) : (
                          <Text style={styles.noDueDate}>No due date</Text>
                        )}
                        <TouchableOpacity 
                          style={styles.dateButton}
                          onPress={() => setShowDatePicker(item.id.toString())}
                        >
                          <Text style={styles.dateButtonText}>
                            {item.due_date ? 'Change Date' : 'Add Due Date'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {renderDatePicker(item)}
                </TouchableOpacity>
              </Swipeable>
            ))}
          </Collapsible>
        )}
        renderItem={() => null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 4,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  taskContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskText: {
    fontSize: 16,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  todayDate: {
    color: '#007AFF',
  },
  noDueDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  datePickerContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    height: 216,
    paddingLeft: 34,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 12,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#666',
  },
  taskContent: {
    flex: 1,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateButton: {
    marginLeft: 8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dateButtonText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalDoneButton: {
    fontWeight: '600',
  },
  datePicker: {
    height: 216,
    backgroundColor: '#fff',
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
