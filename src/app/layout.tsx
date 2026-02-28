import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PomoPals - Pomodoro Timer with Friends",
  description: "A collaborative Pomodoro timer. Focus together, track your progress, and stay productive.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-57px)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
