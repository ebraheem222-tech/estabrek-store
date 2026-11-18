/**
 * Signing in with Google, as the shop reads the owner's settings (header.signIn.google; the backend's
 * lib/googleSignIn.ts reads them the same way and checks Google's token). Pure.
 */
/** A Google OAuth web client's ID: "1234567890-abc123.apps.googleusercontent.com". */
const CLIENT_ID = /^[0-9]{6,30}-[a-z0-9]{8,64}\.apps\.googleusercontent\.com$/;

/** The client ID to show Google's button with, or null while it is off (or isn't one). */
export function googleClientId(header: unknown): string | null {
  const g = (header as { signIn?: { google?: { enabled?: unknown; clientId?: unknown } } } | null)?.signIn?.google;
  const id = typeof g?.clientId === "string" ? g.clientId.trim() : "";
  return g?.enabled === true && CLIENT_ID.test(id) ? id : null;
}
