import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { ChatbotMessageBody } from "../chatbot/chatbot.schemas.js";
import { generateChatbotReply } from "../chatbot/chatbot.service.js";

const r = Router();

/**
 * POST /v1/storefront/chatbot/message
 * Body: { conversationId?, sessionId?, locale?, message, pageUrl? }
 */
r.post("/message", validate({ body: ChatbotMessageBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;
  const locale = ((body.locale ?? "ar") as ("ar" | "he" | "en"));
  const message = String(body.message ?? "").trim();
  const conversationId = body.conversationId ? String(body.conversationId).trim() : null;
  const sessionId = body.sessionId ? String(body.sessionId).trim() : null;
  const pageUrl = body.pageUrl ? String(body.pageUrl).trim() : null;

  const now = new Date();
  const userMsg = { role: "user", content: message, at: now.toISOString() };

  const ip = req.ip ? String(req.ip) : null;
  const userAgent = req.get("user-agent") ? String(req.get("user-agent")) : null;

  let convo = null as any;
  if (conversationId) {
    convo = await prisma.chatbotConversation.findUnique({ where: { id: conversationId } });
  }

  const reply = await generateChatbotReply({ locale, message });
  const assistantMsg = { role: "assistant", content: reply.answer, at: new Date().toISOString() };

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
  });
}));

export default r;
