import React, { useState } from 'react';
import FriendPokeDialog from '@/components/FriendPokeDialog';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Text from '@/components/Text';
import TaskList from '@/components/TaskList';
import NewTaskInput from '@/components/NewTaskInput'; // Import NewTaskInput
import CaretDownIcon from '@/assets/icons/caret-down.svg';
import CaretRightIcon from '@/assets/icons/caret-right.svg';
import { baseTheme, useTheme } from '@/lib/theme';
import { Task } from '@/db/tasks';
import { useCurrentUserId } from '@/lib/auth'; // Corrected import path
import { useFriendCreateTasksPermission } from '@/db/hooks/useFriendCreateTasksPermission'; // Corrected import path

interface FriendTasksCollapseProps {
  friendName: string;
  friendUserId: string;
  tasks: Task[];
  style?: ViewStyle | ViewStyle[];
}

export default function FriendTasksCollapse({
  friendName,
  friendUserId,
  tasks,
  style,
}: FriendTasksCollapseProps) {
  const [open, setOpen] = useState(true); // Open by default
  const [expanded, setExpanded] = useState(false); // For show all/less
  const [pokeDialogVisible, setPokeDialogVisible] = useState(false);
  const theme = useTheme();
  const userId = useCurrentUserId();
  const { data: canCreateTasks } = useFriendCreateTasksPermission(friendUserId, userId);

  const completed = tasks.filter(t => t.is_done).length;
  const total = tasks.length;
  const showToggle = total > 5;
  const visibleTasks = expanded ? tasks : tasks.slice(0, 5);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text weight="medium" style={styles.title}>
          {friendName}&apos;s tasks
        </Text>
        <TouchableOpacity
          style={styles.pokeButton}
          onPress={e => {
            e.stopPropagation();
            setPokeDialogVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.pokeText}>Poke</Text>
        </TouchableOpacity>
        <Text style={styles.count}>
          {completed}/{total}
        </Text>
        {open ? (
          <CaretRightIcon color={theme.text} style={[styles.caret, styles.caretDown]} />
        ) : (
          <CaretDownIcon color={theme.text} style={styles.caret} />
        )}
      </TouchableOpacity>
      <FriendPokeDialog
        visible={pokeDialogVisible}
        friendName={friendName}
        onClose={() => setPokeDialogVisible(false)}
        onSelect={option => {
          // You can add logic here, e.g. toast or API call
        }}
      />
      {open && (
        <View style={styles.listWrap}>
          <TaskList tasks={visibleTasks} readonly hideDueDate />
          {showToggle && (
            <TouchableOpacity
              onPress={() => setExpanded(e => !e)}
              style={styles.expandButton}
              activeOpacity={0.7}
            >
              <Text size="small" style={{ color: theme.textSecondary }}>
                {expanded ? 'Show less tasks' : 'Show all tasks'}
              </Text>
            </TouchableOpacity>
          )}
          {canCreateTasks && (
            <NewTaskInput
              placeholder={`New task for ${friendName}`}
              revalidateKey={`dashboard-friend-tasks:${userId}`}
              ownerUserId={friendUserId}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caret: {
    height: 20,
    marginLeft: baseTheme.margin[3],
    width: 20,
  },
  caretDown: { transform: [{ rotate: '-90deg' }] },
  container: {
    borderRadius: baseTheme.borderRadius,
    overflow: 'hidden',
  },
  count: {
    marginLeft: baseTheme.margin[2],
  },
  // eslint-disable-next-line react-native/no-color-literals
  expandButton: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    marginTop: baseTheme.margin[1],
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: baseTheme.margin[3],
    paddingVertical: baseTheme.margin[2],
  },
  listWrap: {},
  pokeButton: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    marginRight: 8,
  },
  pokeText: {
    color: '#3730a3',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    flex: 1,
  },
});
