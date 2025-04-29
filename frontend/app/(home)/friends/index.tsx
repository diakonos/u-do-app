import { useState, useRef, useEffect } from 'react';
import { StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useThemeColor } from '@/hooks/useThemeColor';
import FriendsTab from '@/components/friends/FriendsTab';
import RequestsTab from '@/components/friends/RequestsTab';
import SearchTab from '@/components/friends/SearchTab';
import { useColorScheme } from '@/hooks/useColorScheme';
import { HTMLTitle } from '@/components/HTMLTitle';
import { useNavigation } from 'expo-router';
import { useFriends } from '@/lib/context/friends';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'friends' | 'search' | 'requests';

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const colorScheme = useColorScheme();
  const tintColor = useThemeColor({}, 'brand');
  const whiteColor = useThemeColor({}, 'white');
  const navigation = useNavigation();
  const { fetchFriends } = useFriends();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Using these refs to maintain component instances between tab switches
  const friendsTabRef = useRef(<FriendsTab />);
  const searchTabRef = useRef(<SearchTab />);
  const requestsTabRef = useRef(<RequestsTab />);

  // For active text, we need to ensure good contrast with the tint background color
  const activeTextColor = "#FFFFFF"
  
  // Lighter gray background for dark mode inactive tabs
  const segmentedControlStyle = {
    ...styles.segmentedControl,
    ...(colorScheme === 'dark' && { backgroundColor: '#2A2D2E' })
  };

  // Update navigation header options when active tab changes
  useEffect(() => {
    if (Platform.OS === 'web') {
      navigation.setOptions({
        headerRight: activeTab === 'friends' ? () => (
          <TouchableOpacity 
            onPress={handleRefresh} 
            style={{ marginRight: 15 }} 
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={whiteColor} />
            ) : (
              <Ionicons name="refresh" size={24} color={whiteColor} />
            )}
          </TouchableOpacity>
        ) : undefined
      });
    }
  }, [activeTab, isRefreshing, navigation]);

  // Handle refresh button press
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchFriends(true); // Force refresh
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HTMLTitle>Friends</HTMLTitle>
      <ThemedView style={styles.container}>
        <SegmentedControl
          values={['My Friends', 'Search', 'Requests']}
          selectedIndex={activeTab === 'friends' ? 0 : activeTab === 'search' ? 1 : 2}
          onChange={(event) => {
            const selectedTab = event.nativeEvent.selectedSegmentIndex;
            setActiveTab(selectedTab === 0 ? 'friends' : selectedTab === 1 ? 'search' : 'requests');
          }}
          tintColor={tintColor}
          activeFontStyle={{ color: activeTextColor }} 
          fontStyle={{ color: colorScheme === 'dark' ? '#ECEDEE' : '#11181C' }}
          style={segmentedControlStyle}
          backgroundColor={colorScheme === 'dark' ? '#2A2D2E' : undefined}
        />

        {/* Only render the active tab, but maintain component instances */}
        {activeTab === 'friends' && friendsTabRef.current}
        {activeTab === 'search' && searchTabRef.current}
        {activeTab === 'requests' && requestsTabRef.current}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  segmentedControl: {
    marginBottom: 16,
  },
});
