import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Alert } from 'react-native';
import useSWR, { useSWRConfig } from 'swr';
import { useCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import Text from '@/components/Text';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useTodayTasks } from '@/db/hooks/useTodayTasks';
import { useFriendCreateTasksPermission } from '@/db/hooks/useFriendCreateTasksPermission'; // New import
import { baseTheme, useTheme } from '@/lib/theme';
import {
  pinFriend,
  unpinFriend,
  unfriend,
  enableFriendCreateTasksPermission,
  disableFriendCreateTasksPermission,
} from '@/db/friends';
import Button from '@/components/Button';

function useUserIdFromUsername(username: string | undefined) {
  return useSWR(
    username ? `userId:${username}` : null,
    async () => {
      if (!username) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('username', username)
        .single();
      if (error) throw error;
      return data?.user_id || null;
    },
    { suspense: true },
  );
}

function useIsPinned(userId: string | null, friendUsername: string | undefined) {
  return useSWR(
    userId && friendUsername ? `dashboard-pin:${userId}:${friendUsername}` : null,
    async () => {
      if (!userId || !friendUsername) return false;
      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('id')
        .eq('user_id', userId)
        .eq('block_type', 'friend_tasks')
        .eq('value', friendUsername)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    { suspense: true },
  );
}

export default function FriendTasksScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const theme = useTheme();
  const userId = useCurrentUserId();
  const { data: friendUserId } = useUserIdFromUsername(username);
  const { data: isPinned, mutate: mutatePin } = useIsPinned(userId, username);
  const { data: canCreateTasks, mutate: mutateCanCreateTasks } = useFriendCreateTasksPermission(
    userId,
    friendUserId,
  );
  const { tasks = [], isLoading } = useTodayTasks(friendUserId);
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();

  const handlePinToggle = useCallback(async () => {
    if (!userId || !username) return;
    try {
      if (isPinned) {
        await unpinFriend(userId, username);
      } else {
        await pinFriend(userId, username);
      }
      mutatePin();
      globalMutate(`dashboard-friend-tasks:${userId}`); // Revalidate friends on the dashboard
    } catch {
      Alert.alert('Error', 'Could not update pin.');
    }
  }, [userId, username, isPinned, mutatePin, globalMutate]);

  // Unfriend handler (no extra query)
  const handleUnfriend = useCallback(async () => {
    if (!userId || !friendUserId) return;
    try {
      await unfriend(userId, friendUserId);
      globalMutate(`friends:${userId}`); // Revalidate main friends list
      Alert.alert('Unfriended', `You have unfriended ${username}.`);
      router.replace('/friends'); // Navigate back to main friends screen
    } catch {
      Alert.alert('Error', 'Could not unfriend.');
    }
  }, [userId, friendUserId, globalMutate, username, router]);

  const handleCreateTasksPermissionToggle = useCallback(async () => {
    if (!userId || !friendUserId) return;
    try {
      if (canCreateTasks) {
        await disableFriendCreateTasksPermission(userId, friendUserId);
      } else {
        await enableFriendCreateTasksPermission(userId, friendUserId);
      }
      mutateCanCreateTasks();
    } catch {
      Alert.alert('Error', 'Could not update permission.');
    }
  }, [userId, friendUserId, canCreateTasks, mutateCanCreateTasks]);

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
