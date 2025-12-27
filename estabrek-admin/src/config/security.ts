// src/config/security.ts
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { authenticator } from "otplib";
import { env } from "./env.js";

export type JwtPayloadBase = { sub: string; role?: "SUPERADMIN"; email?: string };

// --- JWT helpers ---
export function signAccessToken(payload: JwtPayloadBase, opts?: Partial<SignOptions>) {
  const secret: Secret = env.JWT_SECRET;                       // typed secret
  const options: SignOptions = { algorithm: "HS256", expiresIn: "15m", ...opts };
  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken<T extends JwtPayloadBase = JwtPayloadBase>(token: string): T {
  const secret: Secret = env.JWT_SECRET;
  return jwt.verify(token, secret) as T;
}

// --- TOTP (2FA) helpers ---
export function createTotpSecret() {
  // returns a base32 secret string
  return authenticator.generateSecret();
}

/**
 * Build an otpauth URI you can show as a QR in apps like Google Authenticator.
 * @param secret base32 secret
 * @param label  account label (usually the email)
 * @param issuer app/brand name
 */
export function totpURI({ secret, label, issuer }: { secret: string; label: string; issuer: string }) {
  // authenticator.keyuri(accountName, issuer, secretBase32)
  return authenticator.keyuri(label, issuer, secret);
}

export function verifyTotp({ secret, token }: { secret: string; token: string }) {
  return authenticator.verify({ secret, token });
}
