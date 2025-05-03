import { useState } from 'react';
import { StyleSheet, Alert, ActivityIndicator, FlatList, Text } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { useFriends, UserSearchResult } from '@/lib/context/friends';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Define a proper error type to replace 'any'
interface ApiError {
  message: string;
}

export default function SearchTab() {
  const [username, setUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const { sendFriendRequest, searchUsers } = useFriends();

  const colorScheme = useColorScheme() ?? 'light';

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
    } catch (error: unknown) {
      const apiError = error as ApiError;
      Alert.alert('Error', apiError.message || 'Failed to search for users');
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
    } catch (error: unknown) {
      const apiError = error as ApiError;
      Alert.alert('Error', apiError.message || 'Failed to send friend request');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>
        <Text>Find a friend</Text>
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        <Text>Search for users by username</Text>
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
          {
            backgroundColor: Colors[colorScheme].brand,
          },
          isSearching || !username.trim() ? styles.buttonSearching : styles.buttonNotSearching,
        ]}
        onTouchStart={!isSearching ? handleSearchUser : undefined}
      >
        {isSearching ? (
          <ActivityIndicator size="small" color={Colors.light.white} />
        ) : (
          <ThemedText style={styles.buttonText}>
            <Text>Search</Text>
          </ThemedText>
        )}
      </ThemedView>

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.id}
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
                <ThemedText style={styles.addButtonText}>
                  <Text>Add</Text>
                </ThemedText>
              </ThemedView>
            </ThemedView>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  addButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: Colors.light.white,
    fontWeight: '500',
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonNotSearching: { opacity: 1 },
  buttonSearching: { opacity: 0.7 },
  buttonText: {
    color: Colors.light.white,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  email: {
    color: Colors.light.secondaryText,
    fontSize: 14,
  },
  input: {
    height: 48,
    padding: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  resultItem: {
    alignItems: 'center',
    borderColor: Colors.light.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 12,
  },
  resultsList: {
    flex: 1,
  },
  subtitle: {
    color: Colors.light.secondaryText,
    fontSize: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
});
