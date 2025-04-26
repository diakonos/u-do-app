import { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFocusEffect } from 'expo-router';

interface Friend {
  id: string;
  user_id: string;
  email: string;
  username: string;
  request_id: string;
  created_at: string;
}

export default function FriendsTab() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const textColor = useThemeColor({}, 'text');
  
  // Use a ref to track if data has been loaded
  const hasLoadedData = useRef(false);

  // Fetch friends data
  const fetchFriends = useCallback(async (forceRefresh = false) => {
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

      // Fetch both incoming and outgoing accepted friend requests
      const { data: acceptedRequests, error: requestsError } = await supabase
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
        .eq('status', 'confirmed')
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

      if (requestsError) {
        console.error('Error fetching friends:', requestsError);
        throw requestsError;
      }

      // Transform the data to get the friend details
      const friendsList = (acceptedRequests || []).map(request => {
        // If current user is the requester, the friend is the recipient
        // Otherwise, the friend is the requester
        const isFriendRequester = request.requester_id !== currentUserId;
        const friendProfile = isFriendRequester ? request.requester : request.recipient;
        
        return {
          id: friendProfile?.user_id || '',
          user_id: friendProfile?.user_id || '',
          email: friendProfile?.email || 'Unknown email',
          username: friendProfile?.username || 'Unknown User',
          request_id: request.id,
          created_at: request.created_at
        };
      });

      setFriends(friendsList);
      // Mark data as loaded
      hasLoadedData.current = true;
    } catch (error) {
      console.error('Failed to fetch friends:', error);
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
        fetchFriends();
      }
      
      // Cleanup function (optional)
      return () => {
        // Any cleanup code if needed
      };
    }, [fetchFriends])
  );

  useEffect(() => {
    console.log("ON MOUNT");

    return function cleanup() {
      console.log("ON UNMOUNT");
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFriends(true); // Force refresh
  }, [fetchFriends]);

  if (isLoading && !refreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6936D8" />
      </ThemedView>
    );
  }

  return (
    <FlatList
      data={friends}
      renderItem={({ item }) => (
        <ThemedView style={styles.friendItem}>
          <ThemedView style={styles.friendInfo}>
            <ThemedText style={styles.username}>{item.username}</ThemedText>
            <ThemedText style={styles.email}>{item.email}</ThemedText>
            <ThemedText style={styles.friendSince}>
              Friends since {new Date(item.created_at).toLocaleDateString()}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}
      keyExtractor={(item) => item.id}
      style={styles.friendsList}
      contentContainerStyle={[
        styles.friendsContent,
        friends.length === 0 && styles.emptyListContent
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#6936D8']}
          tintColor={textColor}
        />
      }
      ListEmptyComponent={
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>
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
    borderColor: '#eee',
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
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  friendSince: {
    fontSize: 12,
    color: '#999',
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
    color: '#666',
    textAlign: 'center',
  },
});