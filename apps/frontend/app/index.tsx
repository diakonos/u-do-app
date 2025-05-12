import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/today');
      } else {
        router.replace('/login');
      }
    }
  }, [session, loading, router]);

  return null;
}
