import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  useColorScheme,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTask } from '@/lib/context/task';

// Using type instead of empty interface
type TaskInputHeaderProps = Record<string, never>;

export const TaskInputHeader: React.FC<TaskInputHeaderProps> = () => {
  const colorScheme = useColorScheme();
  const { createTask } = useTask();
  const [taskName, setTaskName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const input = useRef<TextInput>(null);

  const addTask = async () => {
    if (taskName.trim()) {
      setIsLoading(true);
      try {
        const dueDate = new Date().toISOString();
        await createTask(taskName, dueDate);
        setTaskName('');
        input.current?.clear();
      } catch (error) {
        Alert.alert('Error', 'Failed to create task. Please try again.');
        console.error('Failed to create task:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <View>
      <View style={styles.inputContainer}>
        {/* Empty checkbox to match task item appearance */}
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: Colors[colorScheme!].icon }]}
          activeOpacity={1}
          disabled={true}
        >
          <View style={styles.checkboxInner} />
        </TouchableOpacity>

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={Colors[colorScheme!].icon}
            style={styles.loadingIndicator}
          />
        )}
        <TextInput
          ref={input}
          style={[
            styles.input,
            {
              color: Colors[colorScheme!].text,
            },
          ]}
          placeholder="New task"
          placeholderTextColor={Colors[colorScheme!].icon}
          defaultValue={taskName}
          onChangeText={text => {
            setTaskName(text);
          }}
          onSubmitEditing={addTask}
          key="task-input"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    marginRight: 20,
    width: 24,
  },
  checkboxInner: {
    borderRadius: 0,
    height: 24,
    width: 24,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: 40,
    // @ts-expect-error Property is valid
    outlineStyle: 'none',
    paddingRight: 8,
  },
  inputContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  loadingIndicator: {
    marginRight: 8,
  },
});
