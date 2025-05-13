import { useTheme } from '@/lib/theme';
import { PropsWithChildren } from 'react';
import { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native';

type ScreenProps = PropsWithChildren & {
  style?: ViewStyle | ViewStyle[];
};

export default function Screen(props: ScreenProps) {
  const { children, style, ...rest } = props;
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }, style]}
      {...rest}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
  },
});
