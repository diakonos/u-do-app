import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function Homepage() {
  const { loading } = useAuth();

  // Only render something while loading, otherwise nothing (since we redirect)
  if (!loading) {
    // Don't render Slot or View to avoid navigator error
    return null;
  }

  return <Redirect href="/(tabs)/tasks" />;
}
