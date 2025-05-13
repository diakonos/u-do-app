import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import useSWR, { mutate as globalMutate } from 'swr';
import { useCurrentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import Text from '@/components/Text';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useTodayTasks } from '@/db/hooks/useTodayTasks';
import { useTheme } from '@/lib/theme';
import { pinFriend, unpinFriend } from '@/db/friends';

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
      {isLoading ? <TaskListLoading /> : <TaskList tasks={tasks} readonly hideDueDate />}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
