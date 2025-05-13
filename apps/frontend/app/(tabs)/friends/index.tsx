import { useRouter } from 'expo-router';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import { useCurrentUserId } from '@/lib/auth';
import useSWR, { mutate } from 'swr';
import {
  getFriendsForUser,
  listFriendRequests,
  searchUsersByUsername,
  sendFriendRequest,
  withdrawFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from '@/db/friends';
import Input from '@/components/Input';
import Button from '@/components/Button';
import PlusIcon from '@/assets/icons/plus.svg';
import FriendItem from '@/components/FriendItem';
import FriendRequestItem from '@/components/FriendRequestItem';

type UserProfile = { user_id: string; username: string };
type Friend = { friend_id: string; friend_username: string };
type FriendRequest = { id: number; requester_id: string; recipient_id: string };

type StatusType =
  | { type: 'friend' }
  | { type: 'pending_sent'; requestId: number }
  | { type: 'pending_received'; requestId: number }
  | { type: 'none' };

function useFriendsData(userId: string | null) {
  const friendsKey = userId ? `friends:${userId}` : null;
  const requestsKey = userId ? `friendRequests:${userId}` : null;
  const { data: friends, isLoading: loadingFriends } = useSWR(
    friendsKey,
    () => getFriendsForUser(userId!),
    { suspense: true },
  );
  const { data: requests, isLoading: loadingRequests } = useSWR(
    requestsKey,
    () => listFriendRequests(userId!),
    { suspense: true },
  );
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

function FriendsList() {
  const userId = useCurrentUserId();
  const { friends, requests } = useFriendsData(userId);
  const theme = useTheme();
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const requestsKey = userId ? `friendRequests:${userId}` : null;
  const friendsKey = userId ? `friends:${userId}` : null;

  const handleWithdraw = async (requestId: number) => {
    if (!userId) return;
    setActionLoading(requestId);
    try {
      await withdrawFriendRequest(requestId, userId);
      if (requestsKey) mutate(requestsKey);
    } finally {
      setActionLoading(null);
    }
  };
  const handleAccept = async (requestId: number) => {
    if (!userId) return;
    setActionLoading(requestId);
    try {
      await acceptFriendRequest(requestId, userId);
      if (requestsKey) mutate(requestsKey);
      if (friendsKey) mutate(friendsKey);
    } finally {
      setActionLoading(null);
    }
  };
  const handleReject = async (requestId: number) => {
    if (!userId) return;
    setActionLoading(requestId);
    try {
      await declineFriendRequest(requestId, userId);
      if (requestsKey) mutate(requestsKey);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      {requests.length > 0 && (
        <View style={styles.section}>
          {requests.map(req => {
            const isSent = req.requester_id === userId;
            const username = isSent ? req.recipient.username : req.requester.username;
            return (
              <FriendRequestItem
                key={req.id}
                username={username}
                isSent={isSent}
                requestId={req.id}
                loading={actionLoading === req.id}
                onWithdraw={handleWithdraw}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            );
          })}
        </View>
      )}
      <View style={styles.section}>
        {friends.length === 0 ? (
          <Text style={{ color: theme.secondary }}>No friends yet.</Text>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={item => item.id || item.user_id}
            renderItem={({ item }) => (
              <FriendItem
                username={item.friend_username}
                onPress={() => router.push(`/friends/${item.friend_username}`)}
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

function SearchResults({
  query,
  userId,
  friends,
  requests,
  onClear,
}: {
  query: string;
  userId: string;
  friends: Friend[];
  requests: FriendRequest[];
  onClear: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);

  const requestsKey = userId ? `friendRequests:${userId}` : null;
  const friendsKey = userId ? `friends:${userId}` : null;

  useEffect(() => {
    let active = true;
    if (!query) return;
    setLoading(true);
    searchUsersByUsername(query)
      .then((users: UserProfile[]) => {
        if (active) setResults(users.filter(u => u.user_id !== userId));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, userId]);

  function getStatus(user: UserProfile): StatusType {
    if (friends.some(f => f.friend_id === user.user_id || f.friend_username === user.username)) {
      return { type: 'friend' };
    }
    const req = requests.find(
      r =>
        (r.requester_id === userId && r.recipient_id === user.user_id) ||
        (r.requester_id === user.user_id && r.recipient_id === userId),
    );
    if (req) {
      if (req.requester_id === userId) return { type: 'pending_sent', requestId: req.id };
      if (req.recipient_id === userId) return { type: 'pending_received', requestId: req.id };
    }
    return { type: 'none' };
  }

  const handleSend = async (user: UserProfile) => {
    setActionLoading(user.user_id);
    try {
      await sendFriendRequest(userId, user.user_id);
      if (requestsKey) mutate(requestsKey);
      onClear();
    } finally {
      setActionLoading(null);
    }
  };
  const handleWithdraw = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      await withdrawFriendRequest(requestId, userId);
      onClear();
    } finally {
      setActionLoading(null);
    }
  };
  const handleAccept = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      await acceptFriendRequest(requestId, userId);
      if (requestsKey) mutate(requestsKey);
      if (friendsKey) mutate(friendsKey);
      onClear();
    } finally {
      setActionLoading(null);
    }
  };
  const handleReject = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      await declineFriendRequest(requestId, userId);
      if (requestsKey) mutate(requestsKey);
      onClear();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <View style={styles.section}>
      <Button title="Clear search" onPress={onClear} style={styles.clearButton} />
      {loading ? (
        <Text>Searching...</Text>
      ) : results.length === 0 ? (
        <Text>No users found.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.user_id}
          renderItem={({ item }) => {
            const status = getStatus(item);
            if (status.type === 'friend') {
              return (
                <FriendItem
                  username={item.username}
                  onPress={() => router.push(`/friends/${item.username}`)}
                />
              );
            } else if (status.type === 'pending_sent' || status.type === 'pending_received') {
              const isSent = status.type === 'pending_sent';
              return (
                <FriendRequestItem
                  username={item.username}
                  isSent={isSent}
                  requestId={status.requestId}
                  loading={actionLoading === status.requestId}
                  onWithdraw={handleWithdraw}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              );
            } else {
              return (
                <View style={styles.resultRow}>
                  <Text
                    style={[styles.friendItem, styles.resultUsername]}
                    onPress={() => router.push(`/friends/${item.username}`)}
                  >
                    {item.username}
                  </Text>
                  <Button
                    title="Add Friend"
                    onPress={() => handleSend(item)}
                    loading={actionLoading === item.user_id}
                    style={styles.addFriendButton}
                    labelStyle={{ color: theme.success }}
                    icon={<PlusIcon color={theme.success} />}
                  />
                </View>
              );
            }
          }}
        />
      )}
    </View>
  );
}

export default function FriendsScreen() {
  const userId = useCurrentUserId();
  const [search, setSearch] = useState('');
  const { friends, requests } = useFriendsData(userId);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setShowSearch(!!text);
  }, []);
  const handleClear = useCallback(() => {
    setSearch('');
    setShowSearch(false);
  }, []);

  if (!userId) return null;

  return (
    <Screen>
      <ScreenTitle>Friends</ScreenTitle>
      <Input
        placeholder="Search users"
        value={search}
        onChangeText={handleSearch}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {showSearch ? (
        <SearchResults
          query={search}
          userId={userId}
          friends={friends}
          requests={requests}
          onClear={handleClear}
        />
      ) : (
        <Suspense fallback={<Text>Loading...</Text>}>
          <FriendsList />
        </Suspense>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // eslint-disable-next-line react-native/no-color-literals
  addFriendButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    flexGrow: 0,
    marginLeft: baseTheme.margin[2],
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowOpacity: 0,
  },
  clearButton: { marginBottom: 12 },
  container: { flex: 1, width: '100%' },
  friendItem: { paddingVertical: baseTheme.margin[2] },
  resultRow: { alignItems: 'center', flexDirection: 'row', marginBottom: baseTheme.margin[2] },
  resultUsername: { flex: 1 },
  searchInput: { marginBottom: baseTheme.margin[2], marginHorizontal: baseTheme.margin[3] },
  section: { paddingHorizontal: baseTheme.margin[3] },
});
