import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import useSWR, { mutate as globalMutate } from 'swr';
import { useCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import Text from '@/components/Text';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useTodayTasks } from '@/db/hooks/useTodayTasks';
import { baseTheme, useTheme } from '@/lib/theme';
import { pinFriend, unpinFriend, unfriend } from '@/db/friends';
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
  const { tasks = [], isLoading } = useTodayTasks(friendUserId);
  const router = useRouter();

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
  }, [isPinned, userId, username, mutatePin]);

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
  }, [userId, friendUserId, username, router]);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <ScreenTitle showBackButton>{username}&apos;s Tasks</ScreenTitle>
        <TouchableOpacity onPress={handlePinToggle} style={styles.pinButton}>
          <Text style={[styles.pinText, { color: isPinned ? theme.destructive : theme.brand }]}>
            {isPinned ? 'Unpin from Today' : 'Pin to Today'}
          </Text>
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <TaskListLoading />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.secondary }}>No tasks for today</Text>
        </View>
      ) : (
        <TaskList tasks={tasks} readonly hideDueDate />
      )}
      {/* Unfriend button at the bottom */}
      {userId && friendUserId && (
        <Button
          title="Unfriend"
          style={[styles.unfriendButton, { backgroundColor: theme.destructive }]}
          onPress={handleUnfriend}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { alignItems: 'center' },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pinButton: {
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  pinText: {
    fontWeight: 'bold',
  },
  unfriendButton: {
    alignSelf: 'center',
    flexGrow: 0,
    marginBottom: baseTheme.margin[3],
    marginTop: baseTheme.margin[4],
  },
});
