import { useQuery } from 'convex/react';
import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Alert } from 'react-native';
import { useCurrentUserId } from '@/lib/auth-client';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import Text from '@/components/Text';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useTodayTasks } from '@/db/hooks/useTodayTasks';
import { useFriendCreateTasksPermission } from '@/db/hooks/useFriendCreateTasksPermission';
import { baseTheme, useTheme } from '@/lib/theme';
import Button from '@/components/Button';
import { api } from '../../../../backend/convex/_generated/api';
import { Id } from '../../../../backend/convex/_generated/dataModel';
import {
  usePinFriend,
  useUnpinFriend,
  useUnfriend,
  useEnableFriendCreateTasksPermission,
  useDisableFriendCreateTasksPermission,
} from '@/db/friends-convex';

function useUserIdFromUsername(username: string | undefined) {
  const user = useQuery(api.users.getUserByUsername, username ? { username } : 'skip');
  return user?._id;
}

function useIsPinned(userId: string | null, friendUsername: string | undefined) {
  return useQuery(
    api.friends.isUserPinned,
    userId && friendUsername ? { userId: userId as Id<'users'>, friendUsername } : 'skip',
  );
}

export default function FriendTasksScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const theme = useTheme();
  const userId = useCurrentUserId();
  const friendUserId = useUserIdFromUsername(username);
  const isPinned = useIsPinned(userId, username);
  const canCreateTasks = useFriendCreateTasksPermission(userId, friendUserId);
  const { tasks = [], isLoading } = useTodayTasks(friendUserId);
  const router = useRouter();
  const pinFriend = usePinFriend();
  const unpinFriend = useUnpinFriend();
  const unfriend = useUnfriend();
  const enableFriendCreateTasksPermission = useEnableFriendCreateTasksPermission();
  const disableFriendCreateTasksPermission = useDisableFriendCreateTasksPermission();

  const handlePinToggle = useCallback(async () => {
    if (!userId || !username) return;
    try {
      if (isPinned) {
        await unpinFriend({ userId, friendUsername: username });
      } else {
        await pinFriend({ userId, friendUsername: username });
      }
    } catch {
      Alert.alert('Error', 'Could not update pin.');
    }
  }, [userId, username, isPinned, unpinFriend, pinFriend]);

  // Unfriend handler (no extra query)
  const handleUnfriend = useCallback(async () => {
    if (!userId || !friendUserId) return;
    try {
      await unfriend({ userId, friendUserId });
      Alert.alert('Unfriended', `You have unfriended ${username}.`);
      router.replace('/friends'); // Navigate back to main friends screen
    } catch {
      Alert.alert('Error', 'Could not unfriend.');
    }
  }, [userId, friendUserId, username, router, unfriend]);

  const handleCreateTasksPermissionToggle = useCallback(async () => {
    if (!userId || !friendUserId) return;
    try {
      if (canCreateTasks) {
        await disableFriendCreateTasksPermission({ userId, friendUserId });
      } else {
        await enableFriendCreateTasksPermission({ userId, friendUserId });
      }
    } catch {
      Alert.alert('Error', 'Could not update permission.');
    }
  }, [
    userId,
    friendUserId,
    canCreateTasks,
    enableFriendCreateTasksPermission,
    disableFriendCreateTasksPermission,
  ]);

  return (
    <Screen>
      <ScreenTitle showBackButton>{username}&apos;s Tasks</ScreenTitle>
      <View style={styles.tasksContainer}>
        {isLoading ? (
          <TaskListLoading />
        ) : (
          <TaskList
            tasks={tasks}
            readonly
            hideDueDate
            emptyMessage={
              <Text style={[styles.emptyContainer, { color: theme.secondary }]}>
                No tasks for today
              </Text>
            }
          />
        )}
      </View>
      {userId && friendUserId && (
        <View style={styles.buttons}>
          <Button
            style={[
              styles.pinButton,
              { backgroundColor: isPinned ? theme.destructive : theme.brand },
            ]}
            onPress={handlePinToggle}
            title={isPinned ? 'Unpin from Today' : 'Pin to Today'}
          />
          <Button
            title={
              canCreateTasks ? 'Disable creating tasks for you' : 'Allow to create tasks for you'
            }
            style={[
              styles.permissionButton,
              { backgroundColor: canCreateTasks ? theme.destructive : theme.brand },
            ]}
            onPress={handleCreateTasksPermissionToggle}
          />
          <Button
            title="Unfriend"
            style={[styles.unfriendButton, { backgroundColor: theme.destructive }]}
            onPress={handleUnfriend}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: {
    alignItems: 'center',
    gap: baseTheme.margin[2],
    paddingHorizontal: baseTheme.margin[3],
  },
  emptyContainer: { display: 'flex', justifyContent: 'center', textAlign: 'center' },
  permissionButton: {
    flexGrow: 0,
    maxWidth: 300, // Adjust as needed
  },
  pinButton: {
    flexGrow: 0,
    maxWidth: 200,
  },
  tasksContainer: { marginBottom: baseTheme.margin[3] },
  unfriendButton: {
    flexGrow: 0,
  },
});
