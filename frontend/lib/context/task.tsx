import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
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
  archivedTasks: Task[];
  scheduledTasks: Task[];
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

  // Compute archived tasks (completed, not updated today)
  const archivedTasks = useMemo(() => {
    const today = new Date('2025-05-02T00:00:00');
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tasksCache
      .filter(task => {
        if (!task.is_done) return false;
        const updatedAt = new Date(task.updated_at);
        return updatedAt < today || updatedAt >= tomorrow;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [tasksCache]);

  // Compute scheduled tasks (incomplete, due in the future)
  const scheduledTasks = useMemo(() => {
    const today = new Date('2025-05-02T00:00:00');
    today.setHours(0, 0, 0, 0);
    return tasksCache
      .filter(task => {
        if (task.is_done) return false;
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate > today;
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [tasksCache]);

  // Filter out archived and scheduled tasks from tasks value
  const nonArchivedNonScheduledTasks = useMemo(() => {
    const excludeIds = new Set([...archivedTasks.map(t => t.id), ...scheduledTasks.map(t => t.id)]);
    return tasksCache
      .filter(task => !excludeIds.has(task.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [tasksCache, archivedTasks, scheduledTasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks: nonArchivedNonScheduledTasks,
        createTask,
        fetchTasks,
        updateTask,
        deleteTask,
        archivedTasks,
        scheduledTasks,
      }}
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
