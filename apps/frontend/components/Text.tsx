import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { useTheme } from '@/lib/theme';

const weightToFont: Record<string, string> = {
  thin: 'SF-Pro-Display-Thin',
  light: 'SF-Pro-Display-Light',
  regular: 'SF-Pro-Display-Regular',
  medium: 'SF-Pro-Display-Medium',
  semibold: 'SF-Pro-Display-Semibold',
  bold: 'SF-Pro-Display-Bold',
};

type FontSize = 'small' | 'medium' | 'large';
type CustomTextProps = TextProps & {
  weight?: 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
  size?: FontSize;
};

export default function Text({
  weight = 'regular',
  size = 'medium',
  style,
  ...props
}: CustomTextProps) {
  const theme = useTheme();
  const fontFamily = weightToFont[weight] || weightToFont.regular;
  const fontSize = theme.fontSize[size] || theme.fontSize.medium;
  return <RNText {...props} style={[{ color: theme.text, fontFamily, fontSize }, style]} />;
}
