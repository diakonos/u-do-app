import { Link, Slot, Tabs, useRouter } from 'expo-router';
import { Platform, useWindowDimensions, ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CheckedIcon from '@/assets/icons/checked.svg';
import ScheduleIcon from '@/assets/icons/calendar.svg';
import CogIcon from '@/assets/icons/cog.svg';
import PersonIcon from '@/assets/icons/person.svg';
import { baseTheme, useTheme } from '@/lib/theme';
import BlurTabBarBackground from '@/components/TabBarBackground';
import Text from '@/components/Text';
import Button from '@/components/Button';

export default function TabsLayout() {
  const theme = useTheme();
  const safeArea = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();

  if (width >= 1200) {
    return (
      <ScrollView style={{ backgroundColor: theme.background }}>
        <View style={styles.desktopHeader}>
          <Link href="/(tabs)/tasks">
            <Text weight="light" style={styles.logo}>
              U Do
            </Text>
          </Link>
          <Button
            title="Settings"
            icon={<CogIcon color={theme.text} />}
            onPress={() => router.push('/(tabs)/settings')}
            style={styles.settingsButton}
            labelStyle={{ color: theme.text }}
          />
        </View>
        <Slot />
        <View style={{ height: baseTheme.margin[4] }}></View>
      </ScrollView>
    );
  }

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

const styles = StyleSheet.create({
  desktopHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: baseTheme.margin[4],
    paddingHorizontal: baseTheme.margin[3],
    paddingTop: baseTheme.margin[3],
  },
  logo: { fontSize: 50 },
  // eslint-disable-next-line react-native/no-color-literals
  settingsButton: {
    backgroundColor: 'transparent',
    flexGrow: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
