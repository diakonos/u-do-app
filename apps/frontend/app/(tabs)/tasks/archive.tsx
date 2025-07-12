import { Suspense, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import useSWRInfinite from 'swr/infinite';
import useSWR, { useSWRConfig } from 'swr';
import { baseTheme, useTheme } from '@/lib/theme';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useCurrentUserId } from '@/lib/auth';
import Screen from '@/components/Screen';
import { clearArchivedTasks, fetchArchivedTasks, fetchArchivedTasksCount } from '@/db/tasks';
import ScreenTitle from '@/components/ScreenTitle';
import Text from '@/components/Text';
import Button from '@/components/Button';

const PAGE_SIZE = 20;

function useArchivedTasksInfinite(userId: string | null) {
  const { mutate } = useSWRConfig();

  return useSWRInfinite(
    (index, prevData) => {
      if (!userId) return null;
      if (prevData && prevData.length === 0) return null; // reached end
      return `${userId}:${index + 1}`;
    },
    async key => {
      const page = parseInt(key.split(':')[1], 10);

      if (page === 1) {
        // Invalidate all SWR caches related to archived tasks for this user
        await mutate(
          (cacheKey: string | null) => {
            return typeof cacheKey === 'string' && cacheKey.startsWith(`${userId}:`);
          },
          undefined,
          { revalidate: true },
        );
        await mutate(`archivedTasksCount-${userId}`, undefined, { revalidate: true });
      }

      return fetchArchivedTasks(userId!, page, PAGE_SIZE);
    },
    { suspense: true },
  );
}

function useArchivedTasksCountSWR(userId: string | null) {
  const { data } = useSWR(
    userId ? `archivedTasksCount-${userId}` : null,
    () => fetchArchivedTasksCount(userId!),
    { suspense: true },
  );

  return data;
}

function ArchivedTaskList() {
  const userId = useCurrentUserId();
  const { data, size, setSize, isValidating } = useArchivedTasksInfinite(userId);
  const count = useArchivedTasksCountSWR(userId);

  const allTasks = data ? data.flat() : [];
  const hasMore =
    typeof count === 'number'
      ? allTasks.length < count
      : data && data[data.length - 1]?.length === PAGE_SIZE;
  return (
    <>
      <TaskList tasks={allTasks} hideDueDate />
      {hasMore && (
        <View style={styles.loadMoreContainer}>
          <TouchableOpacity onPress={() => setSize(size + 1)}>
            <Text style={styles.loadMoreBtn}>
              {isValidating ? 'Loading...' : 'Load more tasks'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

export default function ArchiveScreen() {
  const userId = useCurrentUserId();
  const theme = useTheme();
  const count = useArchivedTasksCountSWR(userId);

  // const [total, setTotal] = useState<number>(count ?? 0);
  const [isClearing, setIsClearing] = useState(false);
  const { mutate } = useSWRConfig();
  const router = useRouter();

  const handleClearAll = useCallback(async () => {
    if (!userId) return;

    try {
      setIsClearing(true);
      await clearArchivedTasks(userId);
      // Invalidate all SWR caches related to archived tasks for this user
      await Promise.all([
        mutate(
          (cacheKey: string | null) => {
            return typeof cacheKey === 'string' && cacheKey.startsWith(`${userId}:`);
          },
          undefined,
          { revalidate: true },
        ),
        mutate(`archivedTasksCount-${userId}`, undefined, { revalidate: true }),
      ]);
    } catch (error) {
      console.error('Failed to clear archived tasks:', error);
      Alert.alert('Error', 'Failed to clear archived tasks. Please try again.');
    } finally {
      setIsClearing(false);
    }
  }, [mutate, userId]);

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View>
          <ScreenTitle showBackButton onBack={() => router.push('/tasks')}>
            Archived Tasks{typeof count === 'number' ? ` (${count})` : ''}
          </ScreenTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              {count && count > 0 ? (
                <Button
                  onPress={() => {}}
                  style={{
                    backgroundColor: theme.primary,
                    marginHorizontal: baseTheme.margin[3],
                    marginBottom: baseTheme.margin[2],
                    padding: baseTheme.margin[2],
                  }}
                  disabled={isClearing}
                  title={isClearing ? 'Clearing...' : 'Clear All'}
                />
              ) : null}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <Text>Clear All Archived Tasks</Text>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <Text>
                    Are you sure you want to permanently delete all archived tasks? This action
                    cannot be undone.
                  </Text>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isClearing} className="mb-5">
                  <Text>Cancel</Text>
                </AlertDialogCancel>
                <AlertDialogAction
                  onPress={handleClearAll}
                  disabled={isClearing}
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text style={{ color: theme.background }}>
                    {isClearing ? 'Clearing...' : 'Clear All'}
                  </Text>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </View>
        <View style={[styles.container, { backgroundColor: theme.background || '#fff' }]}>
          <Suspense fallback={<TaskListLoading />}>
            <ArchivedTaskList />
          </Suspense>
        </View>
      </ScrollView>
    </Screen>
  );
}

// Hide this screen from the tab bar but keep it accessible via navigation
export const options = {
  tabBarButton: () => null,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadMoreBtn: {
    padding: baseTheme.margin[2],
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginBottom: baseTheme.margin[4],
    marginTop: baseTheme.margin[3],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
