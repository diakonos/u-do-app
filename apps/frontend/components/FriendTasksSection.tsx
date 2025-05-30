import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import useSWR from 'swr';
import { loadDashboardFriendTasks } from '@/db/dashboard';
import FriendTasksCollapse from '@/components/FriendTasksCollapse';
import { Task } from '@/db/tasks';
import { baseTheme } from '@/lib/theme';
import Text from '@/components/Text';

interface FriendData {
  friend_id: string;
  friend_username: string;
  tasks: Task[];
}

interface FriendTasksSectionProps {
  userId: string | null;
  friendTasksStyle?: ViewStyle;
}

export default function FriendTasksSection({ userId, friendTasksStyle }: FriendTasksSectionProps) {
  const { data, isLoading, error } = useSWR<FriendData[]>(
    userId ? `dashboard-friend-tasks:${userId}` : null,
    () => loadDashboardFriendTasks(userId!),
  );
  if (!userId || isLoading) return null;
  if (error) return null;
  if (!data || data.length === 0)
    return <Text style={styles.emptyMessage}>No friends pinned.</Text>;
  return (
    <View>
      {data.map(friend => {
        const tasks = friend.tasks || [];
        return (
          <View key={friend.friend_id} style={friendTasksStyle}>
            <FriendTasksCollapse
              friendName={friend.friend_username}
              friendUserId={friend.friend_id} // Pass friend_id as friendUserId
              tasks={tasks}
              style={styles.friend}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyMessage: { marginHorizontal: baseTheme.margin[3] },
  friend: { marginBottom: baseTheme.margin[3] },
});
