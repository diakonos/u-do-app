import Head from "expo-router/head";
import { PropsWithChildren } from "react";
import { Platform } from "react-native";

export function HTMLTitle({ children }: PropsWithChildren) {
  if (Platform.OS !== 'web') return null;
  return (
    <Head>
      <title>{children} - U Do</title>
    </Head>
  )
}