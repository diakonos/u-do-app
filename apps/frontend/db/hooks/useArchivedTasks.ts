import { useArchivedTasks as useArchivedTasksConvex } from '@/db/tasks-convex';
import { Id } from '../../../backend/convex/_generated/dataModel';

export function useArchivedTasks(userId: string | null, page: number, pageSize: number) {
  // Convert string userId to Convex Id if needed
  const convexUserId = userId as Id<'users'> | null;
  return useArchivedTasksConvex(convexUserId, page, pageSize);
}
