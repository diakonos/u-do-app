import useSWR from 'swr';
import { fetchTodayTasks, Task } from '@/db/tasks';
import useSWRSubscription from 'swr/dist/subscription';
import { formatDateYMD } from '@/lib/date';
import { supabase } from '@/lib/supabase';

export function useTodayTasks(userId: string | null) {
  const revalidateKey = userId ? `todayTasks:${userId}` : null;
  const fetcher = (id: string) => fetchTodayTasks(id);
  const {
    data: tasks,
    error,
    isLoading,
    mutate,
  } = useSWR(revalidateKey, () => fetcher(userId!), {
    suspense: true,
  });

  useSWRSubscription(userId ? `todayTasks-sub-${userId}` : null, () => {
    if (!userId) return;
    const today = formatDateYMD(new Date());
    const channel = supabase
      .channel('tasks-today-' + userId)
      .on<Task>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        async payload => {
          const { eventType, new: newTask, old: oldTask } = payload;
          let updatedTasks = tasks ? [...tasks] : [];
          if (eventType === 'INSERT') {
            if (newTask.due_date === today || (!newTask.due_date && !newTask.is_done)) {
              updatedTasks = [newTask, ...updatedTasks.filter(t => t.id !== newTask.id)];
            }
          } else if (eventType === 'UPDATE') {
            updatedTasks = updatedTasks.map(t => (t.id === newTask.id ? newTask : t));
          } else if (eventType === 'DELETE') {
            if (oldTask?.id) {
              updatedTasks = updatedTasks.filter(t => t.id !== oldTask.id);
            }
          }
          mutate(updatedTasks);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  });

  return { tasks: tasks ?? [], isLoading, error, mutate, revalidateKey };
}
