import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { ActivityIndicator } from 'react-native-paper';

export default function Homepage() {
  const { loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!session) {
      router.replace('/login');
    } else {
      router.replace('/(tabs)/tasks');
    }
  }, [loading, session, router]);

  // Only render something while loading, otherwise nothing (since we redirect)
  if (!loading) {
    // Don't render Slot or View to avoid navigator error
    return null;
  }

  // Optionally, show a loading spinner here
  return <ActivityIndicator animating={true} size="large" />;
}
