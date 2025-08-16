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
import { baseTheme, useTheme } from '@/lib/theme';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useCurrentUserId } from '@/lib/auth-client';
import Screen from '@/components/Screen';
import { useArchivedTasks, useArchivedTasksCount, useClearArchivedTasks } from '@/db/tasks-convex';
import ScreenTitle from '@/components/ScreenTitle';
import Text from '@/components/Text';
import Button from '@/components/Button';

const PAGE_SIZE = 20;

function ArchivedTaskList() {
  const userId = useCurrentUserId();
  const [page, setPage] = useState(1);
  const { tasks, isLoading } = useArchivedTasks(userId, page, PAGE_SIZE);
  const { count } = useArchivedTasksCount(userId);

  const hasMore = typeof count === 'number' ? tasks.length < count : false;

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <>
      <TaskList tasks={tasks} hideDueDate />
      {hasMore && (
        <View style={styles.loadMoreContainer}>
          <TouchableOpacity onPress={loadMore}>
            <Text style={styles.loadMoreBtn}>{isLoading ? 'Loading...' : 'Load more tasks'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

export default function ArchiveScreen() {
  const userId = useCurrentUserId();
  const theme = useTheme();
  const { count } = useArchivedTasksCount(userId);
  const clearArchivedTasks = useClearArchivedTasks();

  const [isClearing, setIsClearing] = useState(false);
  const router = useRouter();

  const handleClearAll = useCallback(async () => {
    if (!userId) return;

    try {
      setIsClearing(true);
      await clearArchivedTasks({ userId });
      // The Convex queries will automatically update due to real-time subscriptions
    } catch (error) {
      console.error('Failed to clear archived tasks:', error);
      Alert.alert('Error', 'Failed to clear archived tasks. Please try again.');
    } finally {
      setIsClearing(false);
    }
  }, [clearArchivedTasks, userId]);

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
