import { createContext, useContext, useCallback } from 'react';
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
  createTask: (taskName: string, dueDate: string) => Promise<Task>;
  fetchTasks: () => Promise<Task[]>;
  updateTask: (taskId: number, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const createTask = async (taskName: string, dueDate: string): Promise<Task> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-new-task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_name: taskName,
        due_date: dueDate,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create task');
    }

    const { data } = await response.json();
    return { ...data[0], is_done: false };
  };

  const fetchTasks = useCallback(async (): Promise<Task[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session.user.id) // Filter by the current user's ID
      .order('created_at', { ascending: false });

    if (error) throw error;
    return tasks;
  }, []);

  const updateTask = async (taskId: number, updates: Partial<Task>): Promise<Task> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteTask = async (taskId: number): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  };

  return (
    <TaskContext.Provider value={{ createTask, fetchTasks, updateTask, deleteTask }}>
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