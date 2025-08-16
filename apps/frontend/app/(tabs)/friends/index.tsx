import { useRouter } from 'expo-router';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import { useCurrentUserId } from '@/lib/auth-client';
import {
  useWithdrawFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useSendFriendRequest,
  useSearchUsers,
} from '@/db/friends-convex';
import Input from '@/components/Input';
import Button from '@/components/Button';
import PlusIcon from '@/assets/icons/plus.svg';
import FriendItem from '@/components/FriendItem';
import FriendRequestItem from '@/components/FriendRequestItem';
import { useFriendsData } from '@/db/hooks/useFriendsData';
import { Id, Doc } from '../../../../backend/convex/_generated/dataModel';

type StatusType =
  | { type: 'friend' }
  | { type: 'pending_sent'; requestId: Id<'friendRequests'> }
  | { type: 'pending_received'; requestId: Id<'friendRequests'> }
  | { type: 'none' };

function FriendsList() {
  const userId = useCurrentUserId();
  const { friends, requests } = useFriendsData(userId);
  const theme = useTheme();
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<Id<'friendRequests'> | null>(null);

  const withdrawFriendRequest = useWithdrawFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const declineFriendRequest = useDeclineFriendRequest();

  const handleWithdraw = async (requestId: Id<'friendRequests'>) => {
    if (!userId) return;
    setActionLoading(requestId);
    try {
      await withdrawFriendRequest({ requestId, userId });
    } finally {
      setActionLoading(null);
    }
  };
  const handleAccept = async (requestId: Id<'friendRequests'>) => {
    if (!userId) return;
    setActionLoading(requestId);
    try {
      await acceptFriendRequest({ requestId, userId });
    } finally {
      setActionLoading(null);
    }
  };
  const handleReject = async (requestId: Id<'friendRequests'>) => {
    if (!userId) return;
    setActionLoading(requestId);
    try {
      await declineFriendRequest({ requestId, userId });
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
            // For now, we'll show the user ID since we don't have username data in the request
            // This would need to be enhanced to fetch user data separately
            const displayName = req.user?.username ?? 'Unnamed user';
            return (
              <FriendRequestItem
                key={req._id}
                username={displayName}
                isSent={isSent}
                requestId={req._id}
                loading={actionLoading === req._id}
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
                totalTasksTodayCount={item.today_total_tasks}
                completedTasksTodayCount={item.today_completed_tasks}
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
  userId: Id<'users'>;
  friends: ReturnType<typeof useFriendsData>['friends'];
  requests: Doc<'friendRequests'>[];
  onClear: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const [results, setResults] = useState<Doc<'users'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | Id<'friendRequests'> | null>(null);

  const withdrawFriendRequest = useWithdrawFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const declineFriendRequest = useDeclineFriendRequest();
  const sendFriendRequest = useSendFriendRequest();
  const searchUsers = useSearchUsers(query);

  useEffect(() => {
    let active = true;
    if (!query) return;
    setLoading(true);

    if (searchUsers) {
      if (active) setResults(searchUsers);
    }

    if (active) setLoading(false);

    return () => {
      active = false;
    };
  }, [query, userId, searchUsers]);

  function getStatus(user: Doc<'users'>): StatusType {
    if (friends.some(f => f.user_id === user._id || f.friend_username === user.username)) {
      return { type: 'friend' };
    }
    const req = requests.find(
      r =>
        (r.requester_id === userId && r.recipient_id === user._id) ||
        (r.requester_id === user._id && r.recipient_id === userId),
    );
    if (req) {
      if (req.requester_id === userId) return { type: 'pending_sent', requestId: req._id };
      if (req.recipient_id === userId) return { type: 'pending_received', requestId: req._id };
    }
    return { type: 'none' };
  }

  const handleSend = async (user: Doc<'users'>) => {
    setActionLoading(user._id);
    try {
      await sendFriendRequest({ requesterId: userId, recipientId: user._id });
      onClear();
    } finally {
      setActionLoading(null);
    }
  };
  const handleWithdraw = async (requestId: Id<'friendRequests'>) => {
    setActionLoading(requestId);
    try {
      await withdrawFriendRequest({ requestId, userId });
      onClear();
    } finally {
      setActionLoading(null);
    }
  };
  const handleAccept = async (requestId: Id<'friendRequests'>) => {
    setActionLoading(requestId);
    try {
      await acceptFriendRequest({ requestId, userId });
      onClear();
    } finally {
      setActionLoading(null);
    }
  };
  const handleReject = async (requestId: Id<'friendRequests'>) => {
    setActionLoading(requestId);
    try {
      await declineFriendRequest({ requestId, userId });
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
          keyExtractor={item => item._id}
          renderItem={({ item }) => {
            const status = getStatus(item);
            if (status.type === 'friend') {
              return (
                <FriendItem
                  username={item.username || 'Unknown User'}
                  onPress={() => router.push(`/friends/${item.username}`)}
                />
              );
            } else if (status.type === 'pending_sent' || status.type === 'pending_received') {
              const isSent = status.type === 'pending_sent';
              return (
                <FriendRequestItem
                  username={item.username || 'Unknown User'}
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
                  <Text style={[styles.friendItem, styles.resultUsername]}>
                    {item.username || 'Unknown User'}
                  </Text>
                  <Button
                    title="Add Friend"
                    onPress={() => handleSend(item)}
                    loading={actionLoading === item._id}
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
