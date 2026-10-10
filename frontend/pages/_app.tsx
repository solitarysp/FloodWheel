import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>FloodWheel — Đo độ sâu ngập lụt đô thị thời gian thực</title>
        <meta name="description" content="Đo độ sâu ngập lụt đô thị theo thời gian thực từ Camera giao thông bằng Gemini Vision AI (VLRDR)" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
