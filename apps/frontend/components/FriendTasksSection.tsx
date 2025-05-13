import React from 'react';
import { View, ViewStyle } from 'react-native';
import useSWR from 'swr';
import { loadDashboardFriendTasks } from '@/db/dashboard';
import FriendTasksCollapse from '@/components/FriendTasksCollapse';
import { Task } from '@/db/tasks';

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
  if (!data || data.length === 0) return null;
  return (
    <View>
      {data.map(friend => {
        const tasks = friend.tasks || [];
        return (
          <View key={friend.friend_id} style={friendTasksStyle}>
            <FriendTasksCollapse friendName={friend.friend_username} tasks={tasks} />
          </View>
        );
      })}
    </View>
  );
}
