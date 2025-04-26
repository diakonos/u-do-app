import React, { useState, useEffect, useRef } from 'react';
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
  RefreshControl,
  useColorScheme
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Collapsible } from '@/components/Collapsible';
import { useTask } from '@/lib/context/task';
import { Colors } from '@/constants/Colors';

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
  const colorScheme = useColorScheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'dueDate' | 'creationDate'>('dueDate');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);
  const [tasksInTransition, setTasksInTransition] = useState<Record<number, boolean>>({});
  // Keep track of the displayed completion state (for visual purposes only)
  const [displayedTaskStates, setDisplayedTaskStates] = useState<Record<number, boolean>>({});
  const { createTask, fetchTasks, updateTask, deleteTask } = useTask();
  const timeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  // Add a ref for the task name input to maintain focus
  const taskNameInputRef = useRef<TextInput>(null);
  
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
      // Clear any existing timeout for this task
      if (timeoutsRef.current[taskId]) {
        clearTimeout(timeoutsRef.current[taskId]);
      }
      
      // Set task as in transition state
      setTasksInTransition(prev => ({
        ...prev,
        [taskId]: true
      }));
      
      // Store the current displayed state (pre-transition)
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setDisplayedTaskStates(prev => ({
          ...prev,
          [taskId]: task.is_done
        }));
      }
      
      // Only update the real task state, not the displayed state yet
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, is_done: isDone } : task
      ));
      
      // Add a 3-second delay before finalizing the change
      timeoutsRef.current[taskId] = setTimeout(async () => {
        try {
          await updateTask(taskId, { is_done: isDone });
          
          // Remove task from transition state and displayed state tracking
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
          // Revert the task state if the API call fails
          setTasks(tasks.map(task => 
            task.id === taskId ? { ...task, is_done: !isDone } : task
          ));
          Alert.alert('Error', 'Failed to update task');
          console.error('Failed to update task:', error);
        }
      }, 3000);
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

  const isOverdue = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate < today;
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
              { backgroundColor: Colors[colorScheme ?? 'light'].background }
            ]}
          >
            <View style={[
              styles.modalHeader,
              { borderBottomColor: Colors[colorScheme ?? 'light'].icon + '40' }
            ]}>
              <TouchableOpacity onPress={() => {
                setShowDatePicker(null);
                setTempDueDate(null);
              }}>
                <Text style={[
                  styles.modalButton,
                  { color: Colors[colorScheme ?? 'light'].tint }
                ]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  const dateToSave = tempDueDate || defaultDate;
                  updateDueDate(item.id, dateToSave);
                  setShowDatePicker(null);
                  setTempDueDate(null);
                }}
              >
                <Text style={[
                  styles.modalButton, 
                  styles.modalDoneButton, 
                  { color: Colors[colorScheme ?? 'light'].tint }
                ]}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerWrapper}>
              {Platform.OS === 'web' ? (
                <DatePicker
                  style={{
                    height: Platform.OS === 'web' ? 320 : 216, // Increased height for web to show all rows
                    width: '100%',
                    backgroundColor: colorScheme === 'dark' ? Colors.dark.background : '#fff'
                  }}
                  date={tempDueDate ? tempDueDate : defaultDate}
                  mode="single"
                  onChange={(params: any) => {
                    setTempDueDate(params.date);
                  }}
                  styles={{
                    // Dark mode styles for the datepicker with more specific targeting
                    ...(colorScheme === 'dark' ? {
                      day: { 
                        color: Colors.dark.white, 
                        borderColor: Colors.dark.border
                      },
                      day_label: {
                        color: Colors.dark.white
                      },
                      today: { 
                        borderColor: Colors.dark.tint,
                        color: Colors.dark.white
                      },
                      today_label: {
                        color: Colors.dark.white
                      },
                      selected: { 
                        backgroundColor: Colors.dark.tint,
                        borderColor: Colors.dark.tint 
                      },
                      selected_label: { 
                        color: Colors.dark.white 
                      },
                      header: { 
                        color: Colors.dark.white, 
                        backgroundColor: Colors.dark.background
                      },
                      month_label: { 
                        color: Colors.dark.white
                      },
                      year: { 
                        color: Colors.dark.white
                      },
                      month: { 
                        backgroundColor: Colors.dark.background,
                        borderColor: Colors.dark.border
                      },
                      year_label: {
                        color: Colors.dark.white
                      },
                      month_selector_label: {
                        color: Colors.dark.white
                      },
                      year_selector_label: {
                        color: Colors.dark.white
                      },
                      weekdays: {
                        backgroundColor: Colors.dark.background
                      },
                      weekday_label: { 
                        color: Colors.dark.white
                      },
                    } : {
                      // Light mode defaults
                      calendar: { backgroundColor: Colors.light.background },
                      today: { borderColor: Colors.light.tint },
                      selected: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
                    })
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
                    colorScheme === 'dark' ? { backgroundColor: Colors.dark.background } : {}
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
    // Process tasks with their displayed state during transitions
    const processedTasks = tasks.map(task => {
      // If task is in transition, use the previous displayed state instead of current state
      if (tasksInTransition[task.id]) {
        return {
          ...task,
          displayed_is_done: displayedTaskStates[task.id]
        };
      }
      // Otherwise use the actual is_done state
      return {
        ...task,
        displayed_is_done: task.is_done
      };
    });

    // First, separate completed and incomplete tasks based on displayed state
    const completedTasks = processedTasks.filter(task => task.displayed_is_done);
    const incompleteTasks = processedTasks.filter(task => !task.displayed_is_done);
    
    // Filter based on showCompleted preference
    const tasksToShow = [...incompleteTasks, ...completedTasks];

    // For incomplete tasks, categorize them
    const overdueTasks = tasksToShow.filter(task => 
      !task.displayed_is_done && categorizeTask(task) === 'overdue'
    );
    const todayTasks = tasksToShow.filter(task => 
      !task.displayed_is_done && categorizeTask(task) === 'today'
    );
    const laterTasks = tasksToShow.filter(task => 
      !task.displayed_is_done && categorizeTask(task) === 'later'
    );
    
    // Tasks that are shown as done go to the Done section
    const doneTasks = tasksToShow.filter(task => task.displayed_is_done);

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
      { title: 'Later', data: sortTaskGroup(laterTasks) },
      { title: 'Done', data: sortTaskGroup(doneTasks) }
    ];
  };

  const toggleSortBy = () => {
    setSortBy(current => current === 'dueDate' ? 'creationDate' : 'dueDate');
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

  // Create a ListHeaderComponent to make the input UI scrollable with the list
  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <TextInput
        ref={taskNameInputRef}
        style={[
          styles.input, 
          { 
            borderColor: Colors[colorScheme ?? 'light'].icon,
            color: Colors[colorScheme ?? 'light'].text,
            backgroundColor: Colors[colorScheme ?? 'light'].background
          }
        ]}
        placeholder="Enter task name"
        placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
        value={taskName}
        onChangeText={(text) => {
          setTaskName(text);
          // Ensure input stays focused after state change
          setTimeout(() => {
            taskNameInputRef.current?.focus();
          }, 0);
        }}
        onSubmitEditing={addTask}
        key="task-input" // Add a stable key
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={addTask}
        >
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      </View>
      {/* <View style={styles.sortContainer}>
        <Button 
          title={`Sort: ${sortBy === 'dueDate' ? 'Due Date' : 'Creation Date'}`}
          onPress={toggleSortBy}
          color={Colors[colorScheme ?? 'light'].tint}
        />
      </View> */}
    </View>
  );

  return (
    <SafeAreaView style={[
      styles.container, 
      { backgroundColor: Colors[colorScheme ?? 'light'].background }
    ]}>
      <SectionList
        ListHeaderComponent={renderListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing || (isLoading && tasks.length > 0)} onRefresh={onRefresh} />
        }
        sections={getGroupedTasks()}
        keyExtractor={(item) => item.id.toString()}
        renderSectionHeader={({ section: { title, data } }) => (
          <Collapsible 
            title={`${title} (${data.length})`} 
            defaultOpen={title !== 'Done'}
            titleStyle={{ color: Colors[colorScheme ?? 'light'].text }}
          >
            {data.map(item => (
              <Swipeable 
                key={item.id}
                renderRightActions={() => renderRightActions(item.id)} 
                containerStyle={{}}
              >
                <TouchableOpacity style={[
                  styles.taskContainer,
                  { 
                    backgroundColor: Colors[colorScheme ?? 'light'].background,
                    borderBottomColor: Colors[colorScheme ?? 'light'].icon + '40'
                  }
                ]}>
                  <View style={styles.taskHeader}>
                    <TouchableOpacity 
                      style={[
                        styles.checkbox, 
                        { borderColor: Colors[colorScheme ?? 'light'].icon },
                        tasksInTransition[item.id] && { borderColor: Colors[colorScheme ?? 'light'].tint }
                      ]}
                      onPress={() => toggleTaskCompletion(item.id, !item.is_done)}
                    >
                      <View style={[
                        styles.checkboxInner, 
                        item.is_done && { backgroundColor: Colors[colorScheme ?? 'light'].icon }
                      ]} />
                    </TouchableOpacity>
                    <View style={styles.taskContent}>
                      <Text style={[
                        styles.taskText, 
                        { color: Colors[colorScheme ?? 'light'].text },
                        item.is_done && { 
                          textDecorationLine: 'line-through',
                          color: Colors[colorScheme ?? 'light'].icon 
                        }
                      ]}>
                        {item.task_name}
                      </Text>
                      <View style={styles.dueDateContainer}>
                        {item.due_date ? (
                          <Text style={[
                            styles.dueDate,
                            { color: Colors[colorScheme ?? 'light'].icon },
                            isToday(item.due_date) && { color: Colors[colorScheme ?? 'light'].tint },
                            isOverdue(item.due_date) && !item.is_done && styles.overdueDate
                          ]}>
                            Due: {formatDate(item.due_date)}
                          </Text>
                        ) : (
                          <Text style={[
                            styles.noDueDate,
                            { color: Colors[colorScheme ?? 'light'].icon }
                          ]}>No due date</Text>
                        )}
                        <TouchableOpacity 
                          style={[
                            styles.dateButton,
                            { backgroundColor: Colors[colorScheme ?? 'light'].background === '#fff' ? '#f0f0f0' : '#2A2D2E' }
                          ]}
                          onPress={() => setShowDatePicker(item.id.toString())}
                        >
                          <Text style={[
                            styles.dateButtonText,
                            { color: Colors[colorScheme ?? 'light'].icon }
                          ]}>
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
        stickySectionHeadersEnabled={false}
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
  listHeader: {
    paddingTop: 16,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    padding: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 4,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#6936D8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  overdueDate: {
    color: 'red',
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
  checkboxTransitioning: {
    borderColor: '#6936D8',
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
    paddingBottom: Platform.OS === 'web' ? 40 : 20, // Increased padding for web
    width: '100%', // Ensure the modal content fills the screen width
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%', // Ensure header spans the full width
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
    width: '100%', // Make date picker fill the screen width
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
  datePickerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'web' ? 20 : 0, // Add bottom padding on web
  },
});
