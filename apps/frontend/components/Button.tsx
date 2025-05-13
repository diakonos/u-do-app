import React from 'react';
import {
  TouchableOpacity,
  type TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';

type ButtonProps = TouchableOpacityProps & {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  labelStyle?: TextStyle | TextStyle[];
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  labelAlign?: 'left' | 'center';
  icon?: React.ReactNode;
};

export default function Button({
  title,
  onPress,
  disabled,
  loading,
  style,
  labelStyle,
  labelAlign = 'center',
  icon,
}: ButtonProps) {
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
        <>
          <Text
            style={[
              styles.label,
              { color: theme.textInverse, textAlign: labelAlign },
              labelStyle,
              icon ? styles.labelWithIcon : undefined,
            ]}
          >
            {title}
          </Text>
          {icon && <>{icon}</>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: baseTheme.borderRadius,
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: baseTheme.margin[2],
    paddingVertical: baseTheme.margin[1],
  },
  label: {
    width: '100%',
  },
  labelWithIcon: {
    flex: 1,
    marginRight: 8,
  },
});
