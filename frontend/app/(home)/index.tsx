import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
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
import DatePicker from 'react-native-ui-datepicker';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Collapsible } from '@/components/Collapsible';
import { TaskInputHeader } from '@/components/tasks/TaskInputHeader';
import { TaskItem } from '@/components/tasks/TaskItem';
import { useTask } from '@/lib/context/task';
import { Colors } from '@/constants/Colors';
import { HTMLTitle } from '@/components/HTMLTitle';

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
  
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'dueDate' | 'creationDate'>('dueDate');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);
  const [tasksInTransition, setTasksInTransition] = useState<Record<number, boolean>>({});
  // Keep track of the displayed completion state (for visual purposes only)
  const [displayedTaskStates, setDisplayedTaskStates] = useState<Record<number, boolean>>({});
  const { tasks, fetchTasks, updateTask, deleteTask } = useTask();
  const timeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});
  
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      await fetchTasks();
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
      setShowDatePicker(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete task');
      console.error('Failed to delete task:', error);
    }
  };

  const updateDueDate = async (taskId: number, date: Date) => {
    try {
      await updateTask(taskId, { 
        due_date: date.toString() 
      });
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
                    console.log("Selected date:", params.date);
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
                      console.log("Selected date:", date);
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
    const processedTasks = tasks.map(task => ({
      ...task,
      displayed_is_done: tasksInTransition[task.id] ? displayedTaskStates[task.id] : task.is_done
    }));

    // Helper to check if a date is today
    const isTaskDueToday = (task: Task) => {
      if (!task.due_date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskDate = new Date(task.due_date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    };

    // --- Today's Tasks ---
    const allTodayTasks = processedTasks.filter(isTaskDueToday);
    const todayIncompleteTasks = allTodayTasks.filter(task => !task.displayed_is_done);
    const todayCompleteTasks = allTodayTasks.filter(task => task.displayed_is_done);

    // Sort Today's Incomplete Tasks (using existing logic based on sortBy state)
    const sortIncomplete = (taskGroup: Task[]) => {
      return [...taskGroup].sort((a, b) => {
        if (sortBy === 'dueDate') {
          // Existing due date sort logic
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
        } else {
          // Existing creation date sort logic
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      });
    };
    const sortedTodayIncomplete = sortIncomplete(todayIncompleteTasks);

    // Sort Today's Complete Tasks by updated_at descending
    const sortedTodayComplete = [...todayCompleteTasks].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    // Combine incomplete and complete for the 'Today' section
    const finalTodayTasks = [...sortedTodayIncomplete, ...sortedTodayComplete];

    // --- Other Tasks (Not due today) ---
    const otherTasks = processedTasks.filter(task => !isTaskDueToday(task));

    // Overdue (Incomplete, Not Today)
    const overdueTasks = otherTasks.filter(task =>
      !task.displayed_is_done && categorizeTask(task) === 'overdue'
    );
    const sortedOverdue = sortIncomplete(overdueTasks);

    // Later (Incomplete, Not Today)
    const laterTasks = otherTasks.filter(task =>
      !task.displayed_is_done && categorizeTask(task) === 'later'
    );
    const sortedLater = sortIncomplete(laterTasks);

    // Done (Complete, Not Today)
    const doneTasks = otherTasks.filter(task => task.displayed_is_done);
    const sortedDone = [...doneTasks].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    // --- Construct Sections ---
    // Filter out sections with no data to avoid rendering empty headers
    return [
      { title: 'Overdue', data: sortedOverdue },
      { title: 'Today', data: finalTodayTasks },
      { title: 'Later', data: sortedLater },
      { title: 'Done', data: sortedDone }
    ].filter(section => section.data.length > 0);
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

  return (
    <SafeAreaView style={[
      styles.container, 
      { backgroundColor: Colors[colorScheme ?? 'light'].background }
    ]}>
      <HTMLTitle>My Task List</HTMLTitle>
      <SectionList
        ListHeaderComponent={
          <TaskInputHeader />
        }
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
                <TaskItem
                  id={item.id}
                  taskName={item.task_name}
                  isDone={item.is_done}
                  dueDate={item.due_date}
                  isInTransition={tasksInTransition[item.id]}
                  onToggleComplete={toggleTaskCompletion}
                  onPressDate={(id) => setShowDatePicker(id.toString())}
                />
                {renderDatePicker(item)}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  datePickerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'web' ? 20 : 0, // Add bottom padding on web
  },
});
