import { Text, type TextProps, StyleSheet, TextStyle } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { Typography } from '@/constants/Typography';
import { Colors } from '@/constants/Colors';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({ light: Colors.light.tint, dark: Colors.dark.tint }, 'tint');

  return (
    <Text
      style={[
        { color } as TextStyle,
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: linkColor }] : undefined,
        style as TextStyle,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: Typography.baseFontSize,
    lineHeight: Typography.baseFontSize * 1.5,
  },
  defaultSemiBold: {
    fontSize: Typography.baseFontSize,
    fontWeight: '600',
    lineHeight: Typography.baseFontSize * 1.5,
  },
  link: {
    fontSize: Typography.baseFontSize,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    lineHeight: Typography.sizes.xxl,
  },
});
