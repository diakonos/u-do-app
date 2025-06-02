import { Suspense, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import useSWRInfinite from 'swr/infinite';
import useSWR, { mutate } from 'swr';
import { baseTheme, useTheme } from '@/lib/theme';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useCurrentUserId } from '@/lib/auth';
import Screen from '@/components/Screen';
import { fetchArchivedTasks, fetchArchivedTasksCount, clearArchivedTasks } from '@/db/tasks';
import ScreenTitle from '@/components/ScreenTitle';
import Text from '@/components/Text';

const PAGE_SIZE = 20;

function useArchivedTasksInfinite(userId: string | null) {
  return useSWRInfinite(
    (index, prevData) => {
      if (!userId) return null;
      if (prevData && prevData.length === 0) return null; // reached end
      return `archivedTasks-${userId}:${index + 1}`;
    },
    async key => {
      const page = parseInt(key.split(':')[1], 10);
      return fetchArchivedTasks(userId!, page, PAGE_SIZE);
    },
    { revalidateAll: false, revalidateFirstPage: false, suspense: true },
  );
}

function useArchivedTasksCountSWR(userId: string | null) {
  const { data } = useSWR(userId ? `archivedTasksCount-${userId}` : null, () =>
    fetchArchivedTasksCount(userId!),
  );
  return data;
}

function ArchivedTaskList({ count }: { count?: number }) {
  const userId = useCurrentUserId();
  const { data, size, setSize, isValidating } = useArchivedTasksInfinite(userId);

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
  const theme = useTheme();
  const userId = useCurrentUserId();
  const count = useArchivedTasksCountSWR(userId);

  const handleClearAll = useCallback(async () => {
    if (!userId) return;

    Alert.alert(
      'Clear All Archived Tasks',
      'Are you sure you want to permanently delete all archived tasks? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearArchivedTasks(userId);
              // Invalidate all SWR caches related to archived tasks
              mutate((key: string | null) => {
                if (key?.startsWith(`archivedTasks-${userId}:`)) return null;
                return key;
              });
              mutate(`archivedTasksCount-${userId}`);
            } catch (error) {
              console.error('Failed to clear archived tasks:', error);
              Alert.alert('Error', 'Failed to clear archived tasks. Please try again.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [userId]);

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ScreenTitle showBackButton style={styles.title}>
            Archived Tasks{typeof count === 'number' ? ` (${count})` : ''}
          </ScreenTitle>
          {count !== undefined && count > 0 && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: theme.primary }]}
              onPress={handleClearAll}
            >
              <Text style={[styles.clearButtonText, { color: theme.background }]}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.container, { backgroundColor: theme.background || '#fff' }]}>
          <Suspense fallback={<TaskListLoading />}>
            <ArchivedTaskList count={count} />
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
  clearButton: {
    alignItems: 'center',
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  } as ViewStyle,
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  } as TextStyle,
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 16,
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
  title: {
    flex: 1,
  },
});
