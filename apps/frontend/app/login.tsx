import React, { useState, useRef } from 'react';
import { View, StyleSheet, Keyboard, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { baseTheme, useTheme } from '@/lib/theme';
import Text from '@/components/Text';
import Input from '@/components/Input';
import Button from '@/components/Button';

export default function LoginScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start resend timer
  const startTimer = () => {
    setResendTimer(60);
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) {
          timerRef.current && clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  // Send OTP
  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setStep('code');
      startTimer();
      Keyboard.dismiss();
    } catch (e: any) {
      setError(e.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
      // User is now logged in
      // ...navigate or update state as needed...
    } catch (e: any) {
      setError(e.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setCode('');
    await handleSendCode();
  };

  // Cancel login
  const handleCancel = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setError('');
    setLoading(false);
    setResendTimer(0);
    timerRef.current && clearInterval(timerRef.current);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text weight="semibold" style={styles.title} size="large">
        Sign in to U Do
      </Text>
      <Text style={styles.subtitle}>No passwords!</Text>
      <Text style={styles.body}>
        Just enter your email address and we’ll email you a one time code to log in.
      </Text>
      {step === 'email' ? (
        <>
          <Text style={styles.label}>Enter your email address:</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            editable={!loading}
            onSubmitEditing={handleSendCode}
            returnKeyType="done"
          />
          <Button
            title="Send one time code"
            onPress={handleSendCode}
            disabled={!email || loading}
            loading={loading}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Enter the one time code:</Text>
          <Input
            value={code}
            onChangeText={setCode}
            placeholder="One time code"
            keyboardType="number-pad"
            style={styles.input}
            editable={!loading}
            onSubmitEditing={handleVerifyCode}
            returnKeyType="done"
          />
          <Button
            title="Log in"
            onPress={handleVerifyCode}
            disabled={!code || loading}
            loading={loading}
          />
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendTimer > 0}
            style={{ marginTop: 8 }}
          >
            <Text style={[styles.resend, { color: theme.disabled }]}>
              Resend the code {resendTimer > 0 ? `(${resendTimer}s)` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCancel} style={{ marginTop: 16 }}>
            <Text style={[styles.cancel, { color: theme.error }]}>Cancel log in</Text>
          </TouchableOpacity>
        </>
      )}
      {!!error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: 24,
  },
  cancel: {
    textAlign: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  error: {
    marginTop: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginBottom: baseTheme.margin[1],
    marginTop: 12,
  },
  resend: {
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: baseTheme.margin[4],
  },
  title: {
    fontWeight: 'bold',
    marginBottom: baseTheme.margin[4],
  },
});
