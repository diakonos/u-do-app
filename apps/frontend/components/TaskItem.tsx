import { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, type ViewStyle, Platform } from 'react-native';
import { TouchableOpacity, TouchableHighlight } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';
import { Link } from 'expo-router';
import Text from '@/components/Text';
import {
  Task,
  updateTaskName,
  toggleTaskDone,
  deleteTask,
  updateTaskDueDate,
  updateTaskIsPrivate,
} from '@/db/tasks';
import { baseTheme, useTheme } from '@/lib/theme';
import CheckIcon from '@/assets/icons/check.svg';
import ClockIcon from '@/assets/icons/clock.svg';
import LockIcon from '@/assets/icons/lock.svg';
import UnlockIcon from '@/assets/icons/unlock.svg';
import { formatDateUI, formatDateYMD } from '@/lib/date';
import DatePickerModal from '@/components/DatePickerModal';
import { useCurrentUserId } from '@/lib/auth';

interface TaskProps {
  hideDueDate?: boolean;
  onUpdate?: (task: Task) => void;
  style?: ViewStyle | ViewStyle[];
  task: Task;
  revalidateKey?: string | null;
  readonly?: boolean; // Add readonly prop
}

type UpdateTaskIsPrivateArgs = { isPrivate: boolean };
type UpdateTaskNameArgs = { name: string };
type UpdateTaskDueDateArgs = { dueDate: Date };
type UpdateTaskDoneArgs = { isDone: boolean };

export default function TaskItem({
  task,
  onUpdate,
  style,
  hideDueDate = false,
  revalidateKey,
  readonly = false, // Default to false
}: TaskProps) {
  const { mutate } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(task.task_name);
  const [loading, setLoading] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(30);
  const theme = useTheme();
  const swipeableRef = useRef(null);
  const inputRef = useRef<TextInput>(null);
  const userId = useCurrentUserId();
  const isCurrentUserTask = userId === task.user_id;

  // SWR mutation for updating is_private with optimistic response
  const { trigger: triggerUpdateIsPrivate } = useSWRMutation<
    Task[],
    Error,
    string | null | undefined,
    UpdateTaskIsPrivateArgs
  >(
    revalidateKey,
    async (key: string, { arg }: { arg: { isPrivate: boolean } }) => {
      const updated = await updateTaskIsPrivate(task.id, arg.isPrivate);
      if (onUpdate) {
        onUpdate(updated);
      }
      return [updated];
    },
    {
      optimisticData: (currentData = []) => {
        // Return a new array with the updated task
        return currentData.map(t =>
          t.id === task.id ? { ...t, is_private: !task.is_private } : t,
        );
      },
      revalidate: false,
    },
  );

  // SWR mutation for toggling completion with optimistic response
  const { trigger: triggerToggleTaskDone } = useSWRMutation<
    Task[],
    Error,
    string | null | undefined,
    UpdateTaskDoneArgs
  >(revalidateKey, async (key: string, { arg }: { arg: UpdateTaskDoneArgs }) => {
    const updated = await toggleTaskDone(task.id, arg.isDone);
    if (onUpdate) {
      onUpdate(updated);
    }
    return [updated];
  });

  const handleToggle = async () => {
    if (readonly) return; // Prevent toggle if readonly
    setLoading(true);
    try {
      await triggerToggleTaskDone(
        { isDone: !task.is_done },
        {
          optimisticData: (currentData = []) =>
            currentData.map(t => (t.id === task.id ? { ...t, is_done: !task.is_done } : t)),
          revalidate: false,
        },
      );
    } finally {
      setLoading(false);
    }
  };

  // SWR mutation for updating task name with optimistic response (updates the list)
  const { trigger: triggerUpdateTaskName } = useSWRMutation<
    Task[],
    Error,
    string | null | undefined,
    UpdateTaskNameArgs
  >(revalidateKey, async (key: string, { arg }: { arg: UpdateTaskNameArgs }) => {
    const updated = await updateTaskName(task.id, arg.name);
    if (onUpdate) {
      onUpdate(updated);
    }
    return [updated];
  });

  // SWR mutation for updating due date with optimistic response
  const { trigger: triggerUpdateDueDate } = useSWRMutation<
    Task[],
    Error,
    string | null | undefined,
    UpdateTaskDueDateArgs
  >(
    revalidateKey,
    async (key: string, { arg }: { arg: UpdateTaskDueDateArgs }) => {
      const updated = await updateTaskDueDate(task.id, arg.dueDate);
      if (onUpdate) {
        onUpdate(updated);
      }
      return [updated];
    },
    {
      onSuccess: () => {
        mutate(`scheduledTasks:${userId}`);
        mutate(`todayTasks:${userId}`);
      },
    },
  );

  const handleEdit = async () => {
    if (readonly) return; // Prevent edit if readonly
    if (name !== task.task_name) {
      setLoading(true);
      try {
        await triggerUpdateTaskName(
          { name },
          {
            optimisticData: (currentData = []) =>
              currentData.map(t => (t.id === task.id ? { ...t, task_name: name } : t)),
            revalidate: false,
          },
        );
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
      await triggerUpdateDueDate(
        { dueDate: newDate },
        {
          optimisticData: (currentData = []) =>
            currentData.map(t =>
              t.id === task.id ? { ...t, due_date: newDate ? formatDateYMD(newDate) : null } : t,
            ),
        },
      );
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
                        {task.assigned_by_username ? (
                          <Link
                            href={`/friends/${task.assigned_by_username}`}
                            style={styles.usernameLink}
                          >
                            <Text size="small" style={{ color: theme.link }}>
                              {task.assigned_by_username}
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
              onPress={async () => {
                const newValue = !task.is_private;
                await triggerUpdateIsPrivate({ isPrivate: newValue });
              }}
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
  dueDateAndAssignedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: baseTheme.margin[1],
    marginTop: baseTheme.margin[1],
  },
  editDueDateButton: {
    alignSelf: 'stretch',
    cursor: 'pointer',
    flexGrow: 0,
  },
  icon: {
    alignSelf: 'center',
    marginLeft: baseTheme.margin[3],
    marginTop: 5,
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
  separator: { marginTop: baseTheme.margin[1] },
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
  usernameLink: {
    alignSelf: 'flex-start',
  },
});
