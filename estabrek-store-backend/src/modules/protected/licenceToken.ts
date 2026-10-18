/**
 * Signed licences (phase 4): the launcher on the buyer's PC keeps one per
 * activation and checks it offline. ECDSA P-256 with SHA-256, the signature in
 * the plain r||s form (what .NET's ECDsa.VerifyData expects, so the Windows
 * launcher needs no extra library). No settings read here: the vault and the
 * backend both use it.
 *
 * Token: "v1.<kid>.<payload>.<signature>" (base64url), payload = JSON.
 */
import crypto from "node:crypto";

export type PublicKeyInfo = { kid: string; x: string; y: string };
export type SigningKey = { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject; info: PublicKeyInfo };

const b64u = (b: Buffer) => b.toString("base64url");

function infoOf(publicKey: crypto.KeyObject): PublicKeyInfo {
  const jwk = publicKey.export({ format: "jwk" }) as { x: string; y: string };
  const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]);
  return { kid: crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16), x: jwk.x, y: jwk.y };
}

export function keyFromPrivate(privateKey: crypto.KeyObject): SigningKey {
  const publicKey = crypto.createPublicKey(privateKey);
  return { privateKey, publicKey, info: infoOf(publicKey) };
}

/** A key made from a secret (the same secret always gives the same key). */
export function keyFromSeed(seed: string): SigningKey {
  const n = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
  let d = BigInt("0x" + crypto.createHash("sha256").update(`estabrek/licence-key:${seed}`).digest("hex")) % (n - 1n);
  d += 1n;
  const dBuf = Buffer.from(d.toString(16).padStart(64, "0"), "hex");
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.setPrivateKey(dBuf);
  const pub = ecdh.getPublicKey();
  const privateKey = crypto.createPrivateKey({ key: { kty: "EC", crv: "P-256", d: b64u(dBuf), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: "jwk" });
  return keyFromPrivate(privateKey);
}

export function newSigningKey(): SigningKey {
  const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return keyFromPrivate(privateKey);
}

export const keyToPem = (k: SigningKey) => k.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
export const keyFromPem = (pem: string) => keyFromPrivate(crypto.createPrivateKey(pem));

export function signToken(payload: Record<string, unknown>, key: SigningKey) {
  const body = b64u(Buffer.from(JSON.stringify(payload), "utf8"));
  const head = `v1.${key.info.kid}.${body}`;
  const sig = crypto.sign("sha256", Buffer.from(head, "utf8"), { key: key.privateKey, dsaEncoding: "ieee-p1363" });
  return `${head}.${b64u(sig)}`;
}

/** The payload when the token is whole and signed by one of these keys; null otherwise. */
export function verifyToken<T = Record<string, unknown>>(token: string, keys: PublicKeyInfo[]): T | null {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const k = keys.find((x) => x.kid === parts[1]);
  if (!k) return null;
  try {
    const pub = crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: k.x, y: k.y }, format: "jwk" });
    const ok = crypto.verify("sha256", Buffer.from(parts.slice(0, 3).join("."), "utf8"), { key: pub, dsaEncoding: "ieee-p1363" }, Buffer.from(parts[3], "base64url"));
    return ok ? (JSON.parse(Buffer.from(parts[2], "base64url").toString("utf8")) as T) : null;
  } catch {
    return null;
  }
}

/** The licence a launcher holds: one serial, one PC. */
export type LicencePayload = {
  v: 1;
  /** Licence id, activation id, product. */
  lic: string;
  act: string;
  prod: string;
  title: string;
  /** The buyer's mark (estb:…) and the PC's fingerprint hash. */
  mark: string;
  dev: string;
  /** Issued, and when the launcher must check online again (seconds). */
  iat: number;
  chk: number;
};
