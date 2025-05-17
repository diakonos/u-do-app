import { ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/auth';

export default function Homepage() {
  const { loading } = useAuth();

  // Only render something while loading, otherwise nothing (since we redirect)
  if (!loading) {
    // Don't render Slot or View to avoid navigator error
    return null;
  }

  // Optionally, show a loading spinner here
  return <ActivityIndicator animating={true} size="large" />;
}
