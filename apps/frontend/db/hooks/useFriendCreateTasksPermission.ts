import useSWR from 'swr';
import { getFriendCreateTasksPermission } from '@/db/friends';

export function useFriendCreateTasksPermission(userId: string | null, friendUserId: string | null) {
  return useSWR(
    userId && friendUserId ? `friend-create-tasks-permission:${userId}:${friendUserId}` : null,
    async () => {
      if (!userId || !friendUserId) return false;
      return getFriendCreateTasksPermission(userId, friendUserId);
    },
  );
}
