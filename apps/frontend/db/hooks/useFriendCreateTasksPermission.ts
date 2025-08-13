import { useQuery } from 'convex/react';
import { api } from '../../../backend/convex/_generated/api';
import { Id } from '../../../backend/convex/_generated/dataModel';

export function useFriendCreateTasksPermission(
  userId?: Id<'users'> | null,
  friendUserId?: Id<'users'> | null,
) {
  const hasPermission = useQuery(
    api.friends.getFriendCreateTasksPermission,
    userId && friendUserId
      ? {
          userId,
          friendUserId,
        }
      : 'skip',
  );
  return hasPermission ?? false;
}
