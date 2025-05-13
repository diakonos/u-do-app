import useSWR from 'swr';
import useSWRSubscription from 'swr/dist/subscription';
import { fetchArchivedTasks, Task } from '@/db/tasks';
import { supabase } from '@/lib/supabase';

export function useArchivedTasks(userId: string | null, page: number, pageSize: number) {
  const revalidateKey = userId ? `archivedTasks:${userId}:${page}` : null;
  const fetcher = (id: string) => fetchArchivedTasks(id, page, pageSize);
  const {
    data: tasks,
    error,
    isLoading,
    mutate,
  } = useSWR(revalidateKey, () => fetcher(userId!), {
    revalidateOnFocus: true,
    suspense: true,
  });

  useSWRSubscription(userId ? `archivedTasks-sub-${userId}` : null, () => {
    if (!userId) return;
    const channel = supabase
      .channel('tasks-archived-' + userId)
      .on<Task>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          mutate();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  });

  return { tasks: tasks ?? [], isLoading, error, mutate, revalidateKey };
}
