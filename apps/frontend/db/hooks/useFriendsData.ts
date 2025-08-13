import { useFriendsForUser, useFriendRequests } from '../friends-convex';
import { Id, Doc } from '../../../backend/convex/_generated/dataModel';

export function useFriendsData(userId: Id<'users'> | null) {
  const friends = useFriendsForUser(userId!);
  const requests = useFriendRequests();

  // Transform friends data to match expected interface
  const transformedFriends = friends
    ? friends
        .filter((friend): friend is NonNullable<typeof friend> => friend !== null)
        .map(friend => ({
          id: friend._id,
          user_id: friend._id,
          friend_username: friend.username || '',
          today_total_tasks: 0, // This would need to be calculated separately if needed
          today_completed_tasks: 0, // This would need to be calculated separately if needed
        }))
        .sort((a, b) => a.friend_username.localeCompare(b.friend_username))
    : [];

  return {
    friends: transformedFriends,
    requests: requests || [],
    loading: friends === undefined || requests === undefined,
  };
}
