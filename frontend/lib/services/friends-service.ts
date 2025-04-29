import { supabase } from '../supabase';
import { ApiService } from './api';
import { Friend } from '../context/friends';

interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  requester?: {
    user_id: string;
    email: string;
    username: string;
  };
  recipient?: {
    user_id: string;
    email: string;
    username: string;
  };
}

/**
 * Service for handling friends-related operations
 */
export class FriendsService {
  /**
   * Fetch all confirmed friends for the current user
   */
  static async getFriends(): Promise<Friend[]> {
    return ApiService.authenticatedQuery(async () => {
      const currentUser = await ApiService.getCurrentUser();
      const currentUserId = currentUser.id;
      
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
        
        // Access the first element if the result is an array, or use the object directly
        const friendData = isFriendRequester ? 
          (Array.isArray(request.requester) ? request.requester[0] : request.requester) : 
          (Array.isArray(request.recipient) ? request.recipient[0] : request.recipient);
        
        return {
          id: friendData?.user_id || '',
          user_id: friendData?.user_id || '',
          email: friendData?.email || 'Unknown email',
          username: friendData?.username || 'Unknown User',
          request_id: request.id,
          created_at: request.created_at
        };
      });

      return friendsList;
    });
  }

  /**
   * Fetch pending friend requests for the current user
   */
  static async getPendingRequests(): Promise<FriendRequest[]> {
    return ApiService.authenticatedQuery(async () => {
      const currentUser = await ApiService.getCurrentUser();
      const currentUserId = currentUser.id;
      
      // Fetch incoming pending friend requests
      const { data: pendingRequests, error: requestsError } = await supabase
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
          )
        `)
        .eq('status', 'pending')
        .eq('recipient_id', currentUserId);

      if (requestsError) {
        throw requestsError;
      }

      // Transform and type-cast the result to ensure it matches FriendRequest[]
      const typedRequests: FriendRequest[] = (pendingRequests || []).map(request => {
        // Access the first element if the result is an array, or use the object directly
        const requesterData = Array.isArray(request.requester) ? request.requester[0] : request.requester;
        
        return {
          id: request.id,
          created_at: request.created_at,
          requester_id: request.requester_id,
          recipient_id: request.recipient_id,
          status: request.status,
          requester: {
            user_id: requesterData?.user_id || '',
            email: requesterData?.email || '',
            username: requesterData?.username || ''
          }
        };
      });

      return typedRequests;
    });
  }

  /**
   * Send a friend request to a user by username
   */
  static async sendFriendRequest(usernameOrUserId: string): Promise<void> {
    return ApiService.authenticatedQuery(async () => {
      const currentUser = await ApiService.getCurrentUser();
      const currentUserId = currentUser.id;
      
      let recipientId: string;
      
      // Check if the input is a username or a user id
      if (!usernameOrUserId.match(/^[0-9a-fA-F-]+$/)) {
        // Find the user by username
        const { data: userProfiles, error: userError } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('username', usernameOrUserId)
          .single();

        if (userError || !userProfiles) {
          throw new Error('User not found');
        }
        
        recipientId = userProfiles.user_id;
      } else {
        // Use the provided user ID directly
        recipientId = usernameOrUserId;
      }

      // Check if a friend request already exists
      const { data: existingRequests, error: checkError } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(requester_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${currentUserId})`);

      if (checkError) {
        throw checkError;
      }

      if (existingRequests && existingRequests.length > 0) {
        const request = existingRequests[0];
        if (request.status === 'confirmed') {
          throw new Error('Already friends with this user');
        } else if (request.status === 'pending') {
          throw new Error('Friend request already sent or received');
        }
      }

      // Send the friend request
      const { error: requestError } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: currentUserId,
          recipient_id: recipientId,
          status: 'pending'
        });

      if (requestError) {
        throw requestError;
      }
    });
  }

  /**
   * Search for users by username
   */
  static async searchUsers(query: string): Promise<any[]> {
    return ApiService.authenticatedQuery(async () => {
      const { data, error } = await supabase.functions.invoke('search-users', {
        body: { query }
      });
      
      if (error) throw error;
      return data.users || [];
    });
  }

  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(requestId: string): Promise<void> {
    return ApiService.authenticatedQuery(async () => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'confirmed' })
        .eq('id', requestId);

      if (error) {
        throw error;
      }
    });
  }

  /**
   * Reject a friend request
   */
  static async rejectFriendRequest(requestId: string): Promise<void> {
    return ApiService.authenticatedQuery(async () => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        throw error;
      }
    });
  }

  /**
   * Remove a friend (delete the friend request)
   */
  static async removeFriend(requestId: string): Promise<void> {
    return ApiService.authenticatedQuery(async () => {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        throw error;
      }
    });
  }

  /**
   * Subscribe to changes in friend requests for the current user
   */
  static async subscribeToFriendRequestChanges(callback: (payload: any) => void) {
    const currentUser = await ApiService.getCurrentUser();
    const currentUserId = currentUser.id;
      
    // Subscribe to requester side changes
    const unsubRequester = ApiService.subscribeToChanges(
      'friend_requests',
      '*',
      `requester_id=eq.${currentUserId}`,
      callback
    );

    // Subscribe to recipient side changes
    const unsubRecipient = ApiService.subscribeToChanges(
      'friend_requests',
      '*',
      `recipient_id=eq.${currentUserId}`,
      callback
    );

    // Return combined unsubscribe function
    return () => {
      unsubRequester();
      unsubRecipient();
    };
  }

  /**
   * Fetch tasks for a friend directly from the database
   * Gets only tasks due today for the specified friend
   */
  static async getFriendTasks(username: string): Promise<any[]> {
    return ApiService.authenticatedQuery(async () => {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Single query that joins user_profiles with tasks
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          tasks:tasks(*)
        `)
        .eq('username', username)
        .eq('tasks.due_date', todayStr)
        .single();
      
      if (error) {
        console.error('Error fetching friend tasks:', error);
        throw new Error('Failed to fetch tasks');
      }
      
      // Return the tasks array from the nested structure
      return data?.tasks || [];
    });
  }
}