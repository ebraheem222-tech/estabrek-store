import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encryptPush, makePushKeys, pushEndpointOk, pushKeysOk, sendPush, vapidAuth } from "../lib/webPush.js";

const unb64 = (s: string) => Buffer.from(s, "base64url");

/** RFC 8291, Appendix A: the standard's own example, value for value. */
const RFC = {
  plaintext: "V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  uaPrivate: "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  header: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  ciphertext: "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ",
  message:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

/** The browser's side, written apart from the sending side: what a phone does with a message. */
function decryptAsBrowser(message: Buffer, uaPrivate: Buffer, auth: Buffer): Buffer {
  const salt = message.subarray(0, 16);
  const idLen = message[20];
  const asPublic = message.subarray(21, 21 + idLen);
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.setPrivateKey(uaPrivate);
  const uaPublic = ecdh.getPublicKey();
  const secret = ecdh.computeSecret(asPublic);
  const prkKey = crypto.createHmac("sha256", auth).update(secret).digest();
  const ikm = crypto.createHmac("sha256", prkKey).update(Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic, Buffer.from([1])])).digest();
  const prk = crypto.createHmac("sha256", salt).update(ikm).digest();
  const cek = crypto.createHmac("sha256", prk).update(Buffer.concat([Buffer.from("Content-Encoding: aes128gcm\0"), Buffer.from([1])])).digest().subarray(0, 16);
  const nonce = crypto.createHmac("sha256", prk).update(Buffer.concat([Buffer.from("Content-Encoding: nonce\0"), Buffer.from([1])])).digest().subarray(0, 12);
  const body = message.subarray(21 + idLen);
  const d = crypto.createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(body.subarray(body.length - 16));
  const plain = Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]);
  expect(plain[plain.length - 1]).toBe(2);
  return plain.subarray(0, plain.length - 1);
}

afterEach(() => vi.unstubAllGlobals());

