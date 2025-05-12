import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({ title, onPress, disabled, loading, style }: ButtonProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: disabled ? theme.disabled : theme.primary }, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={theme.white} />
      ) : (
        <Text style={[styles.label, { color: theme.textInverse }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: baseTheme.borderRadius,
    flexGrow: 1,
    paddingHorizontal: baseTheme.margin[2],
    paddingVertical: baseTheme.margin[1],
  },
  label: {
    textAlign: 'center',
    width: '100%',
  },
});
