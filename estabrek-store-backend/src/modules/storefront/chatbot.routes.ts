import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { ChatbotMessageBody } from "../chatbot/chatbot.schemas.js";
import { generateChatbotReply } from "../chatbot/chatbot.service.js";
import { agentReply, type AgentPersona } from "../chatbot/agent.service.js";
import { AGENT_HISTORY, type AgentTurn } from "../chatbot/agent.js";
import { aiReadyFor } from "../ai/ai.client.js";
import { needPublicFeature } from "../ai/ai.guard.js";
import { aiOf } from "../ai/ai.settings.js";

const r = Router();

type Stored = { role: "user" | "assistant"; content: string; at: string; mode?: string; miss?: boolean };

const turnsOf = (messages: unknown): AgentTurn[] =>
  (Array.isArray(messages) ? (messages as Stored[]) : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .slice(-AGENT_HISTORY)
    .map((m) => ({ role: m.role, content: m.content }));

/**
 * POST /v1/storefront/chatbot/message
 * Body: { conversationId?, sessionId?, locale?, message, pageUrl?, persona? }
 *
 * With the AI switch «مساعد المتجر الذكي» on (and the key there), the smart assistant answers
 * (agent.service.ts): it remembers the talk, shows the shop's pieces and can hand over to WhatsApp.
 * Otherwise, or when it's resting (the daily ceiling, too many questions from one place) or fails,
 * the owner's answers reply as before.
 */
r.post("/message", validate({ body: ChatbotMessageBody }), asyncHandler(async (req, res) => {
  const body = req.body as {
    conversationId?: string; sessionId?: string; locale?: "ar" | "he" | "en"; message: string; pageUrl?: string;
    persona?: AgentPersona;
  };
  const locale = body.locale ?? "ar";
  const message = String(body.message ?? "").trim();
  const conversationId = body.conversationId ? String(body.conversationId).trim() : null;
  const sessionId = body.sessionId ? String(body.sessionId).trim() : null;
  const pageUrl = body.pageUrl ? String(body.pageUrl).trim() : null;

  const now = new Date();
  const userMsg: Stored = { role: "user", content: message, at: now.toISOString() };

  const ip = req.ip ? String(req.ip) : null;
  const userAgent = req.get("user-agent") ? String(req.get("user-agent")) : null;

  let convo = conversationId ? await prisma.chatbotConversation.findUnique({ where: { id: conversationId } }) : null;
  // Someone else's conversation (another device's id) is never read or added to: a new one starts.
  if (convo && convo.sessionId && convo.sessionId !== sessionId) convo = null;

  let agent: Awaited<ReturnType<typeof agentReply>> | null = null;
  let resting = false;
  const settings = await prisma.siteSettings.findFirst({ select: { header: true } });
  if (aiOf(settings?.header).shopAgent && aiReadyFor("shopAgent", settings?.header)) {
    try {
      await needPublicFeature("shopAgent", ip);
      agent = await agentReply({ locale, message, history: turnsOf(convo?.messages), pageUrl, persona: body.persona ?? null });
    } catch (e) {
      // Resting for today or the model didn't answer: the owner's answers only (no other model call).
      resting = true;
      console.warn("[chatbot] smart assistant not used:", (e as Error)?.message?.slice(0, 200));
    }
  }
  const reply = agent
    ? { answer: agent.answer, mode: "agent" as const, sources: [], products: agent.products }
    : await generateChatbotReply({ locale, message, noModel: resting });

  const assistantMsg: Stored = {
    role: "assistant",
    content: reply.answer,
    at: new Date().toISOString(),
    mode: reply.mode,
    ...(agent?.missed || (!agent && reply.mode === "fallback") ? { miss: true } : {}),
  };
  const extra = { suggestions: agent?.suggestions ?? [], handoff: agent?.handoff ?? null };

  if (!convo) {
    const created = await prisma.chatbotConversation.create({
      data: {
        sessionId: sessionId ?? undefined,
        source: "storefront",
        status: "OPEN",
        messages: [userMsg, assistantMsg] as any,
        lastMessage: reply.answer.slice(0, 800),
        lastRole: "assistant",
        lastAt: new Date(),
        pageUrl: pageUrl ?? undefined,
        ip: ip ?? undefined,
        userAgent: userAgent ?? undefined,
      },
    });

    return res.json({
      ok: true,
      conversationId: created.id,
      reply: reply.answer,
      mode: reply.mode,
      sources: reply.sources,
      products: reply.products ?? [],
      ...extra,
    });
  }

  const prevMessages = Array.isArray(convo.messages) ? convo.messages : [];
  const nextMessages = [...prevMessages, userMsg, assistantMsg].slice(-60);

  const updated = await prisma.chatbotConversation.update({
    where: { id: convo.id },
    data: {
      sessionId: convo.sessionId ?? sessionId ?? undefined,
      messages: nextMessages as any,
      lastMessage: reply.answer.slice(0, 800),
      lastRole: "assistant",
      lastAt: new Date(),
      pageUrl: pageUrl ?? convo.pageUrl ?? undefined,
      ip: ip ?? convo.ip ?? undefined,
      userAgent: userAgent ?? convo.userAgent ?? undefined,
    },
  });

  res.json({
    ok: true,
    conversationId: updated.id,
    reply: reply.answer,
    mode: reply.mode,
    sources: reply.sources,
    products: reply.products ?? [],
    ...extra,
  });
}));

export default r;