describe("web push, by the standards", () => {
  it("encrypts the RFC 8291 example to the very bytes the standard prints", () => {
    const out = encryptPush(unb64(RFC.plaintext), { p256dh: RFC.uaPublic, auth: RFC.auth }, { salt: unb64(RFC.salt), serverPrivate: unb64(RFC.asPrivate) });
    expect(out.subarray(0, 86).equals(unb64(RFC.header))).toBe(true);
    expect(out.subarray(86).equals(unb64(RFC.ciphertext))).toBe(true);
    expect(out.equals(unb64(RFC.message))).toBe(true);
    expect(decryptAsBrowser(out, unb64(RFC.uaPrivate), unb64(RFC.auth)).toString()).toBe("When I grow up, I want to be a watermelon");
  });

  it("a fresh key and salt each time, and a phone opens every one", () => {
    const phone = crypto.createECDH("prime256v1");
    phone.generateKeys();
    const auth = crypto.randomBytes(16);
    const target = { p256dh: phone.getPublicKey().toString("base64url"), auth: auth.toString("base64url") };
    const words = Buffer.from(JSON.stringify({ title: "وصل طلبك", body: "Your order is on its way · ההזמנה בדרך" }));
    const a = encryptPush(words, target);
    const b = encryptPush(words, target);
    expect(a.equals(b)).toBe(false);
    expect(decryptAsBrowser(a, phone.getPrivateKey(), auth).equals(words)).toBe(true);
    expect(decryptAsBrowser(b, phone.getPrivateKey(), auth).equals(words)).toBe(true);
    expect(() => encryptPush(Buffer.alloc(5000), target)).toThrow("PUSH_TOO_LONG");
  });

  it("signs who the shop is (VAPID) for the push service's own origin, and the signature checks", () => {
    const keys = makePushKeys();
    expect(unb64(keys.publicKey)).toHaveLength(65);
    expect(unb64(keys.privateKey)).toHaveLength(32);
    const now = Date.UTC(2026, 10, 18, 12);
    const header = vapidAuth("https://fcm.googleapis.com/fcm/send/abc:def", keys, "mailto:shop@example.com", now);
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
    expect(m).not.toBeNull();
    const [, head, claims, sig, k] = m!;
    expect(k).toBe(keys.publicKey);
    expect(JSON.parse(unb64(head).toString())).toEqual({ typ: "JWT", alg: "ES256" });
    expect(JSON.parse(unb64(claims).toString())).toEqual({ aud: "https://fcm.googleapis.com", exp: now / 1000 + 12 * 3600, sub: "mailto:shop@example.com" });
    const point = unb64(keys.publicKey);
    const pub = crypto.createPublicKey({ key: { kty: "EC", crv: "P-256", x: point.subarray(1, 33).toString("base64url"), y: point.subarray(33).toString("base64url") }, format: "jwk" });
    expect(unb64(sig)).toHaveLength(64);
    expect(crypto.verify("sha256", Buffer.from(`${head}.${claims}`), { key: pub, dsaEncoding: "ieee-p1363" }, unb64(sig))).toBe(true);
  });

  it("only the push services' own sites are ever called", () => {
    for (const ok of ["https://fcm.googleapis.com/fcm/send/x", "https://web.push.apple.com/QG3", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://wns2-par02p.notify.windows.com/w/?token=x"]) expect(pushEndpointOk(ok), ok).toBe(true);
    for (const no of ["http://fcm.googleapis.com/fcm/send/x", "https://fcm.googleapis.com.evil.test/x", "https://evil.test/fcm.googleapis.com", "https://push.apple.com.evil.test/", "https://127.0.0.1/x", "https://user:pw@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x", "not a url"])
      expect(pushEndpointOk(no), no).toBe(false);
  });

  it("a browser's keys are checked: a point on the curve and a 16-byte secret", () => {
    const phone = crypto.createECDH("prime256v1");
    phone.generateKeys();
    const p256dh = phone.getPublicKey().toString("base64url");
    const auth = crypto.randomBytes(16).toString("base64url");
    expect(pushKeysOk(p256dh, auth)).toBe(true);
    expect(pushKeysOk(p256dh, crypto.randomBytes(8).toString("base64url"))).toBe(false);
    expect(pushKeysOk(Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url"), auth)).toBe(false);
    expect(pushKeysOk("not+base64url!", auth)).toBe(false);
  });

  it("a send: the push service's answer says sent, gone, try again or refused", async () => {
    const phone = crypto.createECDH("prime256v1");
    phone.generateKeys();
    const auth = crypto.randomBytes(16);
    const target = { endpoint: "https://fcm.googleapis.com/fcm/send/one", p256dh: phone.getPublicKey().toString("base64url"), auth: auth.toString("base64url") };
    const keys = makePushKeys();
    const seen: Array<{ url: string; headers: Record<string, string>; body: Buffer }> = [];
    let answer = 201;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen.push({ url, headers: init.headers as Record<string, string>, body: Buffer.from(init.body as Uint8Array) });
      return new Response(answer === 201 ? null : "no", { status: answer });
    });
    expect((await sendPush(target, { title: "مرحبا" }, keys, "mailto:shop@example.com", { topic: "order:42!" })).result).toBe("sent");
    expect(seen[0].url).toBe(target.endpoint);
    expect(seen[0].headers).toMatchObject({ "Content-Encoding": "aes128gcm", TTL: String(4 * 24 * 3600), Urgency: "normal", Topic: "order42" });
    expect(seen[0].headers.Authorization).toMatch(/^vapid t=.+, k=/);
    expect(JSON.parse(decryptAsBrowser(seen[0].body, phone.getPrivateKey(), auth).toString())).toEqual({ title: "مرحبا" });
    for (const [status, result] of [[410, "gone"], [404, "gone"], [429, "retry"], [503, "retry"], [403, "failed"], [413, "failed"]] as const) {
      answer = status;
      expect((await sendPush(target, { title: "x" }, keys, "mailto:shop@example.com")).result, String(status)).toBe(result);
    }
    vi.stubGlobal("fetch", async () => {
      throw new Error("ECONNRESET");
    });
    expect((await sendPush(target, { title: "x" }, keys, "mailto:shop@example.com")).result).toBe("retry");
    // An endpoint that isn't a push service's is never called.
    const calls = seen.length;
    expect((await sendPush({ ...target, endpoint: "https://evil.test/x" }, { title: "x" }, keys, "mailto:shop@example.com")).result).toBe("gone");
    expect(seen.length).toBe(calls);
  });
});
