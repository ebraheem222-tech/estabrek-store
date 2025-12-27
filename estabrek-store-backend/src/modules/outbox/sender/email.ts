// Stub email sender – replace with real provider later (Nodemailer, SES, etc.)
export async function sendEmail(params: {
    to: string;
    template?: string | null;
    payload?: any;
  }) {
    // simulate sending
    console.log("[EMAIL] →", params.to, "template:", params.template, "payload:", params.payload);
    // return an id/reference if your provider gives one
    return { ok: true as const, providerId: "dev-email-123" };
  }
  