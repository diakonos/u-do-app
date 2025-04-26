import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
}

export function Collapsible({ children, title, defaultOpen = true }: PropsWithChildren<CollapsibleProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}>
        <ThemedText type="subtitle" style={styles.headingText}>{title}</ThemedText>
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
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headingText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  chevron: {
    marginLeft: 8,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
