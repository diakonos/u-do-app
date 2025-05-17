import React, { useState } from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Task, createTask } from '@/db/tasks';
import { useCurrentUserId } from '@/lib/auth';
import { baseTheme, useTheme } from '@/lib/theme';
import PlusIcon from '@/assets/icons/plus.svg';
import { Platform } from 'react-native';

interface NewTaskInputProps {
  onCreate?: (task: Task) => void;
  placeholder?: string;
  style?: ViewStyle | ViewStyle[];
  dueDate?: Date | null;
}

export default function NewTaskInput({
  onCreate,
  placeholder = 'New task',
  style,
  dueDate,
}: NewTaskInputProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = useCurrentUserId();
  const theme = useTheme();

  const handleCreate = async () => {
    if (!value.trim() || !userId) return;
    setLoading(true);
    try {
      const task = await createTask(userId, value.trim(), dueDate);
      if (onCreate) onCreate(task);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 0,
    flexDirection: 'row',
    height: 40,
    paddingHorizontal: baseTheme.margin[3],
    paddingVertical: baseTheme.margin[2],
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
  },
  plusIcon: {
    flexGrow: 0,
    flexShrink: 0,
    height: 20,
    marginRight: baseTheme.margin[2],
    width: 20,
  },
});
