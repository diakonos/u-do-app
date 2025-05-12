import { Tabs } from 'expo-router';
import React from 'react';
import CheckedIcon from '@/assets/icons/checked.svg';
import ScheduleIcon from '@/assets/icons/calendar.svg';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveBackgroundColor: theme.background,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveBackgroundColor: theme.background,
        tabBarStyle: {
          borderColor: theme.secondary,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          tabBarIcon: ({ color, size }) => <CheckedIcon color={color} height={size} width={size} />,
          tabBarLabel: 'Today',
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarIcon: ({ color, size }) => (
            <ScheduleIcon color={color} height={size} width={size} />
          ),
          tabBarLabel: 'Schedule',
        }}
      />
    </Tabs>
  );
}
