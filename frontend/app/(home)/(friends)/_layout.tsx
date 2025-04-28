import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function FriendsLayout() {
  const colorScheme = useColorScheme();
  const whiteColor = useThemeColor({}, 'white');
  const tintColor = useThemeColor({}, 'tint');
  return (
    <Stack screenOptions={{
      navigationBarColor: tintColor,
      headerTintColor: whiteColor,
      headerStyle: {
        backgroundColor: tintColor,
      },
    }}>
      <Stack.Screen name="index" options={{ headerShown: true, title: "Friends" }} />
      <Stack.Screen name="[username]" options={{ headerShown: true }} />
    </Stack>
  )
}