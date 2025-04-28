import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Typography } from '@/constants/Typography';

export type ThemedInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  lightBackgroundColor?: string;
  darkBackgroundColor?: string;
  lightBorderColor?: string;
  darkBorderColor?: string;
  lightPlaceholderColor?: string;
  darkPlaceholderColor?: string;
};

export const ThemedInput = forwardRef<TextInput, ThemedInputProps>(({
  style,
  lightColor,
  darkColor,
  lightBackgroundColor,
  darkBackgroundColor,
  lightBorderColor,
  darkBorderColor,
  lightPlaceholderColor,
  darkPlaceholderColor,
  placeholderTextColor,
  ...rest
}, ref) => {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const backgroundColor = useThemeColor({ 
    light: lightBackgroundColor, 
    dark: darkBackgroundColor 
  }, 'inputBackground');
  const borderColor = useThemeColor({ 
    light: lightBorderColor, 
    dark: darkBorderColor 
  }, 'icon');
  const placeholderColor = useThemeColor({ 
    light: lightPlaceholderColor, 
    dark: darkPlaceholderColor 
  }, 'icon');

  return (
    <TextInput
      ref={ref}
      style={[
        styles.input,
        { 
          color, 
          backgroundColor,
          borderColor
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor || placeholderColor}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: Typography.baseFontSize,
  },
});