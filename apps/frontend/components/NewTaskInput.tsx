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
}

type CreateTaskArgs = { name: string; dueDate: Date | null | undefined };

export default function NewTaskInput({
  onCreate,
  placeholder = 'New task',
  style,
  dueDate,
  revalidateKey,
}: NewTaskInputProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const userId = useCurrentUserId();
  const theme = useTheme();

  // SWR mutation hook for creating a task
  const { trigger: triggerCreateTask } = useSWRMutation<Task[], Error, Key, CreateTaskArgs>(
    revalidateKey,
    async (key: string, { arg }: { arg: { name: string; dueDate: Date | null | undefined } }) => {
      return [await createTask(userId!, arg.name, arg.dueDate, isPrivate)];
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
          user_id: userId!,
          is_done: false,
          due_date: dueDate ? formatDateForDBTimestamp(dueDate) : null,
          is_private: isPrivate,
        };
        return [...currentData, optimisticTask];
      },
      populateCache: (result, currentData = []) => {
        return [...currentData, ...result];
      },
      revalidate: false,
    },
  );

  const handleCreate = async () => {
    if (!value.trim() || !userId) return;
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
