import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Text from './Text';
import { baseTheme, useTheme } from '@/lib/theme';
import CaretDownIcon from '@/assets/icons/caret-down.svg'; // Will rotate for back

interface ScreenTitleProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  style?: ViewStyle | ViewStyle[];
  onBack?: () => void;
}

export default function ScreenTitle({ children, showBackButton, style, onBack }: ScreenTitleProps) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.row, style]}>
      {showBackButton && (
        <TouchableOpacity
          onPress={onBack || router.back}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <CaretDownIcon
            width={20}
            height={20}
            style={{ transform: [{ rotate: '90deg' }] }}
            color={theme.text}
          />
        </TouchableOpacity>
      )}
      <Text
        size="large"
        weight="semibold"
        style={[styles.title, !showBackButton && { marginLeft: 0 }]}
        numberOfLines={1}
      >
        {children}
      </Text>
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: baseTheme.margin[4],
    marginLeft: baseTheme.margin[3],
    marginTop: baseTheme.margin[3],
  },
  backButton: {
    marginRight: baseTheme.margin[2],
    padding: 4,
  },
  title: {
    flex: 1,
  },
  rightSpacer: {
    width: 28, // for symmetry
  },
});
