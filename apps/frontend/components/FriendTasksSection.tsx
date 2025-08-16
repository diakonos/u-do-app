import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../backend/convex/_generated/api';
import FriendTasksCollapse from '@/components/FriendTasksCollapse';
import { baseTheme } from '@/lib/theme';
import Text from '@/components/Text';
import { Id } from '../../backend/convex/_generated/dataModel';

interface FriendTasksSectionProps {
  userId: string | null;
  friendTasksStyle?: ViewStyle;
}

export default function FriendTasksSection({ userId, friendTasksStyle }: FriendTasksSectionProps) {
  const data = useQuery(
    api.tasks.getDashboardFriendTasks,
    userId ? { userId: userId as Id<'users'> } : 'skip',
  );

  if (!userId || data === undefined) return null;
  if (data.length === 0) return <Text style={styles.emptyMessage}>No friends pinned.</Text>;
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
