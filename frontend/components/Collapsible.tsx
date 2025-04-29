import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity, TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  titleStyle?: TextStyle;
}

export function Collapsible({
  children,
  title,
  defaultOpen = true,
  titleStyle = {},
}: PropsWithChildren<CollapsibleProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen(value => !value)}
        activeOpacity={0.8}
      >
        <ThemedText type="subtitle" style={[styles.headingText, titleStyle]}>
          {title}
        </ThemedText>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={[styles.chevron, { transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }]}
        />
      </TouchableOpacity>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  chevron: {
    marginLeft: 8,
  },
  content: {
    marginTop: 6,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headingText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
});
