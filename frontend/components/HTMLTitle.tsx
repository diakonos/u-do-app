import Head from "expo-router/head";
import { PropsWithChildren } from "react";

export function HTMLTitle({ children }: PropsWithChildren) {
  return (
    <Head>
      <title>{children} - U Do</title>
    </Head>
  )
}