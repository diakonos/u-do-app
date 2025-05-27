import React, { useState } from 'react';
import { Key } from 'swr';
import useSWRMutation from 'swr/mutation';
import { View, TextInput, StyleSheet, ViewStyle, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Task, createTask } from '@/db/tasks';
import { useCurrentUserId } from '@/lib/auth';
import { baseTheme, useTheme } from '@/lib/theme';
import PlusIcon from '@/assets/icons/plus.svg';
import LockIcon from '@/assets/icons/lock.svg';
import UnlockIcon from '@/assets/icons/unlock.svg';
import { formatDateForDBTimestamp } from '@/lib/date';

interface NewTaskInputProps {
  onCreate?: (task: Task) => void;
  placeholder?: string;
  style?: ViewStyle | ViewStyle[];
  dueDate?: Date | null;
  revalidateKey: string | null;
  ownerUserId?: string; // Added ownerUserId prop
}

type CreateTaskArgs = { name: string; dueDate: Date | null | undefined };

export default function NewTaskInput({
  onCreate,
  placeholder = 'New task',
  style,
  dueDate,
  revalidateKey,
  ownerUserId, // Destructure ownerUserId
}: NewTaskInputProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const currentUserId = useCurrentUserId(); // Renamed to avoid conflict
  const theme = useTheme();

  const taskOwnerId = ownerUserId || currentUserId; // Determine the owner of the task

  // SWR mutation hook for creating a task
  const { trigger: triggerCreateTask } = useSWRMutation<Task[], Error, Key, CreateTaskArgs>(
    revalidateKey,
    async (key: string, { arg }: { arg: { name: string; dueDate: Date | null | undefined } }) => {
      // Use taskOwnerId when creating the task, pass currentUserId as assigned_by if creating for someone else
      const assignedBy =
        taskOwnerId && taskOwnerId !== currentUserId && currentUserId ? currentUserId : undefined;
      return [await createTask(taskOwnerId!, arg.name, arg.dueDate, isPrivate, assignedBy)];
    },
    {
      onSuccess(data) {
        if (onCreate) {
          onCreate(data[0]);
        }
      },
      optimisticData: (currentData = []) => {
        const optimisticTask: Task = {
          id: 0,
          task_name: value.trim(),
          created_at: formatDateForDBTimestamp(new Date()),
          updated_at: formatDateForDBTimestamp(new Date()),
          user_id: taskOwnerId!, // Use taskOwnerId for optimistic update
          is_done: false,
          due_date: dueDate ? formatDateForDBTimestamp(dueDate) : null,
          is_private: isPrivate,
          assigned_by:
            taskOwnerId && taskOwnerId !== currentUserId && currentUserId
              ? currentUserId
              : undefined,
        };
        return [...currentData, optimisticTask];
      },
      populateCache: (result, currentData = []) => {
        return [...currentData, ...result];
      },
    },
  );

  const handleCreate = async () => {
    if (!value.trim() || !taskOwnerId) return; // Use taskOwnerId in validation
    setLoading(true);
    try {
      await triggerCreateTask({ name: value.trim(), dueDate });
      setValue('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <PlusIcon style={styles.plusIcon} color={theme.placeholder} />
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={handleCreate}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholder}
        style={[
          styles.newTaskInput,
          { color: theme.text },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
        ]}
        editable={!loading}
        returnKeyType="done"
      />
      {/* Only show private/public toggle if creating task for current user */}
      {taskOwnerId === currentUserId && (
        <TouchableOpacity
          style={styles.lockButton}
          onPress={() => setIsPrivate(p => !p)}
          accessibilityLabel={isPrivate ? 'Set task public' : 'Set task private'}
          disabled={loading}
        >
          {isPrivate ? (
            <LockIcon style={styles.lockIcon} color={theme.primary} />
          ) : (
            <UnlockIcon style={styles.lockIcon} color={theme.secondary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 0,
    flexDirection: 'row',
    height: 50,
    paddingHorizontal: baseTheme.margin[3],
    paddingVertical: baseTheme.margin[2],
  },
  lockButton: {
    alignItems: 'flex-end',
    flexGrow: 0,
    flexShrink: 0,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  lockIcon: {
    height: 21,
    width: 18,
  },
  // eslint-disable-next-line react-native/no-color-literals
  newTaskInput: {
    flex: 1,
    fontFamily: baseTheme.font.regular,
    fontSize: baseTheme.fontSize.medium,
    includeFontPadding: false,
    outlineColor: 'transparent',
    padding: 0,
    shadowColor: 'transparent',
    textAlignVertical: 'center',
    width: '100%',
  },
  plusIcon: {
    flexGrow: 0,
    flexShrink: 0,
    height: 20,
    marginRight: baseTheme.margin[2],
    width: 20,
  },
});
