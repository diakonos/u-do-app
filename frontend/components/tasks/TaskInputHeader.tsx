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
import { IconSymbol } from '@/components/ui/IconSymbol';

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
        // No due date by default
        await createTask(taskName);
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
        {/* Icon area - either shows plus icon or loading indicator */}
        <View style={styles.iconAreaContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors[colorScheme!].icon} />
          ) : (
            <TouchableOpacity style={styles.iconContainer} activeOpacity={1} disabled={true}>
              <IconSymbol name="plus" size={24} color={Colors[colorScheme!].icon} />
            </TouchableOpacity>
          )}
        </View>

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
          onBlur={() => {
            if (taskName.trim()) {
              addTask();
            }
          }}
          key="task-input"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconAreaContainer: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    marginRight: 20,
    width: 24,
  },
  iconContainer: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
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
});
