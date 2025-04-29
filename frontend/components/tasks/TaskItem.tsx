import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator
} from 'react-native';
import { Colors } from '@/constants/Colors';

interface TaskItemProps {
  id: number;
  taskName: string;
  isDone: boolean;
  dueDate: string | null;
  onToggleComplete?: (id: number, isDone: boolean) => void;
  onPressDate?: (id: number) => void;
  isInTransition?: boolean;
  readOnly?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  id,
  taskName,
  isDone,
  dueDate,
  onToggleComplete,
  onPressDate,
  isInTransition = false,
  readOnly = false
}) => {
  const colorScheme = useColorScheme();
  
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

  return (
    <View style={[
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
            isInTransition && { borderColor: Colors[colorScheme ?? 'light'].tint }
          ]}
          onPress={() => !isInTransition && onToggleComplete && onToggleComplete(id, !isDone)}
          activeOpacity={readOnly || isInTransition ? 1 : 0.2}
          disabled={isInTransition || readOnly}
        >
          {isInTransition ? (
            <ActivityIndicator 
              size="small" 
              color={Colors[colorScheme ?? 'light'].tint} 
              style={styles.spinner}
            />
          ) : (
            <View style={[
              styles.checkboxInner, 
              isDone && { backgroundColor: Colors[colorScheme ?? 'light'].icon }
            ]} />
          )}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text style={[
            styles.taskText, 
            { color: Colors[colorScheme ?? 'light'].text },
            isDone && { 
              textDecorationLine: 'line-through',
              color: Colors[colorScheme ?? 'light'].icon 
            }
          ]}>
            {taskName}
          </Text>
          {dueDate || !readOnly ? (
            <View style={styles.dueDateContainer}>
              {dueDate ? (
                <Text style={[
                  styles.dueDate,
                  { color: Colors[colorScheme ?? 'light'].icon },
                  isToday(dueDate) && { color: Colors[colorScheme ?? 'light'].todayBlue },
                  isOverdue(dueDate) && !isDone && styles.overdueDate
                ]}>
                  Due: {formatDate(dueDate)}
                </Text>
              ) : (
                <Text style={[
                  styles.noDueDate,
                  { color: Colors[colorScheme ?? 'light'].icon }
                ]}>No due date</Text>
              )}
              {!readOnly && onPressDate && (
                <TouchableOpacity 
                  style={[
                    styles.dateButton,
                    { backgroundColor: Colors[colorScheme ?? 'light'].background === '#fff' ? '#f0f0f0' : '#2A2D2E' }
                  ]}
                  onPress={() => onPressDate(id)}
                  disabled={isInTransition}
                >
                  <Text style={[
                    styles.dateButtonText,
                    { color: Colors[colorScheme ?? 'light'].icon },
                    isInTransition && { opacity: 0.5 }
                  ]}>
                    {dueDate ? 'Change Date' : 'Add Due Date'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  dueDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  overdueDate: {
    color: 'red',
  },
  noDueDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
  spinner: {
    width: 14,
    height: 14,
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
});