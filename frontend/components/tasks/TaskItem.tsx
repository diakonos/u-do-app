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
import { CalendarDatePicker } from '@/components/CalendarDatePicker';
import { ModalSheet } from '@/components/ModalSheet';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

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

  const openDatePicker = () => {
    setTempDate(localDueDate ? new Date(localDueDate) : new Date());
    setShowDatePicker(true);
  };
  const closeDatePicker = () => setShowDatePicker(false);
  const confirmDatePicker = async () => {
    if (tempDate) {
      const yyyy = tempDate.getFullYear();
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempDate.getDate()).padStart(2, '0');
      await handleDueDateChange(`${yyyy}-${mm}-${dd}`);
    }
    setShowDatePicker(false);
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
            </View>
          ) : null}
        </View>
        {/* Clock button on the right */}
        {!readOnly && !(localIsDone || isDone) && (
          <TouchableOpacity
            style={styles.clockButton}
            onPress={openDatePicker}
            disabled={isInTransition || loading}
            accessibilityLabel="Change due date"
          >
            <IconSymbol name="clock" size={22} color={Colors[colorScheme].icon} />
          </TouchableOpacity>
        )}
      </View>
      {/* Date Picker ModalSheet */}
      <ModalSheet
        visible={showDatePicker}
        onClose={closeDatePicker}
        backgroundColor={Colors[colorScheme].background}
      >
        <CalendarDatePicker
          date={tempDate || new Date()}
          onChange={setTempDate}
          minDate={new Date(2000, 0, 1)}
          colorScheme={colorScheme}
        />
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalButton} onPress={closeDatePicker}>
            <Text>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalButton} onPress={confirmDatePicker}>
            <Text style={{ color: Colors[colorScheme].brand }}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </ModalSheet>
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
  clockButton: {
    alignSelf: 'center',
    marginLeft: 12,
    padding: 4,
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
  measureInput: {
    left: 0,
    opacity: 0,
    paddingVertical: 0,
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
    width: '100%',
  },
  modalButton: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
