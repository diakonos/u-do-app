import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CheckedIcon from '@/assets/icons/checked.svg';
import ScheduleIcon from '@/assets/icons/calendar.svg';
import CogIcon from '@/assets/icons/cog.svg';
import PersonIcon from '@/assets/icons/person.svg';
import { useTheme } from '@/lib/theme';
import BlurTabBarBackground from '@/components/TabBarBackground';

export default function TabsLayout() {
  const theme = useTheme();
  const safeArea = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveBackgroundColor: theme.background,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveBackgroundColor: theme.background,
        tabBarBackground: BlurTabBarBackground,
        tabBarStyle: Platform.select({
          default: {},
          web: {
            borderColor: theme.borderFaint,
            height: 49 + safeArea.bottom,
            paddingBottom: safeArea.bottom,
          },
        }),
        tabBarLabelStyle: Platform.select({
          default: { borderColor: theme.borderFaint },
          web: {
            overflow: 'visible',
          },
        }),
      }}
    >
      <Tabs.Screen
        name="tasks"
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
      <Tabs.Screen
        name="friends"
        options={{
          tabBarIcon: ({ color, size }) => <PersonIcon color={color} height={size} width={size} />,
          tabBarLabel: 'Friends',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, size }) => <CogIcon color={color} height={size} width={size} />,
          tabBarLabel: 'Settings',
        }}
      />
      <Tabs.Screen name="archive" options={{ href: null }} />
    </Tabs>
  );
}
