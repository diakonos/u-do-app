import { supabase } from '@/lib/supabase';
import { formatDateForDBTimestamp, formatDateYMD } from '@/lib/date';
import { generateTimestamp } from '@/db/lib';

// Get confirmed friends for a user
export async function getFriendsForUser(userId: string) {
  // Calculate today boundaries
  const updatedAtMin = new Date();
  updatedAtMin.setHours(0, 0, 0, 0);
  const updatedAtMinTimestamp = formatDateForDBTimestamp(updatedAtMin);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const tomorrowStr = formatDateYMD(tomorrow);

  // Single query: join friends_view with tasks, aggregate today's tasks
  const { data, error } = await supabase.rpc('get_friends_with_today_task_counts', {
    user_id: userId,
    updated_at_min: updatedAtMinTimestamp,
    tomorrow_str: tomorrowStr,
  });
  if (error) throw error;
  return data;
}

// Send a friend request
export async function sendFriendRequest(requesterId: string, recipientId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      requester_id: requesterId,
      recipient_id: recipientId,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select();
  if (error) throw error;
  return data;
}

// List all pending friend requests for a user (as requester or recipient)
export async function listFriendRequests(userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(
      `*, requester:user_profiles!friend_requests_requester_id_fkey1(user_id,username), recipient:user_profiles!friend_requests_recipient_id_fkey1(user_id,username)`,
    )
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq('status', 'pending');
  if (error) throw error;
  return data;
}

// Accept a friend request (recipient only)
export async function acceptFriendRequest(requestId: number, userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .select();
  if (error) throw error;
  return data;
}

// Decline a friend request (recipient only)
export async function declineFriendRequest(requestId: number, userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .select();
  if (error) throw error;
  return data;
}

// Withdraw a friend request (requester only)
export async function withdrawFriendRequest(requestId: number, userId: string) {
  const { data, error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId)
    .eq('requester_id', userId)
    .eq('status', 'pending')
    .select();
  if (error) throw error;
  return data;
}

// Pin a friend to the dashboard
export async function pinFriend(userId: string, friendUsername: string) {
  await supabase
    .from('dashboard_configs')
    .insert({ user_id: userId, block_type: 'friend_tasks', value: friendUsername, order: 0 });
}

// Unpin a friend from the dashboard
export async function unpinFriend(userId: string, friendUsername: string) {
  await supabase
    .from('dashboard_configs')
    .delete()
    .eq('user_id', userId)
    .eq('block_type', 'friend_tasks')
    .eq('value', friendUsername);
}

// Search users by username (case-insensitive, partial match)
export async function searchUsersByUsername(query: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, username')
    .ilike('username', `%${query}%`);
  if (error) throw error;
  return data;
}

// Unfriend a confirmed friend
export async function unfriend(userId: string, friendUserId: string) {
  // Find the confirmed friend request (either direction)
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, requester_id, recipient_id')
    .or(
      `and(requester_id.eq.${userId},recipient_id.eq.${friendUserId}),and(requester_id.eq.${friendUserId},recipient_id.eq.${userId})`,
    )
    .eq('status', 'confirmed')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No confirmed friendship found');
  // Delete the friend request row
  const { error: deleteError } = await supabase.from('friend_requests').delete().eq('id', data.id);
  if (deleteError) throw deleteError;
  return true;
}

// Enable a friend's permission to create tasks for the user
export async function enableFriendCreateTasksPermission(userId: string, friendUserId: string) {
  const { data, error } = await supabase
    .from('friend_permissions')
    .upsert(
      {
        user_id: userId,
        friend_user_id: friendUserId,
        create_tasks: true,
        updated_at: generateTimestamp(),
      },
      { onConflict: 'user_id,friend_user_id' }, // This is the correct syntax for onConflict
    )
    .select();

  if (error) throw error;
  return data;
}

// Disable a friend's permission to create tasks for the user
export async function disableFriendCreateTasksPermission(userId: string, friendUserId: string) {
  const { data, error } = await supabase
    .from('friend_permissions')
    .update({
      create_tasks: false,
      updated_at: generateTimestamp(),
    })
    .eq('user_id', userId)
    .eq('friend_user_id', friendUserId)
    .select();

  if (error) throw error;
  return data;
}

// Get a friend's permission to create tasks for the user
export async function getFriendCreateTasksPermission(userId: string, friendUserId: string) {
  const { data, error } = await supabase
    .from('friend_permissions')
    .select('create_tasks')
    .eq('user_id', userId)
    .eq('friend_user_id', friendUserId)
    .maybeSingle();

  if (error) throw error;
  return data?.create_tasks || false;
}
