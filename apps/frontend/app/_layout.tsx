import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

Sentry.init({
  dsn: 'https://95ef48dd1caf60feb863806b6d0877d6@o4509234354651136.ingest.us.sentry.io/4509234356355072',
  denyUrls: ['localhost'],
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Remove InitialLayout (not used)
// TODO: Replace require() font loading with static imports or another supported method if needed.

function RootNavigation() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hide();
    }
  }, [loading]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default Sentry.wrap(function RootLayout() {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const [fontsLoaded] = useFonts({
    'SF-Pro-Display-Black': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Black.otf'),
    'SF-Pro-Display-BlackItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-BlackItalic.otf'),
    'SF-Pro-Display-Bold': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Bold.otf'),
    'SF-Pro-Display-BoldItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-BoldItalic.otf'),
    'SF-Pro-Display-Heavy': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Heavy.otf'),
    'SF-Pro-Display-HeavyItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-HeavyItalic.otf'),
    'SF-Pro-Display-Light': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Light.otf'),
    'SF-Pro-Display-LightItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-LightItalic.otf'),
    'SF-Pro-Display-Medium': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Medium.otf'),
    'SF-Pro-Display-MediumItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-MediumItalic.otf'),
    'SF-Pro-Display-Regular': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Regular.otf'),
    'SF-Pro-Display-RegularItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-RegularItalic.otf'),
    'SF-Pro-Display-Semibold': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Semibold.otf'),
    'SF-Pro-Display-SemiboldItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-SemiboldItalic.otf'),
    'SF-Pro-Display-Thin': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Thin.otf'),
    'SF-Pro-Display-ThinItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-ThinItalic.otf'),
    'SF-Pro-Display-Ultralight': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-Ultralight.otf'),
    'SF-Pro-Display-UltralightItalic': require('@/assets/fonts/SF-Pro-Display/SF-Pro-Display-UltralightItalic.otf'),
  });
  /* eslint-enable @typescript-eslint/no-require-imports */
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView>
      <ThemeProvider>
        <PaperProvider>
          <AuthProvider>
            <RootNavigation />
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
});
