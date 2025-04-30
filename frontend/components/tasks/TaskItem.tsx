import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface TaskItemProps {
  id: number;
  taskName: string;
  isDone: boolean;
  dueDate: string | null;
  onToggleComplete?: (id: number, isDone: boolean) => void;
  onPressDate?: (id: number) => void;
  isInTransition?: boolean;
  readOnly?: boolean;
  hideDueDate?: boolean;
  onUpdateTaskName?: (id: number, newTaskName: string) => void;
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
  hideDueDate = false,
  onUpdateTaskName,
}) => {
  const colorScheme = useColorScheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(taskName);
  const inputRef = useRef<TextInput>(null);

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

  const handleStartEditing = () => {
    if (readOnly || isInTransition || !onUpdateTaskName) return;
    setIsEditing(true);
    setEditValue(taskName);
    // Focus the input after rendering
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleSaveEdit = () => {
    if (!onUpdateTaskName || editValue.trim() === '') return;
    setIsEditing(false);
    if (editValue !== taskName) {
      onUpdateTaskName(id, editValue.trim());
    }
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
                isDone && { backgroundColor: Colors[colorScheme ?? 'light'].success },
              ]}
            >
              {isDone && <IconSymbol name="checkmark" size={24} color="white" />}
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          {isEditing ? (
            <TextInput
              ref={inputRef}
              style={[styles.taskInput, { color: Colors[colorScheme ?? 'light'].text }]}
              value={editValue}
              onChangeText={setEditValue}
              onBlur={handleSaveEdit}
              onSubmitEditing={handleSaveEdit}
              selectTextOnFocus={false}
              autoFocus
            />
          ) : (
            <TouchableOpacity
              onPress={handleStartEditing}
              disabled={readOnly || isInTransition || !onUpdateTaskName}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.taskText,
                  { color: Colors[colorScheme ?? 'light'].text },
                  isDone && styles.taskTextDone,
                  isDone && { textDecorationColor: Colors[colorScheme ?? 'light'].doneLine },
                  !readOnly && onUpdateTaskName && styles.taskTextEditable,
                ]}
              >
                {taskName}
              </Text>
            </TouchableOpacity>
          )}
          {!hideDueDate && (dueDate || !readOnly) ? (
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
    borderRadius: 0, // Changed from 4 to 0 for square corners
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginRight: 20,
    width: 24,
    // borderColor will be set dynamically in the component
  },
  checkboxInner: {
    borderRadius: 0, // Changed from 6 to 0 for square corners
    height: 24,
    width: 24,
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
    // color will be set dynamically in the component
  },
  dueDateContainer: {
    alignItems: 'center',
    flexDirection: 'row',
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
    paddingHorizontal: 16, // Increased from 12 to add more left padding
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  taskInput: {
    fontSize: 16,
    height: 40,
    lineHeight: 40,
    margin: 0,
    // @ts-expect-error Property is valid
    outlineStyle: 'none',
    padding: 0,
  },
  taskText: {
    fontSize: 16,
    height: 40,
    lineHeight: 40,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
  },
  taskTextEditable: {
    // Visual indication that the task name is editable
  },
});
