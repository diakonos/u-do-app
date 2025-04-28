import { useState } from 'react';
import { StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedInput } from '@/components/ThemedInput';
import { useFriends, UserSearchResult } from '@/lib/context/friends';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SearchTab() {
  const [username, setUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const { sendFriendRequest, searchUsers } = useFriends();
  
  const colorScheme = useColorScheme() ?? "light";

  const handleSearchUser = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(username.trim());
      setSearchResults(results);
      if (results.length === 0) {
        Alert.alert('No Results', 'No users found with that username');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to search for users');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    setIsSearching(true);
    try {
      await sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent successfully!');
      // Remove the user from search results to prevent sending multiple requests
      setSearchResults(prev => prev.filter(user => user.user_id !== userId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Find a friend</ThemedText>
      <ThemedText style={styles.subtitle}>
        Search for users by username
      </ThemedText>

      <ThemedView style={styles.inputContainer}>
        <ThemedInput
          style={styles.input}
          placeholder="Enter username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          lightBorderColor={Colors.light.icon}
          darkBorderColor={Colors.dark.icon}
        />
      </ThemedView>

      <ThemedView 
        style={[
          styles.button, 
          { opacity: isSearching || !username.trim() ? 0.7 : 1, backgroundColor: Colors[colorScheme].brand }
        ]}
        onTouchStart={!isSearching ? handleSearchUser : undefined}
      >
        {isSearching ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.buttonText}>Search</ThemedText>
        )}
      </ThemedView>

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          renderItem={({ item }) => (
            <ThemedView style={styles.resultItem}>
              <ThemedView style={styles.userInfo}>
                <ThemedText style={styles.username}>{item.username}</ThemedText>
                <ThemedText style={styles.email}>{item.email}</ThemedText>
              </ThemedView>
              <ThemedView 
                style={[styles.addButton, { backgroundColor: Colors[colorScheme].tint }]}
                onTouchStart={() => handleSendFriendRequest(item.user_id)}
              >
                <ThemedText style={styles.addButtonText}>Add</ThemedText>
              </ThemedView>
            </ThemedView>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 48,
    padding: 12,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});