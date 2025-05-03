import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { HTMLTitle } from '@/components/ui/HTMLTitle';

export default function NotFoundScreen() {
  return (
    <>
      <HTMLTitle>
        <Text>Not Found</Text>
      </HTMLTitle>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">
          <Text>This screen doesn&apos;t exist.</Text>
        </ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">
            <Text>Go to home screen!</Text>
          </ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
