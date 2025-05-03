import { Tabs, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/ui/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TaskProvider } from '@/lib/context/task';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tintColor = useThemeColor({}, 'brand');
  const whiteColor = useThemeColor({}, 'white');
  const safeArea = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();

  function isOnTasksTab() {
    return segments[0] === '(home)' && segments[1] === 'tasks';
  }

  function isOnFriendsTab() {
    return segments[0] === '(home)' && segments[1] === 'friends';
  }

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
          listeners={{
            tabPress: e => {
              if (isOnTasksTab()) {
                e.preventDefault();
                if (router.canDismiss()) {
                  router.dismissAll();
                } else {
                  router.replace('/tasks');
                }
              }
            },
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
          listeners={{
            tabPress: e => {
              if (isOnFriendsTab()) {
                e.preventDefault();
                if (router.canDismiss()) {
                  router.dismissAll();
                } else {
                  router.replace('/friends');
                }
              }
            },
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
