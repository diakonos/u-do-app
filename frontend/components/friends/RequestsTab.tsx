import { useCallback } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFocusEffect } from 'expo-router';
import { useFriends } from '@/lib/context/friends';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function RequestsTab() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const secondaryTextColor = useThemeColor({}, 'secondaryText');
  const dangerColor = useThemeColor({}, 'danger');
  const { pendingRequests, fetchPendingRequests, acceptFriendRequest, rejectFriendRequest, isLoading, isPendingRequestsRefreshing } = useFriends();

  // Fetch pending requests when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
    }, [fetchPendingRequests])
  );

  const onRefresh = useCallback(() => {
    fetchPendingRequests(true); // Force refresh
  }, [fetchPendingRequests]);

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
      console.error(error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (error) {
      Alert.alert('Error', 'Failed to reject friend request');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
      </ThemedView>
    );
  }

  const requestItemStyle = {
    ...styles.requestItem,
    borderColor: borderColor,
  };

  const emailStyle = {
    ...styles.email,
    color: secondaryTextColor,
  };

  const actionButtonStyle = {
    ...styles.actionButton,
    backgroundColor: tintColor,
  };

  const rejectButtonStyle = {
    ...styles.actionButton,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: dangerColor,
  };

  const rejectTextStyle = {
    ...styles.actionText,
    color: dangerColor,
  };

  const emptyStateTextStyle = {
    ...styles.emptyStateText,
    color: secondaryTextColor,
  };

  return (
    <FlatList
      data={pendingRequests}
      renderItem={({ item }) => (
        <ThemedView style={requestItemStyle}>
          <ThemedView style={styles.requestInfo}>
            <ThemedText style={styles.username}>{item.requester?.username || 'Unknown User'}</ThemedText>
            <ThemedText style={emailStyle}>{item.requester?.email || 'Unknown email'}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.actionsContainer}>
            <ThemedView style={actionButtonStyle}>
              <ThemedText style={styles.actionText} onPress={() => handleAccept(item.id)}>Accept</ThemedText>
            </ThemedView>
            <ThemedView style={rejectButtonStyle}>
              <ThemedText style={rejectTextStyle} onPress={() => handleReject(item.id)}>Reject</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      )}
      keyExtractor={(item) => item.id}
      style={styles.requestsList}
      contentContainerStyle={[
        styles.requestsContent,
        pendingRequests.length === 0 && styles.emptyListContent
      ]}
      ListEmptyComponent={
        <ThemedView style={styles.emptyState}>
          <ThemedText style={emptyStateTextStyle}>
            You don't have any pending friend requests
          </ThemedText>
        </ThemedView>
      }
      refreshControl={
        <RefreshControl
          refreshing={isPendingRequestsRefreshing}
          onRefresh={onRefresh}
          colors={[tintColor]}
          tintColor={textColor}
        />
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
  requestsList: {
    flex: 1,
  },
  requestsContent: {
    gap: 12,
    padding: 16,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  requestInfo: {
    marginBottom: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    color: 'white',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});