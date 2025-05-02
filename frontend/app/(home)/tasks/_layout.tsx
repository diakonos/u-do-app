import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme.web';
import { Stack } from 'expo-router';

export default function TasksLayout() {
  const colorScheme = useColorScheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors[colorScheme].tint,
        },
        headerTintColor: Colors[colorScheme].white,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="tasks" />
    </Stack>
  );
}
