import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTask } from '@/lib/context/task';

interface TaskItemProps {
  id?: number;
  taskName?: string;
  isDone?: boolean;
  dueDate?: string | null;
  isInTransition?: boolean;
  readOnly?: boolean;
  hideDueDate?: boolean;
  isNewTask?: boolean;
  isLoading?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  id,
  taskName = '',
  isDone = false,
  dueDate = null,
  isInTransition = false,
  readOnly = false,
  hideDueDate = false,
  isNewTask = false,
  isLoading = false,
}) => {
  const colorScheme = useColorScheme();
  const { createTask, updateTask, deleteTask } = useTask();
  const [isEditing, setIsEditing] = useState(isNewTask);
  const [editValue, setEditValue] = useState(taskName);
  const [inputHeight, setInputHeight] = useState(22);
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const [localIsDone, setLocalIsDone] = useState(isDone);
  const [localDueDate, setLocalDueDate] = useState(dueDate);
  const [loading, setLoading] = useState(false);

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

  const handleStartEditing = () => {
    if (readOnly || isInTransition) return;
    setIsEditing(true);
    setEditValue(editValue);
    setSelection({ start: editValue.length, end: editValue.length });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleSaveEdit = async () => {
    setIsEditing(false);
    const trimmedValue = editValue.trim();
    if (!id) return;
    if (trimmedValue === '') {
      setLoading(true);
      try {
        await deleteTask(id);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (trimmedValue === taskName) return;
    setLoading(true);
    try {
      await updateTask(id, { task_name: trimmedValue });
    } finally {
      setLoading(false);
    }
  };

  const handleContentSizeChange = (e: LayoutChangeEvent) => {
    setInputHeight(Math.max(22, e.nativeEvent.layout.height + 8));
  };

  const handleToggleComplete = async () => {
    if (!id || readOnly || isInTransition) return;
    setLoading(true);
    try {
      await updateTask(id, { is_done: !localIsDone });
      setLocalIsDone(!localIsDone);
    } finally {
      setLoading(false);
    }
  };

  const handleDueDateChange = async (newDate: string) => {
    if (!id || readOnly || isInTransition) return;
    setLoading(true);
    try {
      await updateTask(id, { due_date: newDate });
      setLocalDueDate(newDate);
    } finally {
      setLoading(false);
    }
  };

  // For new task mode: handle submit
  const handleCreateTask = async () => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue) return;
    setLoading(true);
    try {
      await createTask(trimmedValue, dueDate || undefined);
      setEditValue('');
      setInputHeight(22);
      inputRef.current?.clear();
    } finally {
      setLoading(false);
    }
  };

  if (isNewTask) {
    return (
      <View style={[styles.taskContainer, { backgroundColor: Colors[colorScheme].background }]}>
        <View style={[styles.taskHeader, styles.newTaskHeader]}>
          <View style={styles.plusIconContainer}>
            {loading || isLoading ? (
              <ActivityIndicator size="small" color={Colors[colorScheme].icon} />
            ) : (
              <IconSymbol name="plus" size={24} color={Colors[colorScheme].icon} />
            )}
          </View>
          <View style={styles.newTaskContent}>
            <View style={styles.taskInputContainer}>
              <TextInput
                ref={inputRef}
                multiline
                placeholder="New task"
                placeholderTextColor={Colors[colorScheme].icon}
                style={[
                  styles.taskInput,
                  styles.newTaskInput,
                  { color: Colors[colorScheme].text, height: inputHeight },
                ]}
                value={editValue}
                onChangeText={setEditValue}
                onBlur={handleCreateTask}
                editable={!loading && !isLoading}
                returnKeyType="done"
                scrollEnabled={false}
                selectTextOnFocus={false}
                submitBehavior="blurAndSubmit"
                key="new-task-input"
                onKeyPress={e => {
                  if (e.nativeEvent.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTask();
                  }
                }}
              />
              <Text
                style={[styles.taskInput, styles.measureInput, styles.newTaskInput]}
                onLayout={e => setInputHeight(Math.max(22, e.nativeEvent.layout.height + 8))}
              >
                {editValue || ' '}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.taskContainer,
        {
          backgroundColor: Colors[colorScheme].background,
          borderBottomColor: Colors[colorScheme].icon + '40',
        },
      ]}
    >
      <View style={styles.taskHeader}>
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: Colors[colorScheme].icon }]}
          onPress={handleToggleComplete}
          activeOpacity={readOnly || isInTransition ? 1 : 0.2}
          disabled={isInTransition || readOnly || loading}
        >
          <View
            style={[
              styles.checkboxInner,
              (localIsDone || isDone) && { backgroundColor: Colors[colorScheme].success },
            ]}
          >
            {(localIsDone || isDone) && <IconSymbol name="checkmark" size={20} color="white" />}
          </View>
        </TouchableOpacity>
        <View style={styles.taskContent}>
          {isEditing ? (
            <View style={styles.taskInputContainer}>
              <TextInput
                ref={inputRef}
                autoFocus
                multiline
                onBlur={handleSaveEdit}
                onChangeText={text => {
                  setEditValue(text);
                  setSelection({ start: text.length, end: text.length });
                }}
                onKeyPress={e => {
                  if (e.nativeEvent.key === 'Enter') {
                    handleSaveEdit();
                  }
                }}
                returnKeyType="done"
                scrollEnabled={false}
                selectTextOnFocus={false}
                style={[styles.taskInput, { color: Colors[colorScheme].text, height: inputHeight }]}
                submitBehavior="blurAndSubmit"
                value={editValue}
                selection={selection}
                onSelectionChange={e => setSelection(e.nativeEvent.selection)}
              />
              <Text
                style={[styles.taskInput, styles.measureInput]}
                onLayout={handleContentSizeChange}
              >
                {editValue}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleStartEditing}
              disabled={readOnly || isInTransition}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.taskText,
                  { color: Colors[colorScheme].text },
                  (localIsDone || isDone) && styles.taskTextDone,
                  (localIsDone || isDone) && { textDecorationColor: Colors[colorScheme].doneLine },
                ]}
              >
                {editValue}
              </Text>
            </TouchableOpacity>
          )}
          {!hideDueDate && (localDueDate || !readOnly) ? (
            <View style={styles.dueDateContainer}>
              {localDueDate ? (
                <Text
                  style={[
                    styles.dueDate,
                    { color: Colors[colorScheme].icon },
                    isToday(localDueDate) && { color: Colors[colorScheme].todayBlue },
                  ]}
                >
                  {formatDate(localDueDate)}
                </Text>
              ) : (
                <Text style={[styles.noDueDate, { color: Colors[colorScheme].icon }]}>
                  No due date
                </Text>
              )}
              {!readOnly && (
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    {
                      backgroundColor:
                        Colors[colorScheme].background === '#fff'
                          ? Colors.light.inputBackground
                          : Colors.dark.inputBackground,
                    },
                  ]}
                  onPress={() => {
                    // For demo: set due date to today
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    handleDueDateChange(`${yyyy}-${mm}-${dd}`);
                  }}
                  disabled={isInTransition || loading}
                >
                  <Text
                    style={[
                      styles.dateButtonText,
                      { color: Colors[colorScheme].icon },
                      (isInTransition || loading) && styles.dueDateLoading,
                    ]}
                  >
                    {localDueDate ? 'Change Date' : 'Add Due Date'}
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
    height: 20,
    justifyContent: 'center',
    marginRight: 15,
    marginTop: 5,
    width: 20,
    // borderColor will be set dynamically in the component
  },
  checkboxInner: {
    borderRadius: 0, // Changed from 6 to 0 for square corners
    height: 20,
    width: 20,
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
    marginTop: 4,
  },
  dueDateLoading: { opacity: 0.5 },
  measureInput: {
    left: 0,
    opacity: 0,
    paddingVertical: 0,
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  newTaskContent: {
    flex: 1,
    justifyContent: 'center',
  },
  newTaskHeader: {
    alignItems: 'flex-start',
    paddingTop: 4,
  },
  newTaskInput: {
    paddingBottom: 0,
    paddingTop: 0,
    textAlignVertical: 'top',
  },
  noDueDate: {
    fontSize: 12,
    marginTop: 4,
    // color will be set dynamically in the component
  },
  plusIconContainer: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    display: 'flex',
    height: 20,
    justifyContent: 'center',
    marginRight: 15,
    paddingTop: 2,
    width: 20,
  },
  taskContainer: {
    paddingHorizontal: 16, // Increased from 12 to add more left padding
    paddingVertical: 5,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  taskInput: {
    fontSize: 16,
    lineHeight: 22,
    margin: 0,
    // @ts-expect-error Property is valid
    outlineStyle: 'none',
    paddingVertical: 4,
    textAlignVertical: 'top',
  },
  taskInputContainer: { position: 'relative' },
  taskText: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 4,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
  },
});
