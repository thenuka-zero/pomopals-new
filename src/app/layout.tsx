import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PomoPals - Pomodoro Timer with Friends",
  description: "A cute collaborative Pomodoro timer. Focus together, track your progress, and stay productive with friends.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" style={{ colorScheme: "light", backgroundColor: "#FDF6EC" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ backgroundColor: "#FDF6EC", color: "#3D2C2C" }}>
        <Providers session={session}>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
