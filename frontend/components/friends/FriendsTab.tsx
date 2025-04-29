import { useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFocusEffect, useRouter } from 'expo-router';
import { Friend, useFriends } from '@/lib/context/friends';

// Store task counts for each friend
interface FriendTaskCounts {
  [username: string]: {
    completedTasks: number;
    totalTasks: number;
  };
}

export default function FriendsTab() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const secondaryTextColor = useThemeColor({}, 'secondaryText');
  const { friends, isLoading, fetchFriends, isRefreshing, getFriendTasks } = useFriends();
  const router = useRouter();

  // State to store the task counts for each friend
  const [taskCounts, setTaskCounts] = useState<FriendTaskCounts>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // Fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchFriends();
      // No cleanup needed as the friends context manages data persistence
    }, [fetchFriends]),
  );

  // Fetch task counts for all friends
  useEffect(() => {
    const fetchTaskCounts = async () => {
      if (friends.length === 0) return;

      setIsLoadingCounts(true);
      const counts: FriendTaskCounts = {};

      try {
        // Fetch tasks for each friend in parallel
        await Promise.all(
          friends.map(async friend => {
            const tasks = await getFriendTasks(friend.username);
            const completedTasks = tasks.filter(task => task.is_done).length;
            const totalTasks = tasks.length;

            counts[friend.username] = {
              completedTasks,
              totalTasks,
            };
          }),
        );

        setTaskCounts(counts);
      } catch (error) {
        console.error('Error fetching task counts:', error);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    fetchTaskCounts();
  }, [friends, getFriendTasks]);

  const onRefresh = useCallback(() => {
    fetchFriends(true); // Force refresh
    // Reset task counts - they will be refetched due to friends dependency in the effect
    setTaskCounts({});
  }, [fetchFriends]);

  const handleFriendPress = (friend: Friend) => {
    router.push({
      pathname: '/(home)/friends/[username]',
      params: {
        username: friend.username,
      },
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

  const emptyStateTextStyle = {
    ...styles.emptyStateText,
    color: secondaryTextColor,
  };

  const taskCountStyle = {
    ...styles.taskCount,
    color: secondaryTextColor,
  };

  return (
    <>
      <FlatList
        data={friends}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleFriendPress(item)}>
            <ThemedView style={friendItemStyle}>
              <ThemedView style={styles.friendInfo}>
                <ThemedText style={styles.username}>{item.username}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.taskCountContainer}>
                {isLoadingCounts ? (
                  <ActivityIndicator size="small" color={tintColor} />
                ) : taskCounts[item.username] ? (
                  <ThemedText style={taskCountStyle}>
                    <Text>{taskCounts[item.username].completedTasks}</Text>
                    <Text> / </Text>
                    <Text>{taskCounts[item.username].totalTasks}</Text>
                  </ThemedText>
                ) : (
                  <ThemedText style={taskCountStyle}>
                    <Text>0 / 0</Text>
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        style={styles.friendsList}
        contentContainerStyle={[
          styles.friendsContent,
          friends.length === 0 && styles.emptyListContent,
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
              <Text>You don&apos;t have any friends yet</Text>
            </ThemedText>
          </ThemedView>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyListContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendItem: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  friendsContent: {
    gap: 12,
    paddingTop: 8,
  },
  friendsList: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  taskCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskCountContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
});
