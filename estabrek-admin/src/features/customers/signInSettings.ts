// The shop's sign-in settings as the admin's cards read them (GoogleSignInCard, GameSignInCard; header.signIn).
import { env } from "../../config/env";

/** The shop's own address, as Google asks for it ("Authorized JavaScript origins"); Discord's redirect starts with it too. */
export const shopOrigin = () => {
  try {
    return new URL(env.VITE_STOREFRONT_BASE_URL).origin;
  } catch {
    return "https://…";
  }
};

/** A Discord application's id (a snowflake), as the server checks it. */
export const DISCORD_CLIENT = /^\d{15,22}$/;
/** The secret the server reads the Discord application's secret from (backend lib/socialSignIn.ts). */
export const DISCORD_SECRET = "DISCORD_CLIENT_SECRET";

export type GameSignIn = { discord: { enabled: boolean; clientId: string }; steam: { enabled: boolean } };
/** Discord's and Steam's settings (header.signIn.discord, header.signIn.steam), off unless saved on. */
export function gameSignInOf(header: unknown): GameSignIn {
  const s = (header as { signIn?: { discord?: { enabled?: unknown; clientId?: unknown }; steam?: { enabled?: unknown } } } | null)?.signIn;
  return {
    discord: { enabled: s?.discord?.enabled === true, clientId: typeof s?.discord?.clientId === "string" ? s.discord.clientId : "" },
    steam: { enabled: s?.steam?.enabled === true },
  };
}
