import { createContext, useContext, useState, useCallback } from 'react';
import { FriendsService } from '../services/friends-service';
import useCache from '@/hooks/useCache';
import { PersistentCache } from '@/lib/persistentCache';

// Types for friends data management
export interface Friend {
  id: string;
  user_id: string;
  email: string;
  username: string;
  request_id: string;
  created_at: string;
}

export interface UserSearchResult {
  id: string;
  user_id: string;
  email: string;
  username: string;
}

export interface FriendTask {
  id: number;
  task_name: string;
  due_date: string;
  is_done: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

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

type FriendsContextType = {
  friends: Friend[];
  isLoading: boolean;
  isRefreshing: boolean;
  fetchFriends: (forceRefresh?: boolean) => Promise<void>;
  sendFriendRequest: (emailOrUserId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (requestId: string) => Promise<void>;
  pendingRequests: FriendRequest[];
  fetchPendingRequests: (forceRefresh?: boolean) => Promise<void>;
  isPendingRequestsRefreshing: boolean;
  searchUsers: (query: string) => Promise<UserSearchResult[]>;
  getFriendTasks: (friendId: string) => Promise<FriendTask[]>;
};

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

const FRIENDS_CACHE_KEY = 'friends-cache';
const FRIENDS_REVALIDATE_MS = 60 * 1000;
const PENDING_REQUESTS_CACHE_KEY = 'pending-requests-cache';
const PENDING_REQUESTS_REVALIDATE_MS = 60 * 1000;

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const [friends, setFriends, friendsUpdatedAt] = useCache<Friend[]>(FRIENDS_CACHE_KEY, []);
  const [pendingRequests, setPendingRequests, pendingRequestsUpdatedAt] = useCache<FriendRequest[]>(
    PENDING_REQUESTS_CACHE_KEY,
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPendingRequestsRefreshing, setIsPendingRequestsRefreshing] = useState(false);

  // Fetch friends data with persistent cache and revalidation
  const fetchFriends = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();
      if (
        !forceRefresh &&
        friends &&
        friends.length > 0 &&
        friendsUpdatedAt &&
        now - friendsUpdatedAt < FRIENDS_REVALIDATE_MS
      ) {
        return;
      }
      try {
        setIsLoading(true);
        const friendsList = await FriendsService.getFriends();
        setFriends(friendsList);
      } catch (error) {
        console.error('Failed to fetch friends:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [friends, friendsUpdatedAt, setFriends],
  );

  // Fetch pending friend requests with persistent cache and revalidation
  const fetchPendingRequests = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();
      if (
        !forceRefresh &&
        pendingRequestsUpdatedAt &&
        now - pendingRequestsUpdatedAt < PENDING_REQUESTS_REVALIDATE_MS
      ) {
        return;
      }
      try {
        setIsPendingRequestsRefreshing(true);
        const pending = await FriendsService.getPendingRequests();
        setPendingRequests(pending);
      } catch (error) {
        console.error('Failed to fetch friend requests:', error);
      } finally {
        setIsLoading(false);
        setIsPendingRequestsRefreshing(false);
      }
    },
    [setPendingRequests, pendingRequestsUpdatedAt], // Only stable setters
  );

  // Send a friend request
  const sendFriendRequest = async (emailOrUserId: string) => {
    try {
      await FriendsService.sendFriendRequest(emailOrUserId);
      // After sending, refresh both friends and pending requests from API and update cache
      await Promise.all([fetchFriends(true), fetchPendingRequests(true)]);
    } catch (error: unknown) {
      console.error('Failed to send friend request:', error);
      const apiError = error as { message?: string };
      throw new Error(apiError.message || 'Failed to send friend request');
    }
  };

  // Accept a friend request
  const acceptFriendRequest = async (requestId: string) => {
    try {
      await FriendsService.acceptFriendRequest(requestId);
      // Update the local state optimistically
      setPendingRequests(prev => prev.filter(request => request.id !== requestId));
      // Refresh friends list to include the new friend
      fetchFriends(true);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      throw error;
    }
  };

  // Reject a friend request
  const rejectFriendRequest = async (requestId: string) => {
    try {
      await FriendsService.rejectFriendRequest(requestId);
      // Update the local state optimistically
      setPendingRequests(prev => prev.filter(request => request.id !== requestId));
    } catch (error) {
      console.error('Failed to reject friend request:', error);
      throw error;
    }
  };

  // Remove a friend
  const removeFriend = async (requestId: string) => {
    try {
      await FriendsService.removeFriend(requestId);
      // Update the local state optimistically
      setFriends(prev => prev.filter(friend => friend.request_id !== requestId));
    } catch (error) {
      console.error('Failed to remove friend:', error);
      throw error;
    }
  };

  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    try {
      return await FriendsService.searchUsers(query);
    } catch (error) {
      console.error('Failed to search users:', error);
      throw error;
    }
  }, []);

  // Get a friend's tasks with persistent cache and revalidation using useCache
  const getFriendTasksWithCache = async (
    username: string,
    forceRefresh = false,
  ): Promise<FriendTask[]> => {
    const CACHE_KEY = `friend-tasks-cache-${username}`;
    const REVALIDATE_MS = 60 * 1000;
    // Use a fallback cache for SSR/initial call, but recommend using useCache in components
    let cached: { value: FriendTask[]; updatedAt: number } | null = null;
    try {
      cached = await PersistentCache.get(CACHE_KEY);
    } catch {}
    const now = Date.now();
    if (
      !forceRefresh &&
      cached &&
      cached.value &&
      cached.updatedAt &&
      now - cached.updatedAt < REVALIDATE_MS
    ) {
      return cached.value;
    }
    try {
      const freshTasks = await FriendsService.getFriendTasks(username);
      await PersistentCache.set(CACHE_KEY, freshTasks);
      return freshTasks;
    } catch (error) {
      if (cached && cached.value) return cached.value;
      throw error;
    }
  };

  return (
    <FriendsContext.Provider
      value={{
        friends,
        isLoading,
        isRefreshing,
        fetchFriends,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
        pendingRequests,
        fetchPendingRequests,
        isPendingRequestsRefreshing,
        searchUsers,
        getFriendTasks: getFriendTasksWithCache,
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
}

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
};
