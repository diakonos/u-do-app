import { useState } from 'react';
import { StyleSheet, TextInput, Alert, View, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/lib/context/auth';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function CreateUsername() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUsername: updateUsername } = useAuth();
  const colorScheme = useColorScheme();
  
  // Get theme colors
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const whiteColor = useThemeColor({}, 'white');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');

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
          <ThemedText style={styles.title}>Create Username</ThemedText>
          <ThemedText style={styles.subtitle}>
            Please create a username for your account
          </ThemedText>

          <TextInput
            style={[
              styles.input,
              { 
                color: textColor,
                borderColor: iconColor,
                backgroundColor: inputBackgroundColor
              }
            ]}
            placeholder="Enter username"
            placeholderTextColor={iconColor}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: tintColor },
              loading && styles.buttonDisabled
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
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
