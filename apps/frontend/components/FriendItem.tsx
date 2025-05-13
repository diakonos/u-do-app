import { useTheme } from '@/lib/theme';
import Text from './Text';
import { StyleSheet } from 'react-native';

export default function FriendItem({
  username,
  onPress,
}: {
  username: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Text style={styles.friendItem} onPress={onPress}>
      {username}
    </Text>
  );
}

const styles = StyleSheet.create({
  friendItem: { paddingVertical: 8 },
});
