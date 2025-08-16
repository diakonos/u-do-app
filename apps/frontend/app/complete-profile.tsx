import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useConvex, useMutation } from 'convex/react';
import Text from '@/components/Text';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import ScreenTitle from '@/components/ScreenTitle';
import { formatErrorMessage } from '@/lib/error';
import { baseTheme, useTheme } from '@/lib/theme';
import { api } from '../../backend/convex/_generated/api';

export default function CompleteProfileScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const theme = useTheme();
  const convex = useConvex();
  const updateProfile = useMutation(api.users.updateUsername);

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Check if username is taken
      const available = await convex.query(api.users.isUsernameAvailable, { username });
      if (!available) {
        setError('That username is already taken.');
        setLoading(false);
        return;
      }
      // Update user profile
      await updateProfile({ username });
      router.push('/(tabs)/tasks');
    } catch (e) {
      setError(formatErrorMessage(e, 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenTitle>Set username</ScreenTitle>
      <View style={styles.container}>
        <Text style={styles.description}>Add a username so friends can find you!</Text>
        <Input
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {error ? <Text style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
        <Button
          title={loading ? 'Saving...' : 'Save'}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    flexGrow: 0,
    marginTop: 8,
  },
  container: {
    paddingHorizontal: baseTheme.margin[3],
  },
  description: {
    marginBottom: 16,
    marginTop: 8,
  },
  error: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
    marginTop: 8,
  },
});
