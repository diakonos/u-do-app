import { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, type ViewStyle, Platform } from 'react-native';
import { TouchableOpacity, TouchableHighlight } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Link } from 'expo-router';
import Text from '@/components/Text';
import {
  Task,
  useUpdateTaskName,
  useToggleTaskDone,
  useDeleteTask,
  useUpdateTaskDueDate,
  useUpdateTaskIsPrivate,
} from '@/db/tasks-convex';
import { baseTheme, useTheme } from '@/lib/theme';
import CheckIcon from '@/assets/icons/check.svg';
import ClockIcon from '@/assets/icons/clock.svg';
import LockIcon from '@/assets/icons/lock.svg';
import UnlockIcon from '@/assets/icons/unlock.svg';
import { formatDateUI } from '@/lib/date';
import DatePickerModal from '@/components/DatePickerModal';
import { useCurrentUserId } from '@/lib/auth-client';
import { Id } from '../../backend/convex/_generated/dataModel';

interface TaskProps {
  hideDueDate?: boolean;
  onUpdate?: (task: Task) => void;
  style?: ViewStyle | ViewStyle[];
  task: Task;
  readonly?: boolean; // Add readonly prop
}

export default function TaskItem({
  task,
  onUpdate,
  style,
  hideDueDate = false,
  readonly = false, // Default to false
}: TaskProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(task.task_name);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(30);
  const theme = useTheme();
  const swipeableRef = useRef(null);
  const inputRef = useRef<TextInput>(null);
  const userId = useCurrentUserId();
  const isCurrentUserTask = userId === task.user_id;

  // Convex mutations
  const updateIsPrivate = useUpdateTaskIsPrivate();
  const toggleTaskDone = useToggleTaskDone();
  const updateTaskName = useUpdateTaskName();
  const updateDueDate = useUpdateTaskDueDate();
  const deleteTask = useDeleteTask();

  // For now, we'll use a simple loading state
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (readonly) return; // Prevent toggle if readonly
    try {
      setIsLoading(true);
      const updated = await toggleTaskDone({
        taskId: task._id,
        isDone: !task.is_done,
      });
      if (onUpdate && updated) {
        onUpdate(updated);
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (readonly) return; // Prevent edit if readonly
    if (name !== task.task_name) {
      try {
        setIsLoading(true);
        const updated = await updateTaskName({
          taskId: task._id,
          taskName: name,
        });
        if (onUpdate && updated) {
          onUpdate(updated);
        }
      } catch (error) {
        console.error('Failed to update task name:', error);
      } finally {
        setIsLoading(false);
      }
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (readonly) return; // Prevent delete if readonly
    try {
      setIsLoading(true);
      await deleteTask({ taskId: task._id });
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDueDateChange = async (newDate: Date) => {
    if (readonly) return; // Prevent due date change if readonly
    try {
      setIsLoading(true);
      const updated = await updateDueDate({
        taskId: task._id,
        dueDate: newDate.getTime(),
      });
      if (onUpdate && updated) {
        onUpdate(updated);
      }
    } catch (error) {
      console.error('Failed to update due date:', error);
    } finally {
      setIsLoading(false);
    }
    setDatePickerVisible(false);
  };

  const handleTogglePrivate = async () => {
    if (readonly) return;
    try {
      setIsLoading(true);
      const updated = await updateIsPrivate({
        taskId: task._id,
        isPrivate: !task.is_private,
      });
      if (onUpdate && updated) {
        onUpdate(updated);
      }
    } catch (error) {
      console.error('Failed to update task privacy:', error);
    } finally {
      setIsLoading(false);
    }
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

  // Focus the input when editing becomes true
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

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
            disabled={isLoading || readonly}
            // eslint-disable-next-line react-native/no-inline-styles
            style={[styles.checkbox, { cursor: isLoading || readonly ? 'auto' : 'pointer' }]}
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
                  ref={inputRef}
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
            {(!hideDueDate && task.due_date) || task.assigned_by ? (
              <View style={styles.dueDateAndAssignedWrap}>
                {!hideDueDate && task.due_date ? (
                  <Text size="small" style={[styles.dueDate, { color: theme.secondary }]}>
                    {formatDateUI(new Date(task.due_date))}
                  </Text>
                ) : null}
                {!hideDueDate && task.due_date && task.assigned_by ? (
                  <Text size="small" style={[styles.separator, { color: theme.secondary }]}>
                    •
                  </Text>
                ) : null}
                {task.assigned_by ? (
                  <Text size="small" style={[styles.assignedLabel, { color: theme.secondary }]}>
                    {task.assigned_by === userId ? (
                      'Assigned by you'
                    ) : (
                      <>
                        Assigned by{' '}
                        {task.assigned_by ? (
                          <Link href={`/friends/${task.assigned_by}`} style={styles.usernameLink}>
                            <Text size="small" style={{ color: theme.link }}>
                              {task.assigned_by}
                            </Text>
                          </Link>
                        ) : (
                          'a friend'
                        )}
                      </>
                    )}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
          {!task.is_done && !readonly && (
            <TouchableOpacity
              style={styles.editDueDateButton}
              onPress={() => setDatePickerVisible(true)}
            >
              <ClockIcon style={styles.icon} color={theme.secondary} />
            </TouchableOpacity>
          )}
          {isCurrentUserTask && (
            <TouchableOpacity
              style={styles.editDueDateButton}
              onPress={handleTogglePrivate}
              accessibilityLabel={task.is_private ? 'Set task public' : 'Set task private'}
            >
              {task.is_private ? (
                <LockIcon style={styles.icon} color={theme.primary} />
              ) : (
                <UnlockIcon style={styles.icon} color={theme.secondary} />
              )}
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
  assignedLabel: { marginTop: baseTheme.margin[1] },
  checkIcon: {
    height: 15,
    width: 15,
  },
  checkbox: {
    alignItems: 'center',
    display: 'flex',
    minHeight: 40,
    minWidth: 40,
    paddingTop: baseTheme.margin[2],
  },
  checkedBox: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: baseTheme.margin[2],
    paddingVertical: baseTheme.margin[1],
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
  dueDateAndAssignedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: baseTheme.margin[1],
  },
  editDueDateButton: {
    alignItems: 'center',
    cursor: 'pointer',
    flexGrow: 0,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 40,
  },
  icon: {
    alignSelf: 'center',
  },
  // eslint-disable-next-line react-native/no-color-literals
  input: {
    fontFamily: baseTheme.font.regular,
    fontSize: baseTheme.fontSize.medium,
    left: 0,
    // paddingTop: 0,
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
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  separator: { marginTop: baseTheme.margin[1] },
  text: {
    lineHeight: 30,
  },
  textAndDueDateWrap: {
    flex: 1,
    marginLeft: baseTheme.margin[1],
  },
  textWrap: {
    flex: 1,
    marginRight: 8,
    paddingTop: 5,
  },
  uncheckedBox: {
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  usernameLink: {
    alignSelf: 'flex-start',
  },
});
