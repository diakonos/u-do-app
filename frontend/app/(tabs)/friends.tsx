import { useState, useRef } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useThemeColor } from '@/hooks/useThemeColor';
import FriendsTab from '@/components/friends/FriendsTab';
import RequestsTab from '@/components/friends/RequestsTab';
import SearchTab from '@/components/friends/SearchTab';

type Tab = 'friends' | 'search' | 'requests';

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  
  // Using these refs to maintain component instances between tab switches
  const friendsTabRef = useRef(<FriendsTab />);
  const searchTabRef = useRef(<SearchTab />);
  const requestsTabRef = useRef(<RequestsTab />);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <SegmentedControl
          values={['My Friends', 'Search', 'Requests']}
          selectedIndex={activeTab === 'friends' ? 0 : activeTab === 'search' ? 1 : 2}
          onChange={(event) => {
            const selectedTab = event.nativeEvent.selectedSegmentIndex;
            setActiveTab(selectedTab === 0 ? 'friends' : selectedTab === 1 ? 'search' : 'requests');
          }}
          tintColor={useThemeColor({}, 'tint')}
          activeFontStyle={{ color: '#FFFFFF' }}
          fontStyle={{ color: '#000000' }}
          style={styles.segmentedControl}
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
