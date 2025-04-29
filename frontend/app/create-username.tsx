import { useState } from 'react';
import { StyleSheet, Alert, View, ScrollView, Text } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/lib/context/auth';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/ThemedInput';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function CreateUsername() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUsername: updateUsername } = useAuth();

  // Get theme colors
  const tintColor = useThemeColor({}, 'tint');
  const whiteColor = useThemeColor({}, 'white');

  const handleSetUsername = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    try {
      setLoading(true);
      await updateUsername(username.trim());
      // AuthProvider will handle navigation via _layout.tsx
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContent}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.contentContainer}>
          <ThemedText style={styles.title}>
            <Text>Create Username</Text>
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            <Text>Please create a username for your account</Text>
          </ThemedText>

          <ThemedInput
            style={styles.input}
            placeholder="Enter username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: tintColor },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSetUsername}
            disabled={loading || !username.trim()}
          >
            <ThemedText style={[styles.buttonText, { color: whiteColor }]}>
              {loading ? 'Setting username...' : 'Continue'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 15,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 20,
    width: '100%',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
