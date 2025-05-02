import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { supabase } from '../supabase';
import { ApiService, RealtimePayload } from '../services/api';
import useCache from '@/hooks/useCache';

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
  fetchTasks: (forceRefresh?: boolean) => void;
  updateTask: (taskId: number, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);
const CACHE_KEY = 'tasks-cache';
const REVALIDATE_MS = 60 * 1000; // 1 minute
export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasksCache, setTasksCache, lastUpdatedAt] = useCache<Task[]>(CACHE_KEY, []);

  // Realtime subscription for current user's tasks
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      // Listen for INSERT, UPDATE, DELETE on current user's tasks
      unsubscribe = ApiService.subscribeToChanges(
        'tasks',
        '*',
        `user_id=eq.${userId}`,
        (payload: RealtimePayload) => {
          setTasksCache((prevTasks: Task[]) => {
            if (payload.eventType === 'INSERT') {
              // Add new task if not already present
              if (!prevTasks.some(t => t.id === payload.new.id)) {
                const updated = [payload.new as Task, ...prevTasks];
                return updated;
              }
              return prevTasks;
            } else if (payload.eventType === 'UPDATE') {
              console.log('Update payload:', payload);
              const updated = prevTasks.map(t =>
                t.id === payload.new.id ? { ...(payload.new as Task) } : t,
              );
              return updated;
            } else if (payload.eventType === 'DELETE') {
              const updated = prevTasks.filter(t => t.id !== payload.old?.id);
              return updated;
            }
            return prevTasks;
          });
        },
      );
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setTasksCache]);

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
      return updated;
    });
    return data[0];
  };

  // fetchTasks now supports forceRefresh and revalidation
  const fetchTasks = useCallback(
    async (forceRefresh = false): Promise<void> => {
      const now = Date.now();
      if (!forceRefresh && tasksCache && lastUpdatedAt && now - lastUpdatedAt < REVALIDATE_MS) {
        return;
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
      return;
    },
    [lastUpdatedAt, setTasksCache, tasksCache],
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
