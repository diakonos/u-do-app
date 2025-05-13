import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from '@/components/Text';
import TaskList from '@/components/TaskList';
import CaretDownIcon from '@/assets/icons/caret-down.svg';
import CaretRightIcon from '@/assets/icons/caret-right.svg';
import { baseTheme, useTheme } from '@/lib/theme';
import { ViewStyle } from 'react-native';

interface FriendTasksCollapseProps {
  friendName: string;
  tasks: any[];
  style?: ViewStyle | ViewStyle[];
}

export default function FriendTasksCollapse({
  friendName,
  tasks,
  style,
}: FriendTasksCollapseProps) {
  const [open, setOpen] = useState(true); // Open by default
  const [expanded, setExpanded] = useState(false); // For show all/less
  const theme = useTheme();
  const completed = tasks.filter(t => t.is_done).length;
  const total = tasks.length;
  const showToggle = total > 5;
  const visibleTasks = expanded ? tasks : tasks.slice(0, 5);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text weight="medium" style={styles.title}>
          {friendName}'s tasks
        </Text>
        <Text style={styles.count}>
          {completed}/{total}
        </Text>
        {open ? (
          <CaretRightIcon rotation={-90} color={theme.text} style={styles.caret} />
        ) : (
          <CaretDownIcon color={theme.text} style={styles.caret} />
        )}
      </TouchableOpacity>
      {open && (
        <View style={styles.listWrap}>
          <TaskList tasks={visibleTasks} readonly hideDueDate />
          {showToggle && (
            <TouchableOpacity
              onPress={() => setExpanded(e => !e)}
              style={{
                marginTop: baseTheme.margin[1],
                alignSelf: 'center',
                backgroundColor: 'transparent',
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
              activeOpacity={0.7}
            >
              <Text size="small" style={{ color: theme.textSecondary }}>
                {expanded ? 'Show less tasks' : 'Show all tasks'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caret: {
    marginLeft: baseTheme.margin[3],
    height: 20,
    width: 20,
  },
  container: {
    borderRadius: baseTheme.borderRadius,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: baseTheme.margin[3],
    paddingVertical: baseTheme.margin[2],
  },
  title: {
    flex: 1,
  },
  count: {
    marginLeft: baseTheme.margin[2],
    color: '#888',
  },
  listWrap: {},
});
