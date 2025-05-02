import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { PersistentCache } from '../persistentCache';

export type Task = {
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
  createTask: (taskName: string, dueDate?: string) => Promise<Task>;
  fetchTasks: (forceRefresh?: boolean) => Promise<Task[]>;
  updateTask: (taskId: number, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasksCache, setTasksCache] = useState<Task[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const CACHE_KEY = 'tasks-cache';
  const REVALIDATE_MS = 60 * 1000; // 1 minute

  // Load from persistent cache on mount
  useEffect(() => {
    (async () => {
      const cached = await PersistentCache.get(CACHE_KEY);
      if (cached && cached.value) {
        setTasksCache(cached.value);
        setLastUpdated(cached.updatedAt);
      }
    })();
  }, []);

  const createTask = async (taskName: string, dueDate?: string): Promise<Task> => {
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

    setTasksCache(prevTasks => {
      const updated = [data[0], ...prevTasks];
      PersistentCache.set(CACHE_KEY, updated);
      setLastUpdated(Date.now());
      return updated;
    });
    return data[0];
  };

  // fetchTasks now supports forceRefresh and revalidation
  const fetchTasks = useCallback(
    async (forceRefresh = false): Promise<Task[]> => {
      const now = Date.now();
      const cached = await PersistentCache.get(CACHE_KEY);
      if (
        !forceRefresh &&
        cached &&
        cached.value &&
        cached.updatedAt &&
        now - cached.updatedAt < REVALIDATE_MS
      ) {
        setTasksCache(cached.value);
        setLastUpdated(cached.updatedAt);
        return cached.value;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasksCache(tasks);
      setLastUpdated(Date.now());
      PersistentCache.set(CACHE_KEY, tasks);
      return tasks;
    },
    [REVALIDATE_MS],
  );

  const updateTask = async (taskId: number, updates: Partial<Task>): Promise<Task> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const updatesToSend: Partial<Task> & { updated_at: string } = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.due_date) {
      try {
        const date = new Date(updates.due_date);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          updatesToSend.due_date = `${year}-${month}-${day}`;
        } else {
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
      .update(updatesToSend)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    setTasksCache(prevTasks => {
      const updated = prevTasks.map(task => (task.id === taskId ? data : task));
      PersistentCache.set(CACHE_KEY, updated);
      setLastUpdated(Date.now());
      return updated;
    });

    return data;
  };

  const deleteTask = async (taskId: number): Promise<void> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) throw error;

    setTasksCache(prevTasks => {
      const updated = prevTasks.filter(task => task.id !== taskId);
      PersistentCache.set(CACHE_KEY, updated);
      setLastUpdated(Date.now());
      return updated;
    });
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
