import { createContext, useContext, useCallback, useState } from 'react';
import { supabase } from '../supabase';

type Task = {
  id: number;
  task_name: string;
  due_date: string;
  is_done: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type TaskContextType = {
  tasks: Task[];
  createTask: (taskName: string, dueDate: string) => Promise<Task>;
  fetchTasks: () => Promise<Task[]>;
  updateTask: (taskId: number, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasksCache, setTasksCache] = useState<Task[]>([]);
  const createTask = async (taskName: string, dueDate: string): Promise<Task> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        { user_id: session.user.id, task_name: taskName, due_date: dueDate, is_done: false },
      ])
      .select();

    if (error) {
      throw new Error(error.message || 'Failed to create task');
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to create task');
    }

    setTasksCache(prevTasks => [data[0], ...prevTasks]);
    return data[0];
  };

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id) // Filter by the current user's ID
      .order('created_at', { ascending: false });

    if (error) throw error;
    setTasksCache(tasks);
    return tasks;
  }, []);

  const updateTask = async (taskId: number, updates: Partial<Task>): Promise<Task> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    // Prepare the updates object, formatting the due_date if present
    const updatesToSend: Partial<Task> & { updated_at: string } = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.due_date) {
      try {
        // Convert to Date object first to handle various input string formats
        const date = new Date(updates.due_date);
        // Check if the date is valid
        if (!isNaN(date.getTime())) {
          // Format to YYYY-MM-DD using local time methods
          const year = date.getFullYear();
          // Months are 0-indexed, add 1 and pad with '0' if needed
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          // Pad day with '0' if needed
          const day = date.getDate().toString().padStart(2, '0');
          updatesToSend.due_date = `${year}-${month}-${day}`;
        } else {
          // Handle invalid date string - log warning and remove from update
          console.warn('Invalid due_date received, removing from update:', updates.due_date);
          delete updatesToSend.due_date;
        }
      } catch (e) {
        console.error('Error processing due_date, removing from update:', e);
        delete updatesToSend.due_date;
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updatesToSend) // Use the potentially modified updatesToSend object
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    // Update local cache using the data returned from Supabase for consistency
    setTasksCache(prevTasks => prevTasks.map(task => (task.id === taskId ? data : task)));

    return data; // Ensure the function returns the updated task data
  };

  const deleteTask = async (taskId: number): Promise<void> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) throw error;

    setTasksCache(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  return (
    <TaskContext.Provider
      value={{ tasks: tasksCache, createTask, fetchTasks, updateTask, deleteTask }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};
