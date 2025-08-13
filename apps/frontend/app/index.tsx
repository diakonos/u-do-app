import { Redirect } from 'expo-router';
import { useSession } from '@/lib/auth-client';

export default function Homepage() {
  const { isPending: loading } = useSession();

  // Only render something while loading, otherwise nothing (since we redirect)
  if (!loading) {
    // Don't render Slot or View to avoid navigator error
    return null;
  }

  return <Redirect href="/(tabs)/tasks" />;
}
