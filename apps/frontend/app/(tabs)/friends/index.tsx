import React, { Suspense } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import { useCurrentUserId } from '@/lib/auth';
import useSWR from 'swr';
import { getFriendsForUser, listFriendRequests } from '@/db/friends';
import { useRouter } from 'expo-router';

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

  return (
    <View style={styles.container}>
      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} weight="medium">
            Pending Requests
          </Text>
          {requests.map(req => (
            <Text key={req.id} style={styles.requestItem}>
              {req.requester_id === userId
                ? `To: ${req.recipient_username}`
                : `From: ${req.requester_username}`}
            </Text>
          ))}
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
              <Text
                style={styles.friendItem}
                onPress={() => router.push(`/friends/${item.friend_username}`)}
              >
                {item.friend_username}
              </Text>
            )}
          />
        )}
      </View>
    </View>
  );
}

export default function FriendsScreen() {
  return (
    <Screen>
      <ScreenTitle>Friends</ScreenTitle>
      <Suspense fallback={<Text>Loading...</Text>}>
        <FriendsList />
      </Suspense>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: baseTheme.margin[3], width: '100%' },
  friendItem: { paddingVertical: baseTheme.margin[2] },
  requestItem: { marginBottom: baseTheme.margin[1], color: '#888' },
  section: { marginBottom: baseTheme.margin[3] },
  sectionTitle: { marginBottom: baseTheme.margin[2] },
});
