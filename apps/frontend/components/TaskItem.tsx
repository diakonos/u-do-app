import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, type ViewStyle } from 'react-native';
import { TapGestureHandler, TouchableOpacity } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { mutate } from 'swr';
import Text from '@/components/Text';
import { Task, updateTaskName, toggleTaskDone, deleteTask, updateTaskDueDate } from '@/db/tasks';
import { baseTheme, useTheme } from '@/lib/theme';
import CheckIcon from '@/assets/icons/check.svg';
import ClockIcon from '@/assets/icons/clock.svg';
import { formatDateUI } from '@/lib/date';
import DatePickerModal from '@/components/DatePickerModal';

interface TaskProps {
  hideDueDate?: boolean;
  onUpdate?: (task: Task) => void;
  style?: ViewStyle | ViewStyle[];
  task: Task;
  revalidateKey?: string | null;
  readonly?: boolean; // Add readonly prop
}

export default function TaskItem({
  task,
  onUpdate,
  style,
  hideDueDate = false,
  revalidateKey,
  readonly = false, // Default to false
}: TaskProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(task.task_name);
  const [loading, setLoading] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const theme = useTheme();
  const swipeableRef = useRef(null);
  const tapRef = useRef(null);

  const handleToggle = async () => {
    if (readonly) return; // Prevent toggle if readonly
    setLoading(true);
    try {
      const updated = await toggleTaskDone(task.id, !task.is_done);
      if (onUpdate) onUpdate(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (readonly) return; // Prevent edit if readonly
    if (name !== task.task_name) {
      setLoading(true);
      try {
        const updated = await updateTaskName(task.id, name);
        if (onUpdate) onUpdate(updated);
      } finally {
        setLoading(false);
      }
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (readonly) return; // Prevent delete if readonly
    await deleteTask(task.id);
    if (revalidateKey) {
      mutate(revalidateKey);
    }
  };

  const handleDueDateChange = async (newDate: Date) => {
    if (readonly) return; // Prevent due date change if readonly
    setLoading(true);
    try {
      const updated = await updateTaskDueDate(task.id, newDate);
      if (onUpdate) onUpdate(updated);
    } finally {
      setLoading(false);
    }
    setDatePickerVisible(false);
  };

  const renderRightActions = () =>
    !readonly ? (
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: theme.destructive }]}
        onPress={handleDelete}
        accessibilityLabel="Delete task"
      >
        <Text style={{ color: theme.textInverse }}>Delete</Text>
      </TouchableOpacity>
    ) : null;

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} enabled={!readonly}>
      <TapGestureHandler
        ref={tapRef}
        waitFor={swipeableRef}
        onActivated={() => {
          if (!task.is_done && !readonly) setEditing(true);
        }}
      >
        <View style={[styles.container, { backgroundColor: theme.background }, style]}>
          <TouchableOpacity
            onPress={handleToggle}
            disabled={loading || readonly}
            style={[styles.checkbox, { cursor: loading || readonly ? 'auto' : 'pointer' }]}
          >
            {task.is_done ? (
              <View style={[styles.checkedBox, { backgroundColor: theme.success }]}>
                <CheckIcon style={styles.checkIcon} color={theme.white} />
              </View>
            ) : (
              <View style={[styles.uncheckedBox, { borderColor: theme.text }]} />
            )}
          </TouchableOpacity>
          <View style={styles.textAndDueDateWrap}>
            {editing && !readonly ? (
              <TextInput
                value={name}
                onChangeText={setName}
                onBlur={handleEdit}
                onSubmitEditing={handleEdit}
                style={[styles.text, styles.input, task.is_done && styles.doneText]}
                autoFocus
                underlineColorAndroid="transparent"
                selectionColor={theme.text}
                editable={!task.is_done && !readonly}
              />
            ) : (
              // @ts-expect-error "cursor: text" works for web
              <View style={styles.textWrap}>
                <Text
                  style={[
                    styles.text,
                    { textDecorationColor: theme.doneLine },
                    task.is_done && styles.doneText,
                  ]}
                  numberOfLines={1}
                >
                  {task.task_name}
                </Text>
              </View>
            )}
            {!hideDueDate && task.due_date ? (
              <Text size="small" style={[styles.dueDate, { color: theme.secondary }]}>
                {formatDateUI(new Date(task.due_date))}
              </Text>
            ) : null}
          </View>
          {!task.is_done && !readonly && (
            <TouchableOpacity
              style={styles.editDueDateButton}
              onPress={() => setDatePickerVisible(true)}
            >
              <ClockIcon style={styles.clockIcon} color={theme.secondary} />
            </TouchableOpacity>
          )}
          <DatePickerModal
            visible={datePickerVisible}
            date={task.due_date ? new Date(task.due_date) : new Date()}
            onChange={() => {}}
            onCancel={() => setDatePickerVisible(false)}
            onConfirm={handleDueDateChange}
          />
        </View>
      </TapGestureHandler>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  checkIcon: {
    height: 15,
    width: 15,
  },
  checkbox: {
    alignSelf: 'flex-start',
    marginRight: baseTheme.margin[2],
    marginTop: 5,
  },
  checkedBox: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  clockIcon: {
    height: 20,
    marginLeft: baseTheme.margin[2],
    marginVertical: 'auto',
    width: 20,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: baseTheme.margin[3],
    paddingVertical: baseTheme.margin[2],
  },
  deleteButton: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: baseTheme.margin[2],
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  dueDate: { marginTop: baseTheme.margin[1] },
  editDueDateButton: {
    alignSelf: 'stretch',
    cursor: 'pointer',
    flexGrow: 1,
  },
  // eslint-disable-next-line react-native/no-color-literals
  input: {
    flex: 1,
    fontFamily: baseTheme.font.regular,
    fontSize: baseTheme.fontSize.medium,
    outlineColor: 'transparent',
    padding: 0,
    shadowColor: 'transparent',
  },
  text: {
    flexShrink: 1,
    lineHeight: 30,
  },
  textAndDueDateWrap: {
    flex: 1,
  },
  textWrap: {
    cursor: 'text',
    flex: 1,
    marginRight: 8,
  },
  uncheckedBox: {
    borderWidth: 2,
    height: 20,
    width: 20,
  },
});
