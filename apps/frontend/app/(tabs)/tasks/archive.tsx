import { useEffect, useState, Suspense } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { baseTheme, useTheme } from '@/lib/theme';
import TaskList, { TaskListLoading } from '@/components/TaskList';
import { useCurrentUserId } from '@/lib/auth';
import Screen from '@/components/Screen';
import { fetchArchivedTasks, fetchArchivedTasksCount } from '@/db/tasks';
import ScreenTitle from '@/components/ScreenTitle';
import Text from '@/components/Text';

const PAGE_SIZE = 20;

function useArchivedTasksInfinite(userId: string | null) {
  return useSWRInfinite(
    (index, prevData) => {
      if (!userId) return null;
      if (prevData && prevData.length === 0) return null; // reached end
      return `${userId}:${index + 1}`;
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

function ArchivedTaskList({ onCount }: { onCount?: (count: number) => void }) {
  const userId = useCurrentUserId();
  const { data, size, setSize, isValidating } = useArchivedTasksInfinite(userId);
  const count = useArchivedTasksCountSWR(userId);
  useEffect(() => {
    if (typeof count === 'number' && onCount) onCount(count);
  }, [count, onCount]);
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
  const [total, setTotal] = useState<number | null>(null);

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ScreenTitle showBackButton>
          Archived Tasks{typeof total === 'number' ? ` (${total})` : ''}
        </ScreenTitle>
        <View style={[styles.container, { backgroundColor: theme.background || '#fff' }]}>
          <Suspense fallback={<TaskListLoading />}>
            <ArchivedTaskList onCount={setTotal} />
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
