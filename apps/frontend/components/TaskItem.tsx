import { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, type ViewStyle, Platform } from 'react-native';
import { TouchableOpacity, TouchableHighlight } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { mutate } from 'swr';
import Text from '@/components/Text';
import { Task, updateTaskName, toggleTaskDone, deleteTask, updateTaskDueDate } from '@/db/tasks';
import { baseTheme, useTheme } from '@/lib/theme';
import CheckIcon from '@/assets/icons/check.svg';
import ClockIcon from '@/assets/icons/clock.svg';
import LockIcon from '@/assets/icons/lock.svg';
import UnlockIcon from '@/assets/icons/unlock.svg';
import { formatDateUI } from '@/lib/date';
import DatePickerModal from '@/components/DatePickerModal';
import { useAuth } from '@/lib/auth';

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
  const [editing, setEditing] = useState(true);
  const [name, setName] = useState(task.task_name);
  const [loading, setLoading] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [inputHeight, setInputHeight] = useState(30);
  const theme = useTheme();
  const swipeableRef = useRef(null);
  const { session } = useAuth();
  const isCurrentUserTask = session?.user?.id === task.user_id;

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
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      enabled={!readonly && !editing}
      containerStyle={{ backgroundColor: theme.background }}
    >
      <TouchableHighlight
        onPress={() => {
          if (!task.is_done && !readonly) setEditing(true);
        }}
        disabled={readonly || editing}
      >
        <View style={[styles.container, { backgroundColor: theme.background }, style]}>
          <TouchableOpacity
            onPress={handleToggle}
            disabled={loading || readonly}
            // eslint-disable-next-line react-native/no-inline-styles
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
              <View style={styles.textWrap}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onBlur={handleEdit}
                  onSubmitEditing={handleEdit}
                  onKeyPress={e => {
                    if (e.nativeEvent.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEdit();
                    }
                  }}
                  style={[
                    styles.text,
                    styles.input,
                    task.is_done && styles.doneText,
                    {
                      color: theme.text,
                      height: inputHeight,
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                  autoFocus
                  underlineColorAndroid="transparent"
                  selectionColor={theme.text}
                  editable={!task.is_done && !readonly}
                  multiline
                  scrollEnabled={false}
                  selectTextOnFocus={false}
                />
                {/* Hidden text for measuring height */}
                <Text
                  style={[styles.text, task.is_done && styles.doneText, styles.measureText]}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  onLayout={e => {
                    const height = e.nativeEvent.layout.height;
                    console.log('Hidden text height:', height);
                    setInputHeight(Math.max(30, height));
                  }}
                >
                  {name || ' '}
                </Text>
              </View>
            ) : (
              <View style={styles.textWrap}>
                <Text
                  style={[
                    styles.text,
                    { textDecorationColor: theme.doneLine },
                    task.is_done && styles.doneText,
                  ]}
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
          {/* Only show lock/unlock toggle for current user's tasks */}
          {isCurrentUserTask && (
            <TouchableOpacity
              style={styles.editDueDateButton}
              onPress={() => setIsPrivate(prev => !prev)}
              accessibilityLabel={isPrivate ? 'Set task public' : 'Set task private'}
            >
              {isPrivate ? (
                <LockIcon style={styles.clockIcon} color={theme.secondary} />
              ) : (
                <UnlockIcon style={styles.clockIcon} color={theme.secondary} />
              )}
            </TouchableOpacity>
          )}
          {/* Clock icon button */}
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
            onCancel={() => setDatePickerVisible(false)}
            onConfirm={handleDueDateChange}
          />
        </View>
      </TouchableHighlight>
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
    alignSelf: 'center',
    marginLeft: baseTheme.margin[3],
    marginTop: 5,
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
    flexGrow: 0,
  },
  // eslint-disable-next-line react-native/no-color-literals
  input: {
    fontFamily: baseTheme.font.regular,
    fontSize: baseTheme.fontSize.medium,
    left: 0,
    padding: 0,
    position: 'absolute',
    shadowColor: 'transparent',
    top: 0,
    width: '100%',
  },
  measureText: {
    fontFamily: baseTheme.font.regular,
    fontSize: baseTheme.fontSize.medium,
    left: 0,
    opacity: 0,
    padding: 0,
    pointerEvents: 'none',
    top: 0,
    width: '100%',
  },
  text: {
    // flexShrink: 1,
    lineHeight: 30,
  },
  textAndDueDateWrap: {
    flex: 1,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
    minHeight: 30,
  },
  uncheckedBox: {
    borderWidth: 2,
    height: 20,
    width: 20,
  },
});
