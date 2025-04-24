import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, FlatList, SafeAreaView } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabase';

interface SearchResult {
  id: string;
  email: string;
  username: string;
}

export default function FriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchResults([]); // Reset results before new search
      setIsLoading(true);
      setHasSearched(true);
      setLastSearchedQuery(searchQuery);
      const { data, error } = await supabase.functions.invoke('search-users', {
        body: { query: searchQuery }
      });

      if (error) {
        console.error('Supabase Edge Function Error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          name: error.name,
          details: error.details,
          context: error?.context,
        });
        throw error;
      }
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: SearchResult }) => (
    <ThemedView style={styles.userItem}>
      <ThemedText style={styles.username}>{item.username}</ThemedText>
      <ThemedText style={styles.email}>{item.email}</ThemedText>
      <TouchableOpacity style={styles.addButton}>
        <ThemedText style={styles.addButtonText}>Add Friend</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  const renderEmptyState = () => {
    if (!hasSearched || isLoading) return null; // Don't show if not searched yet or still loading
    
    return (
      <ThemedView style={styles.emptyState}>
        <ThemedText style={styles.emptyStateText}>
          No users found matching "{lastSearchedQuery}"
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>Friends</ThemedText>
        
        <ThemedView style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email or username"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchUsers}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false} // Disable autocorrect
          />
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={searchUsers}
            disabled={isLoading || !searchQuery.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.searchButtonText}>Search</ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>

        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          contentContainerStyle={[
            styles.resultsContent,
            searchResults.length === 0 && styles.emptyListContent
          ]}
          ListEmptyComponent={renderEmptyState}
        />
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
  title: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#6936D8',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    gap: 12,
    paddingTop: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  userItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#6936D8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
