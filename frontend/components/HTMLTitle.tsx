import Head from 'expo-router/head';
import { PropsWithChildren } from 'react';
import { Platform } from 'react-native';

export function HTMLTitle({ children }: PropsWithChildren) {
  if (Platform.OS !== 'web') return null;
  return (
    <Head>
      {/* eslint-disable-next-line react-native/no-raw-text */}
      <title>{`${children} - U Do`}</title>
    </Head>
  );
}
