import { useCallback } from 'react';
import { StyleSheet, ActivityIndicator, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFocusEffect, useRouter } from 'expo-router';
import { Friend, useFriends } from '@/lib/context/friends';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function FriendsTab() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const secondaryTextColor = useThemeColor({}, 'secondaryText');
  const colorScheme = useColorScheme();
  const { friends, isLoading, fetchFriends, isRefreshing } = useFriends();
  const router = useRouter();

  // Fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchFriends();
      // No cleanup needed as the friends context manages data persistence
    }, [fetchFriends])
  );

  const onRefresh = useCallback(() => {
    fetchFriends(true); // Force refresh
  }, [fetchFriends]);

  const handleFriendPress = (friend: Friend) => {
    router.push({
      pathname: "/(home)/friends/[username]",
      params: {
        username: friend.username
      }
    });
  };

  if (isLoading && !isRefreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
      </ThemedView>
    );
  }

  const friendItemStyle = {
    ...styles.friendItem,
    borderColor: borderColor,
  };

  const friendSinceStyle = {
    ...styles.friendSince,
    color: secondaryTextColor,
  };

  const emptyStateTextStyle = {
    ...styles.emptyStateText,
    color: secondaryTextColor,
  };

  return (
    <FlatList
      data={friends}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleFriendPress(item)}>
          <ThemedView style={friendItemStyle}>
            <ThemedView style={styles.friendInfo}>
              <ThemedText style={styles.username}>{item.username}</ThemedText>
              <ThemedText style={friendSinceStyle}>
                Friends since {new Date(item.created_at).toLocaleDateString()}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id}
      style={styles.friendsList}
      contentContainerStyle={[
        styles.friendsContent,
        friends.length === 0 && styles.emptyListContent
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[tintColor]}
          tintColor={textColor}
        />
      }
      ListEmptyComponent={
        <ThemedView style={styles.emptyState}>
          <ThemedText style={emptyStateTextStyle}>
            You don't have any friends yet
          </ThemedText>
        </ThemedView>
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  friendsList: {
    flex: 1,
  },
  friendsContent: {
    gap: 12,
    paddingTop: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  friendItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  friendSince: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});