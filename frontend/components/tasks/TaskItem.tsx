import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
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
  readOnly = false,
}) => {
  const colorScheme = useColorScheme();

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  const isToday = (date: string) => {
    const today = new Date();
    const taskDate = new Date(date);
    return (
      taskDate.getDate() === today.getDate() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getFullYear() === today.getFullYear()
    );
  };

  const isOverdue = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate < today;
  };

  return (
    <View
      style={[
        styles.taskContainer,
        {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderBottomColor: Colors[colorScheme ?? 'light'].icon + '40',
        },
      ]}
    >
      <View style={styles.taskHeader}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            { borderColor: Colors[colorScheme ?? 'light'].icon },
            isInTransition && { borderColor: Colors[colorScheme ?? 'light'].tint },
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
            <View
              style={[
                styles.checkboxInner,
                isDone && { backgroundColor: Colors[colorScheme ?? 'light'].icon },
              ]}
            />
          )}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskText,
              { color: Colors[colorScheme ?? 'light'].text },
              isDone && styles.taskTextDone,
            ]}
          >
            {taskName}
          </Text>
          {dueDate || !readOnly ? (
            <View style={styles.dueDateContainer}>
              {dueDate ? (
                <Text
                  style={[
                    styles.dueDate,
                    { color: Colors[colorScheme ?? 'light'].icon },
                    isToday(dueDate) && { color: Colors[colorScheme ?? 'light'].todayBlue },
                    isOverdue(dueDate) && !isDone && styles.overdueDate,
                  ]}
                >
                  Due: {formatDate(dueDate)}
                </Text>
              ) : (
                <Text style={[styles.noDueDate, { color: Colors[colorScheme ?? 'light'].icon }]}>
                  No due date
                </Text>
              )}
              {!readOnly && onPressDate && (
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    {
                      backgroundColor:
                        Colors[colorScheme ?? 'light'].background === '#fff'
                          ? Colors.light.inputBackground
                          : Colors.dark.inputBackground,
                    },
                  ]}
                  onPress={() => onPressDate(id)}
                  disabled={isInTransition}
                >
                  <Text
                    style={[
                      styles.dateButtonText,
                      { color: Colors[colorScheme ?? 'light'].icon },
                      isInTransition && styles.dueDateLoading,
                    ]}
                  >
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
  checkbox: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginRight: 10,
    width: 24,
    // borderColor will be set dynamically in the component
  },
  checkboxInner: {
    borderRadius: 6,
    height: 12,
    width: 12,
    // backgroundColor will be set dynamically in the component
  },
  dateButton: {
    borderRadius: 4,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    // backgroundColor will be set dynamically in the component
  },
  dateButtonText: {
    fontSize: 12,
    // color will be set dynamically in the component
  },
  dueDate: {
    fontSize: 12,
    marginTop: 4,
    // color will be set dynamically in the component
  },
  dueDateContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  dueDateLoading: { opacity: 0.5 },
  noDueDate: {
    fontSize: 12,
    marginTop: 4,
    // color will be set dynamically in the component
  },
  overdueDate: {
    // color will be set to error color dynamically
  },
  spinner: {
    height: 14,
    width: 14,
  },
  taskContainer: {
    padding: 12,
    // backgroundColor and borderBottomColor will be set dynamically
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  taskText: {
    fontSize: 16,
    // color will be set dynamically in the component
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
  },
});
