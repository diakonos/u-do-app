import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';

type ScreenProps = PropsWithChildren & {
  style?: ViewStyle | ViewStyle[];
};

export default function Screen(props: ScreenProps) {
  const { children, style, ...rest } = props;
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
  },
});
