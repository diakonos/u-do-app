import { Stack } from 'expo-router';
export default function FriendsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Friends' }} />
      <Stack.Screen name="[username]" options={{ title: "Friend's Tasks" }} />
    </Stack>
  );
}
