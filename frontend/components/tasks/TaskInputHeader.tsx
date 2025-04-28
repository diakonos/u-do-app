import React, { useRef, useState } from 'react';
import { 
  View, 
  TextInput,
  TouchableOpacity, 
  Text, 
  StyleSheet,
  useColorScheme,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTask } from '@/lib/context/task';
import { ThemedInput } from '@/components/ThemedInput';

interface TaskInputHeaderProps {
}

export const TaskInputHeader: React.FC<TaskInputHeaderProps> = ({ 
}) => {
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
    <View style={styles.listHeader}>
      <ThemedInput
        ref={input}
        style={styles.input}
        placeholder="Enter task name"
        defaultValue={taskName}
        onChangeText={(text) => {
          setTaskName(text);
        }}
        onSubmitEditing={addTask}
        key="task-input"
        lightBorderColor={Colors.light.icon}
        darkBorderColor={Colors.dark.icon}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: Colors[colorScheme!].tint}]} 
          onPress={addTask}
        >
          {isLoading ? <ActivityIndicator color={Colors[colorScheme!].white} /> : <Text style={styles.addButtonText}>Add Task</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  listHeader: {
    paddingTop: 16,
    marginTop: 8,
  },
  input: {
    padding: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    height: 40,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});