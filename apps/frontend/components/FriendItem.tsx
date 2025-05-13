import { StyleSheet } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import CaretRight from '@/assets/icons/caret-right.svg';
import { TouchableOpacity } from 'react-native-gesture-handler';

type FriendItemProps = {
  completedTasksTodayCount?: number;
  onPress?: () => void;
  totalTasksTodayCount?: number;
  username: string;
};

export default function FriendItem({
  completedTasksTodayCount,
  onPress,
  totalTasksTodayCount,
  username,
}: FriendItemProps) {
  const theme = useTheme();
  const pressable = typeof onPress === 'function';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!pressable}
      // eslint-disable-next-line react-native/no-inline-styles
      style={[styles.row, { cursor: pressable ? 'pointer' : 'auto' }]}
    >
      <Text style={styles.friendItem}>{username}</Text>
      {typeof totalTasksTodayCount === 'number' && typeof completedTasksTodayCount === 'number' && (
        <Text style={[styles.count, { color: theme.secondary }]}>
          {completedTasksTodayCount} / {totalTasksTodayCount}
        </Text>
      )}
      <CaretRight style={styles.caret} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  caret: { marginLeft: baseTheme.margin[3] },
  count: { marginLeft: 'auto' },
  friendItem: { paddingVertical: baseTheme.margin[2] },
  row: { alignItems: 'center', flexDirection: 'row' },
});
