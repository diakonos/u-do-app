import { useTheme } from '@/lib/theme';
import Text from './Text';
import Button from './Button';
import { View, StyleSheet } from 'react-native';

interface FriendRequestItemProps {
  username: string;
  isSent: boolean;
  requestId: number;
  loading: boolean;
  onWithdraw: (requestId: number) => void;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
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
  pendingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  friendItem: { paddingVertical: 8 },
  actionButton: { backgroundColor: 'transparent', flexGrow: 0, marginLeft: 8 },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
