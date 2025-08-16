import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import { useQuery } from 'convex/react';
import { api } from '../../backend/convex/_generated/api';
import { Id } from '../../backend/convex/_generated/dataModel';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_URL!.replace('.cloud', '.site'),
  plugins: [
    convexClient(),
    crossDomainClient(),
    emailOTPClient(),
    expoClient({
      scheme: 'udo',
      storagePrefix: 'udo',
      storage: SecureStore,
    }),
  ],
});

export const { signIn, signUp, useSession, signOut } = authClient;

// Helpers for Email OTP flow (Better Auth email-otp plugin)
export async function requestEmailOtp(email: string) {
  // The email-otp plugin adds an emailOTP sign-in method on the client
  return authClient.emailOtp.sendVerificationOtp({
    email,
    type: 'sign-in',
  });
}

export async function verifyEmailOtp(email: string, otp: string) {
  // Verifies the OTP and establishes a session
  return authClient.signIn.emailOtp({ email, otp });
}

export function useCurrentUserId() {
  const { data: session } = useSession();
  const userId = session?.user.id || null;
  return userId as Id<'users'> | null;
}

export function useCurrentUserUsername(): [string | undefined | null, boolean] {
  const { data, isPending } = useSession();
  const username = useQuery(api.users.getCurrentUsername, !isPending && data?.user ? {} : 'skip');
  return [username, username === undefined];
}
