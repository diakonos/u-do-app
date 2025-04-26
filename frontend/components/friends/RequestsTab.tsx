import { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFocusEffect } from 'expo-router';

interface FriendRequest {
  id: string;
  created_at: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export default function RequestsTab() {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Record<string, boolean>>({});
  const textColor = useThemeColor({}, 'text');
  
  // Use a ref to track if data has been loaded
  const hasLoadedData = useRef(false);

  const fetchFriendRequests = useCallback(async (forceRefresh = false) => {
    // Skip fetching if data is already loaded and not forcing refresh
    if (hasLoadedData.current && !forceRefresh) {
      return;
    }
    
    try {
      setIsLoading(true);

      // First get the current user ID
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;
      
      if (!currentUserId) {
        console.error('No authenticated user found');
        return;
      }

      // Fetch both incoming and outgoing requests in a single query
      const { data: requestsData, error: requestsError } = await supabase
        .from('friend_requests')
        .select(`
          id, 
          created_at, 
          requester_id, 
          recipient_id, 
          status,
          requester:user_profiles!requester_id(
            user_id,
            email,
            username
          ),
          recipient:user_profiles!recipient_id(
            user_id,
            email,
            username
          )
        `)
        .eq('status', 'pending')
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

      if (requestsError) {
        console.error('Error fetching friend requests:', requestsError);
        throw requestsError;
      }

      // Separate into incoming and outgoing requests
      const incoming = (requestsData || [])
        .filter(request => request.recipient_id === currentUserId)
        .map(request => ({
          id: request.id,
          created_at: request.created_at,
          requester_id: request.requester_id,
          recipient_id: request.recipient_id,
          status: request.status,
          user: {
            id: request.requester_id,
            email: request.requester?.email || 'Unknown email',
            username: request.requester?.username || 'Unknown User'
          }
        }));

      const outgoing = (requestsData || [])
        .filter(request => request.requester_id === currentUserId)
        .map(request => ({
          id: request.id,
          created_at: request.created_at,
          requester_id: request.requester_id,
          recipient_id: request.recipient_id,
          status: request.status,
          user: {
            id: request.recipient_id,
            email: request.recipient?.email || 'Unknown email',
            username: request.recipient?.username || 'Unknown User'
          }
        }));

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      
      // Mark data as loaded
      hasLoadedData.current = true;
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Use useFocusEffect instead of useEffect to control when data is fetched
  useFocusEffect(
    useCallback(() => {
      // Only fetch if we haven't loaded data yet
      if (!hasLoadedData.current) {
        fetchFriendRequests();
      }
      
      // Cleanup function (optional)
      return () => {
        // Any cleanup code if needed
      };
    }, [fetchFriendRequests])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFriendRequests(true); // Force refresh
  }, [fetchFriendRequests]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setPendingRequests(prev => ({ ...prev, [requestId]: true }));
      
      const { error } = await supabase.functions.invoke('respond-to-friend-request', {
        body: { request_id: requestId, action: 'accept' }
      });

      if (error) throw error;
      
      // Refresh the requests list after accepting
      fetchFriendRequests(true); // Force refresh
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    } finally {
      setPendingRequests(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setPendingRequests(prev => ({ ...prev, [requestId]: true }));
      
      const { error } = await supabase.functions.invoke('respond-friend-request', {
        body: { request_id: requestId, action: 'reject' }
      });

      if (error) throw error;
      
      // Refresh the requests list after rejecting
      fetchFriendRequests(true); // Force refresh
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    } finally {
      setPendingRequests(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setPendingRequests(prev => ({ ...prev, [requestId]: true }));
      
      const { error } = await supabase.functions.invoke('cancel-friend-request', {
        body: { request_id: requestId }
      });

      if (error) throw error;
      
      // Refresh the requests list after cancelling
      fetchFriendRequests(true); // Force refresh
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
    } finally {
      setPendingRequests(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const renderIncomingRequestItem = ({ item }: { item: FriendRequest }) => (
    <ThemedView style={styles.requestItem}>
      <ThemedView style={styles.requestInfo}>
        <ThemedText style={styles.username}>{item.user.username}</ThemedText>
        <ThemedText style={styles.email}>{item.user.email}</ThemedText>
        <ThemedText style={styles.requestDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.requestActions}>
        <TouchableOpacity 
          style={[styles.acceptButton, pendingRequests[item.id] && styles.buttonDisabled]}
          onPress={() => handleAcceptRequest(item.id)}
          disabled={pendingRequests[item.id]}
        >
          {pendingRequests[item.id] ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.actionButtonText}>Accept</ThemedText>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.rejectButton, pendingRequests[item.id] && styles.buttonDisabled]}
          onPress={() => handleRejectRequest(item.id)}
          disabled={pendingRequests[item.id]}
        >
          <ThemedText style={styles.actionButtonText}>Reject</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  const renderOutgoingRequestItem = ({ item }: { item: FriendRequest }) => (
    <ThemedView style={styles.requestItem}>
      <ThemedView style={styles.requestInfo}>
        <ThemedText style={styles.username}>{item.user.username}</ThemedText>
        <ThemedText style={styles.email}>{item.user.email}</ThemedText>
        <ThemedText style={styles.requestDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </ThemedView>
      <TouchableOpacity 
        style={[styles.cancelButton, pendingRequests[item.id] && styles.buttonDisabled]}
        onPress={() => handleCancelRequest(item.id)}
        disabled={pendingRequests[item.id]}
      >
        {pendingRequests[item.id] ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText style={styles.actionButtonText}>Cancel</ThemedText>
        )}
      </TouchableOpacity>
    </ThemedView>
  );

  const renderEmptyRequestsState = () => (
    <ThemedView style={styles.emptyStateSmall}>
      <ThemedText style={styles.emptyStateTextSmall}>
        No requests
      </ThemedText>
    </ThemedView>
  );

  if (isLoading && !refreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6936D8" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.requestsTabContainer}>
      <ThemedView style={styles.requestSection}>
        <ThemedText style={styles.sectionTitle}>Incoming Requests</ThemedText>
        <FlatList
          data={incomingRequests}
          renderItem={renderIncomingRequestItem}
          keyExtractor={(item) => item.id}
          style={styles.requestsList}
          contentContainerStyle={[
            styles.requestsContent,
            incomingRequests.length === 0 && styles.emptyListContent
          ]}
          ListEmptyComponent={renderEmptyRequestsState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6936D8']}
              tintColor={textColor}
            />
          }
        />
      </ThemedView>

      <ThemedView style={styles.requestSection}>
        <ThemedText style={styles.sectionTitle}>Outgoing Requests</ThemedText>
        <FlatList
          data={outgoingRequests}
          renderItem={renderOutgoingRequestItem}
          keyExtractor={(item) => item.id}
          style={styles.requestsList}
          contentContainerStyle={[
            styles.requestsContent, 
            outgoingRequests.length === 0 && styles.emptyListContent
          ]}
          ListEmptyComponent={renderEmptyRequestsState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6936D8']}
              tintColor={textColor}
            />
          }
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  requestsTabContainer: {
    flex: 1,
    gap: 24,
  },
  requestSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  requestsList: {
    flex: 1,
  },
  requestsContent: {
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
  },
  requestItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4db67f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  emptyStateSmall: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateTextSmall: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});