import React, { useState } from 'react';
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
  SectionList
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Collapsible } from '@/components/Collapsible';

interface Task {
  id: string;
  name: string;
  completed: boolean;
  dueDate: Date | null;
  creationDate: Date;
}

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'dueDate' | 'creationDate'>('dueDate');
  const [showCompleted, setShowCompleted] = useState(true);

  const addTask = () => {
    if (taskName.trim()) {
      setTasks([...tasks, { 
        id: Date.now().toString(), 
        name: taskName, 
        completed: false,
        dueDate: null,
        creationDate: new Date()
      }]);
      setTaskName('');  // Clear input after adding task
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    setShowDatePicker(null);
  };

  const updateDueDate = (taskId: string, date: Date) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, dueDate: date } : task
    ));
    if (Platform.OS === 'android') {
      setShowDatePicker(null);
    }
  };

  const renderRightActions = (taskId: string) => (
    <TouchableOpacity 
      onPress={() => deleteTask(taskId)}
      style={[styles.deleteButton]}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
  );

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getMinDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const renderDatePicker = (item: Task) => {
    if (showDatePicker !== item.id) return null;
    
    const defaultDate = new Date();
    defaultDate.setHours(0, 0, 0, 0); // Reset time portion to midnight

    // Store the previous date value before opening the picker
    const previousDate = item.dueDate;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDatePicker === item.id}
        onRequestClose={() => {
          // If canceled, revert to previous date
          const task = tasks.find(t => t.id === item.id);
          if (task) {
            task.dueDate = previousDate;
          }
          setShowDatePicker(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            // If canceled by tapping overlay, revert to previous date
            const task = tasks.find(t => t.id === item.id);
            if (task) {
              task.dueDate = previousDate;
            }
            setShowDatePicker(null);
          }}
        >
          <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  // If canceled, revert to previous date
                  const task = tasks.find(t => t.id === item.id);
                  if (task) {
                    task.dueDate = previousDate;
                  }
                  setShowDatePicker(null);
                }}
              >
                <Text style={styles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  // On Done, save the current date (which might be default if unchanged)
                  const dateToSave = item.dueDate || defaultDate;
                  updateDueDate(item.id, dateToSave);
                  setShowDatePicker(null);
                }}
              >
                <Text style={[styles.modalButton, styles.modalDoneButton]}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              testID="datePicker"
              value={item.dueDate || defaultDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={getMinDate()}
              onChange={(event, date) => {
                if (event.type === 'set' && date) {
                  const task = tasks.find(t => t.id === item.id);
                  if (task) {
                    task.dueDate = date;
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

  const sortTasks = (tasksToSort: Task[]) => {
    const filteredTasks = showCompleted 
      ? tasksToSort 
      : tasksToSort.filter(task => !task.completed);
      
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === 'dueDate') {
        // If no due date, put at the end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        // Sort by creation date
        return new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
      }
    });
  };

  const toggleSortBy = () => {
    setSortBy(current => current === 'dueDate' ? 'creationDate' : 'dueDate');
  };

  const toggleShowCompleted = () => {
    setShowCompleted(current => !current);
  };

  const categorizeTask = (task: Task): 'overdue' | 'today' | 'later' => {
    if (!task.dueDate) return 'later';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(task.dueDate);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate < today) return 'overdue';
    if (taskDate.getTime() === today.getTime()) return 'today';
    return 'later';
  };

  const getGroupedTasks = () => {
    const filteredTasks = showCompleted 
      ? tasks 
      : tasks.filter(task => !task.completed);

    const overdueTasks = filteredTasks.filter(task => categorizeTask(task) === 'overdue');
    const todayTasks = filteredTasks.filter(task => categorizeTask(task) === 'today');
    const laterTasks = filteredTasks.filter(task => categorizeTask(task) === 'later');

    const sortTaskGroup = (taskGroup: Task[]) => {
      return [...taskGroup].sort((a, b) => {
        if (sortBy === 'dueDate') {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else {
          return new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
        }
      });
    };

    return [
      { title: 'Overdue', data: sortTaskGroup(overdueTasks) },
      { title: 'Today', data: sortTaskGroup(todayTasks) },
      { title: 'Later', data: sortTaskGroup(laterTasks) }
    ];
  };

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
        sections={getGroupedTasks()}
        keyExtractor={(item) => item.id}
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
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleTaskCompletion(item.id);
                      }}
                    >
                      <View style={[styles.checkboxInner, item.completed && styles.checkboxChecked]} />
                    </TouchableOpacity>
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskText, item.completed && styles.completedTask]}>
                        {item.name}
                      </Text>
                      <View style={styles.dueDateContainer}>
                        {item.dueDate ? (
                          <Text style={[
                            styles.dueDate,
                            isToday(new Date(item.dueDate)) && styles.todayDate
                          ]}>
                            Due: {formatDate(item.dueDate)}
                          </Text>
                        ) : (
                          <Text style={styles.noDueDate}>No due date</Text>
                        )}
                        <TouchableOpacity 
                          style={styles.dateButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            setShowDatePicker(item.id);
                          }}
                        >
                          <Text style={styles.dateButtonText}>
                            {item.dueDate ? 'Change Date' : 'Add Due Date'}
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
    color: '#007AFF', // iOS blue color
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
    height: 216,  // Standard height for iOS picker
    paddingLeft: 34, // Align with task text
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
});
