import React, { useState } from 'react';
import { View, TextInput, StyleSheet, ViewStyle, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Task, useCreateTask } from '@/db/tasks-convex';
import { useCurrentUserId } from '@/lib/auth-client';
import { baseTheme, useTheme } from '@/lib/theme';
import PlusIcon from '@/assets/icons/plus.svg';
import LockIcon from '@/assets/icons/lock.svg';
import UnlockIcon from '@/assets/icons/unlock.svg';
import { formatDateForDBTimestamp } from '@/lib/date';
import { Id } from '../../backend/convex/_generated/dataModel';

interface NewTaskInputProps {
  onCreate?: (task: Task) => void;
  placeholder?: string;
  style?: ViewStyle | ViewStyle[];
  dueDate?: Date | null;
  ownerUserId?: string; // Added ownerUserId prop
}

export default function NewTaskInput({
  onCreate,
  placeholder = 'New task',
  style,
  dueDate,
  ownerUserId, // Destructure ownerUserId
}: NewTaskInputProps) {
  const [value, setValue] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const currentUserId = useCurrentUserId(); // Renamed to avoid conflict
  const theme = useTheme();
  const createTask = useCreateTask();

  const taskOwnerId = ownerUserId || currentUserId; // Determine the owner of the task

  const handleCreate = async () => {
    if (!value.trim() || !taskOwnerId) return; // Use taskOwnerId in validation

    try {
      setIsCreating(true);
      const assignedBy =
        taskOwnerId && taskOwnerId !== currentUserId && currentUserId ? currentUserId : undefined;

      const taskId = await createTask({
        taskName: value.trim(),
        dueDate: dueDate ? dueDate.getTime() : undefined,
        isPrivate: isPrivate,
        assignedBy: assignedBy as Id<'users'> | undefined,
        userId: taskOwnerId as Id<'users'>,
      });

      // Create optimistic task for immediate UI update
      // const optimisticTask: Task = {
      //   _id: taskId,
      //   task_name: value.trim(),
      //   updated_at: formatDateForDBTimestamp(new Date()),
      //   user_id: taskOwnerId,
      //   is_done: false,
      //   dueDate: dueDate ? formatDateForDBTimestamp(dueDate) : null,
      //   isPrivate: isPrivate,
      //   assignedBy:
      //     taskOwnerId && taskOwnerId !== currentUserId && currentUserId ? currentUserId : undefined,
      // };

      // if (onCreate) {
      //   onCreate(optimisticTask);
      // }

      setValue('');
    } catch (error) {
      console.error('Failed to create task:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsCreating(false);
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
        editable={!isCreating}
        returnKeyType="done"
      />
      {/* Only show private/public toggle if creating task for current user */}
      {taskOwnerId === currentUserId && (
        <TouchableOpacity
          style={styles.lockButton}
          onPress={() => setIsPrivate(p => !p)}
          accessibilityLabel={isPrivate ? 'Set task public' : 'Set task private'}
          disabled={isCreating}
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
    paddingLeft: baseTheme.margin[3],
    paddingRight: baseTheme.margin[2],
    paddingVertical: baseTheme.margin[2],
  },
  lockButton: {
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    height: 40,
    justifyContent: 'center',
    width: 40,
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
    paddingLeft: baseTheme.margin[1],
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
