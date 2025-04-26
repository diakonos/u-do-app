import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/lib/context/auth';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const { verifyOtp, resendOtp } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    try {
      setResending(true);
      await resendOtp(email);
      setCooldown(60);
      Alert.alert('Success', 'A new OTP has been sent to your email');
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      await verifyOtp(email, otp);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.contentContainer}>
        <ThemedText style={styles.title}>Enter verification code</ThemedText>
        <ThemedText style={styles.subtitle}>
          Enter the code we sent to {email}
        </ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Enter verification code"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || !otp}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? 'Verifying...' : 'Verify'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.resendButton, (cooldown > 0 || resending) && styles.buttonDisabled]}
        onPress={handleResend}
        disabled={cooldown > 0 || resending}
      >
        <ThemedText style={styles.resendText}>
          {resending ? 'Sending...' : 
           cooldown > 0 ? `Resend OTP in ${cooldown}s` : 
           "Resend the OTP"}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#6936D8',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 16,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});