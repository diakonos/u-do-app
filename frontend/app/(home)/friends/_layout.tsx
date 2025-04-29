import { useThemeColor } from "@/hooks/useThemeColor";
import { Stack } from "expo-router";

export default function FriendsLayout() {
  const whiteColor = useThemeColor({}, 'white');
  const tintColor = useThemeColor({}, 'brand');

  return (
    <Stack screenOptions={{
      navigationBarColor: tintColor,
      headerTintColor: whiteColor,
      headerStyle: {
        backgroundColor: tintColor,
      },
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: true, 
          title: "Friends",
        }} 
      />
      <Stack.Screen name="[username]" options={{ headerShown: true }} />
    </Stack>
  )
}