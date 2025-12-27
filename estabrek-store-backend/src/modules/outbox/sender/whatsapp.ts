// Stub WhatsApp sender – integrate WhatsApp Business API provider later
export async function sendWhatsapp(params: {
    to: string;
    template?: string | null;
    payload?: any;
  }) {
    console.log("[WHATSAPP] →", params.to, "template:", params.template, "payload:", params.payload);
    return { ok: true as const, providerId: "dev-wa-123" };
  }
  