import useSWR from 'swr';
import { fetchScheduledTasks, Task } from '@/db/tasks';
import useSWRSubscription from 'swr/dist/subscription';
import { supabase } from '@/lib/supabase';

export function useScheduledTasks(userId: string | null) {
  const revalidateKey = userId ? `scheduledTasks:${userId}` : null;
  const fetcher = (id: string) => fetchScheduledTasks(id);
  const {
    data: tasks,
    error,
    isLoading,
    mutate,
  } = useSWR(revalidateKey, () => fetcher(userId!), {
    revalidateOnFocus: true,
    suspense: true,
  });

  useSWRSubscription(userId ? `scheduledTasks-sub-${userId}` : null, () => {
    if (!userId) return;
    const channel = supabase
      .channel('tasks-scheduled-' + userId)
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
          function isTask(obj: any): obj is Task {
            return (
              obj && typeof obj === 'object' && 'id' in obj && 'is_done' in obj && 'due_date' in obj
            );
          }
          let isScheduled = false;
          if (isTask(newTask)) {
            const today = new Date().toISOString().slice(0, 10);
            isScheduled = !newTask.is_done && newTask.due_date && newTask.due_date > today;
          }
          if (eventType === 'INSERT' && isScheduled) {
            updatedTasks = [
              newTask as Task,
              ...updatedTasks.filter(t => t.id !== (newTask as Task).id),
            ];
          } else if (eventType === 'UPDATE') {
            updatedTasks = updatedTasks.map(t =>
              t.id === (newTask as Task).id ? (newTask as Task) : t,
            );
          } else if (eventType === 'DELETE') {
            if (isTask(oldTask) && oldTask.id) {
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
