import { useState } from 'react';
import { StyleSheet, Alert, ScrollView, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/lib/context/auth';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/ThemedInput';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const tintColor = useThemeColor({}, 'tint');
  const whiteColor = useThemeColor({}, 'white');

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await signIn(email);
      router.push({
        pathname: '/verify-otp',
        params: { email },
      });
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
        <Stack.Screen options={{ title: 'Welcome to U Do' }} />

        <ThemedText style={styles.title}>
          <Text>Sign in</Text>
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          <Text>We&apos;ll send an OTP to your email to verify</Text>
        </ThemedText>

        <ThemedInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading || !email}
        >
          <ThemedText style={[styles.buttonText, { color: whiteColor }]}>
            {loading ? 'Sending...' : 'Continue with Email'}
          </ThemedText>
        </TouchableOpacity>
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
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
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
