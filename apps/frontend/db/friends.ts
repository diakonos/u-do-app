import { supabase } from '@/lib/supabase';

// Get confirmed friends for a user
export async function getFriendsForUser(userId: string) {
  const { data, error } = await supabase.from('friends_view').select('*').eq('user_id', userId);
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
