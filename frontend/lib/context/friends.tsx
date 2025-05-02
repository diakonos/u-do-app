import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { FriendsService } from '../services/friends-service';
import { PersistentCache } from '../persistentCache';

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

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPendingRequestsRefreshing, setIsPendingRequestsRefreshing] = useState(false);
  const [hasLoadedFriends, setHasLoadedFriends] = useState(false);
  const [hasLoadedPendingRequests, setHasLoadedPendingRequests] = useState(false);

  const FRIENDS_CACHE_KEY = 'friends-cache';
  const FRIENDS_REVALIDATE_MS = 60 * 1000;
  const PENDING_REQUESTS_CACHE_KEY = 'pending-requests-cache';
  const PENDING_REQUESTS_REVALIDATE_MS = 60 * 1000;

  // Load friends from persistent cache on mount
  useEffect(() => {
    (async () => {
      const cached = await PersistentCache.get(FRIENDS_CACHE_KEY);
      if (cached && cached.value) {
        setFriends(cached.value);
        setHasLoadedFriends(true);
      }
      const cachedPending = await PersistentCache.get(PENDING_REQUESTS_CACHE_KEY);
      if (cachedPending && cachedPending.value) {
        setPendingRequests(cachedPending.value);
        setHasLoadedPendingRequests(true);
      }
    })();
  }, []);

  // Fetch friends data with persistent cache and revalidation
  const fetchFriends = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();
      const cached = await PersistentCache.get(FRIENDS_CACHE_KEY);
      if (
        !forceRefresh &&
        cached &&
        cached.value &&
        cached.updatedAt &&
        now - cached.updatedAt < FRIENDS_REVALIDATE_MS
      ) {
        setFriends(cached.value);
        setHasLoadedFriends(true);
        return;
      }
      try {
        setIsLoading(true);
        const friendsList = await FriendsService.getFriends();
        setFriends(friendsList);
        setHasLoadedFriends(true);
        PersistentCache.set(FRIENDS_CACHE_KEY, friendsList);
      } catch (error) {
        console.error('Failed to fetch friends:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedFriends],
  );

  // Fetch pending friend requests with persistent cache and revalidation
  const fetchPendingRequests = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();
      const cached = await PersistentCache.get(PENDING_REQUESTS_CACHE_KEY);
      if (
        !forceRefresh &&
        cached &&
        cached.value &&
        cached.updatedAt &&
        now - cached.updatedAt < PENDING_REQUESTS_REVALIDATE_MS
      ) {
        setPendingRequests(cached.value);
        setHasLoadedPendingRequests(true);
        return;
      }
      try {
        if (forceRefresh) {
          setIsPendingRequestsRefreshing(true);
        } else if (!hasLoadedPendingRequests) {
          setIsLoading(true);
        }
        const pendingRequests = await FriendsService.getPendingRequests();
        setPendingRequests(pendingRequests);
        setHasLoadedPendingRequests(true);
        PersistentCache.set(PENDING_REQUESTS_CACHE_KEY, pendingRequests);
      } catch (error) {
        console.error('Failed to fetch friend requests:', error);
      } finally {
        setIsLoading(false);
        setIsPendingRequestsRefreshing(false);
      }
    },
    [hasLoadedPendingRequests],
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
      setPendingRequests(prev => {
        const updatedRequests = prev.filter(request => request.id !== requestId);
        PersistentCache.set(PENDING_REQUESTS_CACHE_KEY, updatedRequests);
        return updatedRequests;
      });

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
      setPendingRequests(prev => {
        const updatedRequests = prev.filter(request => request.id !== requestId);
        PersistentCache.set(PENDING_REQUESTS_CACHE_KEY, updatedRequests);
        return updatedRequests;
      });
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
      setFriends(prev => {
        const updatedFriends = prev.filter(friend => friend.request_id !== requestId);
        PersistentCache.set(FRIENDS_CACHE_KEY, updatedFriends);
        return updatedFriends;
      });
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

  // Get a friend's tasks with persistent cache and revalidation
  const getFriendTasksWithCache = useCallback(
    async (username: string, forceRefresh = false): Promise<FriendTask[]> => {
      const CACHE_KEY = `friend-tasks-cache-${username}`;
      const REVALIDATE_MS = 60 * 1000;
      const now = Date.now();
      const cached = await PersistentCache.get(CACHE_KEY);
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
        const tasks = await FriendsService.getFriendTasks(username);
        PersistentCache.set(CACHE_KEY, tasks);
        return tasks;
      } catch (error) {
        if (cached && cached.value) return cached.value;
        throw error;
      }
    },
    [],
  );

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
