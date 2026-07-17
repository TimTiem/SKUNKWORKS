/**
 * Voice/Siri personal access tokens. The RAW token is shown to the user exactly
 * ONCE (to paste into an iOS Shortcut) and never stored anywhere — only its
 * SHA-256 hash reaches the server (public.api_tokens). The Edge Function hashes
 * the incoming bearer token the same way and matches on the hash, so the raw
 * value lives only in the user's Shortcut.
 */

/** URL-safe (base64url, unpadded) random token — 32 bytes of entropy. */
export function generateToken(bytes = 32): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  let bin = ''
  for (const b of buf) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Lowercase hex SHA-256 — must match the Edge Function's sha256Hex exactly. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The endpoint an iOS Shortcut POSTs to, derived from the Supabase project URL. */
export function siriEndpoint(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/siri`
}
