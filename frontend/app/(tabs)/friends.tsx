import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, FlatList, SafeAreaView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';

interface SearchResult {
  id: string;
  user_id: string;
  email: string;
  username: string;
}

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

type Tab = 'search' | 'requests';

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Record<string, boolean>>({});
  const [requestStatuses, setRequestStatuses] = useState<Record<string, 'sent' | 'error' | null>>({});
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Fetch friend requests when on requests tab
  useEffect(() => {
    if (activeTab === 'requests') {
      fetchFriendRequests();
    }
  }, [activeTab]);

  const fetchFriendRequests = async () => {
    try {
      setIsLoadingRequests(true);

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
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchResults([]); // Reset results before new search
      setIsLoading(true);
      setHasSearched(true);
      setLastSearchedQuery(searchQuery);
      const { data, error } = await supabase.functions.invoke('search-users', {
        body: { query: searchQuery }
      });

      if (error) {
        console.error('Supabase Edge Function Error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          name: error.name,
          details: error.details,
          context: error?.context,
        });
        throw error;
      }
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (recipientId: string) => {
    console.log('Sending friend request to:', recipientId);
    // Don't allow sending another request if one is already pending
    if (pendingRequests[recipientId]) return;

    try {
      // Set this user's request to pending
      setPendingRequests(prev => ({ ...prev, [recipientId]: true }));
      
      // Clear any previous error status
      setRequestStatuses(prev => ({ ...prev, [recipientId]: null }));
      
      const { data, error } = await supabase.functions.invoke('send-friend-request', {
        body: { recipient_id: recipientId }
      });

      if (error) {
        console.error('Friend request error:', {
          status: error.status,
          message: error.message,
          details: error.details,
        });
        throw error;
      }

      // Mark request as successfully sent
      setRequestStatuses(prev => ({ ...prev, [recipientId]: 'sent' }));
      
    } catch (error) {
      console.error('Failed to send friend request:', error);
      setRequestStatuses(prev => ({ ...prev, [recipientId]: 'error' }));
    } finally {
      // Clear pending state
      setPendingRequests(prev => ({ ...prev, [recipientId]: false }));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setPendingRequests(prev => ({ ...prev, [requestId]: true }));
      
      const { error } = await supabase.functions.invoke('respond-to-friend-request', {
        body: { request_id: requestId, action: 'accept' }
      });

      if (error) throw error;
      
      // Refresh the requests list after accepting
      fetchFriendRequests();
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
      fetchFriendRequests();
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
      fetchFriendRequests();
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
    } finally {
      setPendingRequests(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const renderUserItem = ({ item }: { item: SearchResult }) => (
    <ThemedView style={styles.userItem}>
      <ThemedText style={styles.username}>{item.username}</ThemedText>
      <ThemedText style={styles.email}>{item.email}</ThemedText>
      
      {requestStatuses[item.user_id] === 'sent' ? (
        <ThemedView style={styles.requestSent}>
          <ThemedText style={styles.requestSentText}>Request Sent</ThemedText>
        </ThemedView>
      ) : (
        <TouchableOpacity 
          style={[styles.addButton, pendingRequests[item.user_id] && styles.addButtonDisabled]}
          onPress={() => sendFriendRequest(item.user_id)}
          disabled={pendingRequests[item.user_id] || requestStatuses[item.user_id] === 'sent'}
        >
          {pendingRequests[item.user_id] ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.addButtonText}>
              {requestStatuses[item.user_id] === 'error' ? 'Retry' : 'Add Friend'}
            </ThemedText>
          )}
        </TouchableOpacity>
      )}
    </ThemedView>
  );

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

  const renderEmptySearchState = () => {
    if (!hasSearched || isLoading) return null; // Don't show if not searched yet or still loading
    
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText style={styles.emptyStateText}>
          No users found matching "{lastSearchedQuery}"
        </ThemedText>
      </ThemedView>
    );
  };

  const renderEmptyRequestsState = () => {
    if (isLoadingRequests) return null; 
    
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText style={styles.emptyStateText}>
          No friend requests
        </ThemedText>
      </ThemedView>
    );
  };

  const renderSearchTab = () => (
    <>
      <ThemedView style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email or username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchUsers}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={searchUsers}
          disabled={isLoading || !searchQuery.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.searchButtonText}>Search</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>

      <FlatList
        data={searchResults}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        style={styles.resultsList}
        contentContainerStyle={[
          styles.resultsContent,
          searchResults.length === 0 && styles.emptyListContent
        ]}
        ListEmptyComponent={renderEmptySearchState}
      />
    </>
  );

  const renderRequestsTab = () => (
    <>
      {isLoadingRequests ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6936D8" />
        </ThemedView>
      ) : (
        <ThemedView style={styles.requestsTabContainer}>
          <ThemedView style={styles.requestSection}>
            <ThemedText style={styles.sectionTitle}>Incoming Requests</ThemedText>
            {incomingRequests.length > 0 ? (
              <FlatList
                data={incomingRequests}
                renderItem={renderIncomingRequestItem}
                keyExtractor={(item) => item.id}
                style={styles.requestsList}
                contentContainerStyle={styles.requestsContent}
              />
            ) : (
              <ThemedView style={styles.emptyStateSmall}>
                <ThemedText style={styles.emptyStateTextSmall}>
                  No incoming requests
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          <ThemedView style={styles.requestSection}>
            <ThemedText style={styles.sectionTitle}>Outgoing Requests</ThemedText>
            {outgoingRequests.length > 0 ? (
              <FlatList
                data={outgoingRequests}
                renderItem={renderOutgoingRequestItem}
                keyExtractor={(item) => item.id}
                style={styles.requestsList}
                contentContainerStyle={styles.requestsContent}
              />
            ) : (
              <ThemedView style={styles.emptyStateSmall}>
                <ThemedText style={styles.emptyStateTextSmall}>
                  No outgoing requests
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Friends</ThemedText>
        
        <ThemedView style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              Search
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Friend Requests
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {activeTab === 'search' ? renderSearchTab() : renderRequestsTab()}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#6936D8',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#6936D8',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    gap: 12,
    paddingTop: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  userItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
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
  addButton: {
    backgroundColor: '#6936D8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonDisabled: {
    backgroundColor: '#9c80d8',
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  requestSent: {
    backgroundColor: '#4db67f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  requestSentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  emptyStateSmall: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateTextSmall: {
    fontSize: 14,
    color: '#666',
  },
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
});
