import { supabase } from '@/lib/supabase';
import { formatDateForDBTimestamp, formatDateYMD } from '@/lib/date';

// Loads dashboard pinned friends and their tasks for the current user (today's tasks only)
export async function loadDashboardFriendTasks(userId: string) {
  // Get all pinned friend blocks for the user
  const { data: pinnedBlocks, error: pinnedError } = await supabase
    .from('dashboard_configs')
    .select('value')
    .eq('user_id', userId)
    .eq('block_type', 'friend_tasks');
  if (pinnedError) throw pinnedError;

  const friendUsernames = pinnedBlocks?.map(b => b.value) ?? [];
  if (friendUsernames.length === 0) return [];

  // Get friend info for those usernames, ordered by when they were pinned
  const { data: friends, error: friendsError } = await supabase
    .from('friends_view')
    .select('friend_id, friend_username')
    .in('friend_username', friendUsernames)
    .eq('user_id', userId);
  if (friendsError) throw friendsError;
  if (!friends || friends.length === 0) return [];

  // Order friends by the order/date in dashboard_configs
  const friendOrder: Record<string, number> = {};
  pinnedBlocks.forEach((b, i) => {
    friendOrder[b.value] = i;
  });
  friends.sort(
    (a, b) => (friendOrder[a.friend_username] ?? 0) - (friendOrder[b.friend_username] ?? 0),
  );

  const friendIds = friends.map(f => f.friend_id);
  if (friendIds.length === 0) return [];

  // --- TODAY TASKS LOGIC ---
  const updatedAtMin = new Date();
  updatedAtMin.setHours(0, 0, 0, 0);
  const updatedAtMinTimestamp = formatDateForDBTimestamp(updatedAtMin);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowStr = formatDateYMD(tomorrow);

  // Get all today's tasks for these friend IDs in a single query
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, task_name, due_date, is_done, created_at, updated_at, user_id')
    .in('user_id', friendIds)
    .or(
      `and(is_done.eq.false,due_date.is.null),and(is_done.eq.false,due_date.lt.${tomorrowStr}),and(is_done.eq.true,updated_at.gte.${updatedAtMinTimestamp})`,
    )
    .order('created_at', { ascending: true });
  if (tasksError) throw tasksError;

  // Group tasks by friend_id
  const tasksByFriend: Record<string, any[]> = {};
  for (const task of tasks ?? []) {
    if (!tasksByFriend[task.user_id]) tasksByFriend[task.user_id] = [];
    tasksByFriend[task.user_id].push(task);
  }

  // Merge friend info with their tasks
  return friends.map(friend => ({
    friend_id: friend.friend_id,
    friend_username: friend.friend_username,
    tasks: tasksByFriend[friend.friend_id] || [],
  }));
}
