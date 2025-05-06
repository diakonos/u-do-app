import { useState, useEffect } from 'react';
import { StyleSheet, Alert, View, ScrollView, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/context/auth';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const { verifyOtp, resendOtp } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();

  // Get theme colors
  const tintColor = useThemeColor({}, 'tint');
  const whiteColor = useThemeColor({}, 'white');

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
    <ScrollView
      contentContainerStyle={styles.scrollViewContent}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.contentContainer}>
          <ThemedText style={styles.title}>
            <Text>Enter verification code</Text>
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            <Text>Enter the code we sent to {email}</Text>
          </ThemedText>

          <ThemedInput
            style={styles.input}
            placeholder="Enter verification code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            onSubmitEditing={handleVerify}
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: tintColor },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={loading || !otp}
          >
            <ThemedText style={[styles.buttonText, { color: whiteColor }]}>
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
            {resending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : 'Resend the OTP'}
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
  resendButton: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
  },
  resendText: {
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
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
