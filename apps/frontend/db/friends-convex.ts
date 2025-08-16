import { useQuery, useMutation } from 'convex/react';
import { api } from '../../backend/convex/_generated/api';
import { Id } from '../../backend/convex/_generated/dataModel';
import { useCurrentUserId } from '@/lib/auth-client';

// Hook to get friends for a user
export function useFriendsForUser(userId: Id<'users'>) {
  return useQuery(api.friends.getFriendsForUser, { userId });
}

// Hook to list friend requests
export function useFriendRequests() {
  const userId = useCurrentUserId();
  return useQuery(api.friends.listFriendRequests, userId ? {} : 'skip');
}

// Hook to search users by username
export function useSearchUsers(query: string) {
  const userId = useCurrentUserId();
  return useQuery(api.friends.searchUsersByUsername, userId ? { query } : 'skip');
}

// Hook to check if a user is pinned
export function useIsUserPinned(userId: Id<'users'>, friendUsername: string) {
  return useQuery(api.friends.isUserPinned, { userId, friendUsername });
}

// Hook to get friend create tasks permission
export function useFriendCreateTasksPermission(userId: Id<'users'>, friendUserId: Id<'users'>) {
  return useQuery(api.friends.getFriendCreateTasksPermission, { userId, friendUserId });
}

// Mutations
export function useSendFriendRequest() {
  return useMutation(api.friends.sendFriendRequest);
}

export function useAcceptFriendRequest() {
  return useMutation(api.friends.acceptFriendRequest);
}

export function useDeclineFriendRequest() {
  return useMutation(api.friends.declineFriendRequest);
}

export function useWithdrawFriendRequest() {
  return useMutation(api.friends.withdrawFriendRequest);
}

export function usePinFriend() {
  return useMutation(api.friends.pinFriend);
}

export function useUnpinFriend() {
  return useMutation(api.friends.unpinFriend);
}

export function useEnableFriendCreateTasksPermission() {
  return useMutation(api.friends.enableFriendCreateTasksPermission);
}

export function useDisableFriendCreateTasksPermission() {
  return useMutation(api.friends.disableFriendCreateTasksPermission);
}

export function useUnfriend() {
  return useMutation(api.friends.unfriend);
}

// Legacy function interfaces for backward compatibility
// These functions can be used to gradually migrate from the old Supabase functions

export async function getFriendsForUser(_userId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  // or call the Convex function directly if needed
  throw new Error('Use useFriendsForUser hook instead');
}

export async function sendFriendRequest(_requesterId: string, _recipientId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useSendFriendRequest hook instead');
}

export async function listFriendRequests(_userId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useFriendRequests hook instead');
}

export async function acceptFriendRequest(_requestId: number, _userId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useAcceptFriendRequest hook instead');
}

export async function declineFriendRequest(_requestId: number, _userId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useDeclineFriendRequest hook instead');
}

export async function withdrawFriendRequest(_requestId: number, _userId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useWithdrawFriendRequest hook instead');
}

export async function pinFriend(_userId: string, _friendUsername: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use usePinFriend hook instead');
}

export async function unpinFriend(_userId: string, _friendUsername: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useUnpinFriend hook instead');
}

export async function searchUsersByUsername(_query: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useSearchUsers hook instead');
}

export async function unfriend(_userId: string, _friendUserId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useUnfriend hook instead');
}

export async function enableFriendCreateTasksPermission(_userId: string, _friendUserId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useEnableFriendCreateTasksPermission hook instead');
}

export async function disableFriendCreateTasksPermission(_userId: string, _friendUserId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useDisableFriendCreateTasksPermission hook instead');
}

export async function getFriendCreateTasksPermission(_userId: string, _friendUserId: string) {
  // This is a placeholder - in practice, you'd use the hook above
  throw new Error('Use useFriendCreateTasksPermission hook instead');
}
