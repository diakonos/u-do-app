import { useTheme } from '@/lib/theme';
import Text from './Text';
import Button from './Button';
import { View, StyleSheet } from 'react-native';
import { Id } from '../../backend/convex/_generated/dataModel';

interface FriendRequestItemProps {
  username: string;
  isSent: boolean;
  requestId: Id<'friendRequests'>;
  loading: boolean;
  onWithdraw: (requestId: Id<'friendRequests'>) => void;
  onAccept: (requestId: Id<'friendRequests'>) => void;
  onReject: (requestId: Id<'friendRequests'>) => void;
}

export default function FriendRequestItem({
  username,
  isSent,
  requestId,
  loading,
  onWithdraw,
  onAccept,
  onReject,
}: FriendRequestItemProps) {
  const theme = useTheme();
  return (
    <View style={styles.pendingRow}>
      <Text style={styles.friendItem}>{username}</Text>
      {isSent ? (
        <Button
          title="Withdraw Request"
          onPress={() => onWithdraw(requestId)}
          loading={loading}
          style={styles.actionButton}
          labelStyle={{ color: theme.destructive }}
        />
      ) : (
        <View style={styles.actionRow}>
          <Button
            title="Accept"
            onPress={() => onAccept(requestId)}
            loading={loading}
            style={styles.actionButton}
            labelStyle={{ color: theme.success }}
          />
          <Button
            title="Reject"
            onPress={() => onReject(requestId)}
            loading={loading}
            style={styles.actionButton}
            labelStyle={{ color: theme.destructive }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // eslint-disable-next-line react-native/no-color-literals
  actionButton: { backgroundColor: 'transparent', flexGrow: 0, marginLeft: 8 },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  friendItem: { paddingVertical: 8 },
  pendingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
