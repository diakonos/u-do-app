import useSWR from 'swr';
import useSWRSubscription from 'swr/dist/subscription';
import { getFriendsForUser, listFriendRequests } from '@/db/friends';
import { supabase } from '@/lib/supabase';

export function useFriendsData(userId: string | null) {
  const friendsKey = userId ? `friends:${userId}` : null;
  const requestsKey = userId ? `friendRequests:${userId}` : null;
  const {
    data: friends,
    isLoading: loadingFriends,
    mutate: mutateFriends,
  } = useSWR(friendsKey, () => getFriendsForUser(userId!), { suspense: true });
  const {
    data: requests,
    isLoading: loadingRequests,
    mutate: mutateRequests,
  } = useSWR(requestsKey, () => listFriendRequests(userId!), { suspense: true });

  // Realtime subscription for friends (confirmed requests where user is requester or recipient)
  useSWRSubscription(friendsKey, () => {
    if (!userId) return;
    const channel = supabase
      .channel('friends-' + userId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `status=eq.confirmed,or(requester_id.eq.${userId},recipient_id.eq.${userId})`,
        },
        () => {
          mutateFriends();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  });

  // Realtime subscription for pending friend requests involving the user
  useSWRSubscription(requestsKey, () => {
    if (!userId) return;
    const channel = supabase
      .channel('friend-requests-' + userId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `status=eq.pending,or(requester_id.eq.${userId},recipient_id.eq.${userId})`,
        },
        () => {
          mutateRequests();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  });

  return {
    friends: friends
      ? [...friends].sort((a, b) =>
          (a.friend_username || '').localeCompare(b.friend_username || ''),
        )
      : [],
    requests: requests || [],
    loading: loadingFriends || loadingRequests,
  };
}
