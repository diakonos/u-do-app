import { useTodayTasks as useTodayTasksConvex } from '@/db/tasks-convex';
import { Id } from '../../../backend/convex/_generated/dataModel';

export function useTodayTasks(userId?: string | null) {
  // Convert string userId to Convex Id if needed
  const convexUserId = userId as Id<'users'> | null;
  return useTodayTasksConvex(convexUserId);
}
