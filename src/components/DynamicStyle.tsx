"use client";
import { useNonce } from "@/lib/nonce-context";

// Renders a nonce-authenticated <style> block for dynamic CSS values.
// Use this instead of style={{ }} attributes to stay CSP-compliant.
export function DynamicStyle({ css }: { css: string }) {
  const nonce = useNonce();
  return <style nonce={nonce} dangerouslySetInnerHTML={{ __html: css }} />;
}
