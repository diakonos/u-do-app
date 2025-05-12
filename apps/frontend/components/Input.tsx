import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';

export default function Input(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: theme.inputBackground,
        },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 8,
    fontSize: baseTheme.fontSize.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
