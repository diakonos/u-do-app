import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/context/auth';
import { TaskProvider } from '@/lib/context/task';
import { FriendsProvider } from '@/lib/context/friends';
import { Typography } from '@/constants/Typography';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://95ef48dd1caf60feb863806b6d0877d6@o4509234354651136.ingest.us.sentry.io/4509234356355072',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return; // Don't run routing logic until session is loaded

    const inAuthGroup = segments[0] === 'auth';
    const isVerifyingOTP = segments[0] === 'verify-otp';
    const isCreatingUsername = segments[0] === 'create-username';

    if (session) {
      const hasUsername = !!session.user?.user_metadata?.username;
      
      if (!hasUsername && !isCreatingUsername) {
        // User is logged in but needs to create a username
        router.replace('/create-username');
      } else if (hasUsername && (inAuthGroup || isVerifyingOTP || isCreatingUsername)) {
        // User is logged in, has username, redirect away from auth/setup screens
        router.replace('/(home)');
      } else if (!hasUsername && isCreatingUsername) {
        // User is logged in, needs username, and is already on the correct screen
        // Do nothing, let them stay on create-username
      } else if (hasUsername && !inAuthGroup && !isVerifyingOTP && !isCreatingUsername) {
        // User is logged in, has username, and is already in the main app area
        // Do nothing, let them stay
      }
    } else {
      // User is not logged in
      if (!inAuthGroup && !isVerifyingOTP) {
        // Redirect to the sign-in page if not already there or verifying
        router.replace('/auth');
      }
    }

    SplashScreen.hideAsync(); // Hide the splash screen after routing logic is complete
  }, [session, segments, isLoading, router]);

  if (isLoading) {
    return <Slot />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
        <Stack.Screen name="create-username" options={{ headerShown: false }} />
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <AuthProvider>
        <TaskProvider>
          <FriendsProvider>
            <InitialLayout />
          </FriendsProvider>
        </TaskProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
});