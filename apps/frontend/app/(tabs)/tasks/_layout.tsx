import { Stack } from 'expo-router';

export default function TasksLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Today' }} />
      <Stack.Screen
        name="archive"
        options={{
          title: 'Archive',
        }}
      />
    </Stack>
  );
}
