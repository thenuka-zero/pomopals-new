import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import AchievementToastContainer from "@/components/AchievementToastContainer";
import { auth } from "@/lib/auth";
import { GoogleAnalytics } from "@next/third-parties/google";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "PomoPals — Pomodoro Timer with Friends! 🍅",
  description: "A cute collaborative Pomodoro timer. Focus together, track your progress, and stay productive with friends.",
  icons: {
    icon: "/favicon.svg",
  },
  verification: {
    google: "yd_HMKEubj5ni_kIKgQpKXGznjWs60i1LcpoZfd1920",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers session={session} nonce={nonce ?? ""}>
          <Navbar />
          <main>{children}</main>
          <AchievementToastContainer />
        </Providers>
      </body>
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} nonce={nonce} />
      )}
    </html>
  );
}
