import https from "node:https";
import querystring from "node:querystring";
import { env } from "../../../config/env.js";

function buildText(template?: string | null, payload?: any) {
  if (payload?.text) return String(payload.text);
  if (payload?.code) return `Your verification code is: ${payload.code}`;
  return `Notification from Estabrak Store`;
}

async function sendViaTwilio(to: string, body: string) {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_FROM ?? env.SMS_FROM;

  if (!sid || !token || !from) return { ok: false as const, error: "TWILIO_NOT_CONFIGURED" };

  const postData = querystring.stringify({ To: to, From: from, Body: body });

  const options: https.RequestOptions = {
    hostname: "api.twilio.com",
    path: `/2010-04-01/Accounts/${sid}/Messages.json`,
    method: "POST",
    auth: `${sid}:${token}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  return await new Promise<{ ok: true; providerId?: string } | { ok: false; error: string }>((resolve) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            return resolve({ ok: true, providerId: parsed?.sid });
          } catch {
            return resolve({ ok: true });
          }
        }
        return resolve({ ok: false, error: `twilio_${res.statusCode ?? "error"}` });
      });
    });

    req.on("error", () => resolve({ ok: false, error: "twilio_request_error" }));
    req.write(postData);
    req.end();
  });
}

// SMS sender:
// - By default: logs to console (dev).
// - If TWILIO env vars are provided: sends real SMS via Twilio REST API.
export async function sendSms(params: { to: string; template?: string | null; payload?: any }) {
  const body = buildText(params.template, params.payload);

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_FROM || env.SMS_FROM)) {
    const out = await sendViaTwilio(params.to, body);
    if (out.ok) return { ok: true as const, providerId: out.providerId ?? "twilio" };
    // fallback to console in case of failure in dev
    console.warn("[SMS] Twilio failed:", out);
  }

  console.log("[SMS] →", params.to, "template:", params.template, "payload:", params.payload, "text:", body);
  return { ok: true as const, providerId: "dev-sms-123" };
}
