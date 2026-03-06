"use client";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { NonceProvider } from "@/lib/nonce-context";

export default function Providers({
  children,
  session,
  nonce,
}: {
  children: React.ReactNode;
  session: Session | null;
  nonce: string;
}) {
  return (
    <NonceProvider nonce={nonce}>
      <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
        {children}
      </SessionProvider>
    </NonceProvider>
  );
}
