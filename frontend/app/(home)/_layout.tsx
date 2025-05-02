import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TaskProvider } from '@/lib/context/task';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tintColor = useThemeColor({}, 'brand');
  const whiteColor = useThemeColor({}, 'white');
  const safeArea = useSafeAreaInsets();

  return (
    <TaskProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme].tint,
          headerTintColor: whiteColor,
          headerStyle: {
            backgroundColor: tintColor,
          },
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            default: {},
            web: {
              paddingBottom: safeArea.bottom,
              height: 49 + safeArea.bottom,
            },
          }),
          tabBarLabelStyle: Platform.select({
            default: {},
            web: {
              overflow: 'visible',
            },
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            headerShown: false,
            title: 'Tasks',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
          }}
        />
        <Tabs.Screen
          name="tasks/schedule"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            headerShown: false,
            title: 'Friends',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="gear" color={color} />,
          }}
        />
      </Tabs>
    </TaskProvider>
  );
}
