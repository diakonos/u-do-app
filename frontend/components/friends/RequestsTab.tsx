import { useCallback } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl, Text } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { useFocusEffect } from 'expo-router';
import { useFriends } from '@/lib/context/friends';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';

export default function RequestsTab() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const secondaryTextColor = useThemeColor({}, 'secondaryText');
  const dangerColor = useThemeColor({}, 'danger');
  const {
    pendingRequests,
    fetchPendingRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    isLoading,
    isPendingRequestsRefreshing,
  } = useFriends();

  // Fetch pending requests when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
    }, [fetchPendingRequests]),
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
            <ThemedText style={styles.username}>
              {item.requester?.username || 'Unknown User'}
            </ThemedText>
            <ThemedText style={emailStyle}>{item.requester?.email || 'Unknown email'}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.actionsContainer}>
            <ThemedView style={actionButtonStyle}>
              <ThemedText style={styles.actionText} onPress={() => handleAccept(item.id)}>
                <Text>Accept</Text>
              </ThemedText>
            </ThemedView>
            <ThemedView style={rejectButtonStyle}>
              <ThemedText style={rejectTextStyle} onPress={() => handleReject(item.id)}>
                <Text>Reject</Text>
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      )}
      keyExtractor={item => item.id}
      style={styles.requestsList}
      contentContainerStyle={[
        styles.requestsContent,
        pendingRequests.length === 0 && styles.emptyListContent,
      ]}
      ListEmptyComponent={
        <ThemedView style={styles.emptyState}>
          <ThemedText style={emptyStateTextStyle}>
            <Text>You don&apos;t have any pending friend requests</Text>
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
  actionButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionText: {
    color: Colors.light.white,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  email: {
    fontSize: 14,
  },
  emptyListContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  requestInfo: {
    marginBottom: 12,
  },
  requestItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  requestsContent: {
    gap: 12,
    padding: 16,
  },
  requestsList: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
});
