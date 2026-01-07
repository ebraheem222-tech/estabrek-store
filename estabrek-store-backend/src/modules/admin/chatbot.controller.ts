import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import {
  ChatbotConversationUpdateBody,
  ChatbotConversationsQuery,
  ChatbotEntriesQuery,
  ChatbotEntryCreateBody,
  ChatbotEntryUpdateBody,
} from "../chatbot/chatbot.schemas.js";

const r = Router();

// -----------------------------
// Knowledge base entries
// -----------------------------

// GET /v1/admin/chatbot/entries
r.get("/entries", validate({ query: ChatbotEntriesQuery }), asyncHandler(async (req, res) => {
  const q = String((req.query as any)?.q ?? "").trim();
  const locale = String((req.query as any)?.locale ?? "");
  const enabled = (req.query as any)?.enabled;
  const take = Math.min(500, Math.max(1, Number((req.query as any)?.take ?? 200)));

  const where: any = {};
  if (locale) where.locale = locale;
  if (enabled === "1") where.isEnabled = true;
  if (enabled === "0") where.isEnabled = false;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { answer: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.chatbotEntry.findMany({
    where,
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take,
  });

  res.json({ items });
}));

// POST /v1/admin/chatbot/entries
r.post("/entries", validate({ body: ChatbotEntryCreateBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;
  const created = await prisma.chatbotEntry.create({
    data: {
      locale: (body.locale ?? "ar") as any,
      title: String(body.title).trim(),
      answer: String(body.answer).trim(),
      tags: Array.isArray(body.tags) ? body.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 30) : [],
      isEnabled: body.isEnabled !== false,
      priority: typeof body.priority === "number" ? body.priority : Number(body.priority ?? 0) || 0,
    },
  });
  res.json(created);
}));

// PATCH /v1/admin/chatbot/entries/:id
r.patch("/entries/:id", validate({ body: ChatbotEntryUpdateBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;
  const updated = await prisma.chatbotEntry.update({
    where: { id: String(req.params.id) },
    data: {
      ...(body.locale ? { locale: body.locale as any } : {}),
      ...(body.title ? { title: String(body.title).trim() } : {}),
      ...(body.answer ? { answer: String(body.answer).trim() } : {}),
      ...(Array.isArray(body.tags) ? { tags: body.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 30) } : {}),
      ...(typeof body.isEnabled === "boolean" ? { isEnabled: body.isEnabled } : {}),
      ...(body.priority != null ? { priority: Number(body.priority) || 0 } : {}),
    },
  });
  res.json(updated);
}));

// DELETE /v1/admin/chatbot/entries/:id
r.delete("/entries/:id", asyncHandler(async (req, res) => {
  await prisma.chatbotEntry.delete({ where: { id: String(req.params.id) } });
  res.json({ ok: true });
}));

// -----------------------------
// Conversations (logs)
// -----------------------------

// GET /v1/admin/chatbot/conversations?page=1&pageSize=30
r.get("/conversations", validate({ query: ChatbotConversationsQuery }), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number((req.query as any)?.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number((req.query as any)?.pageSize ?? 30)));
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.chatbotConversation.findMany({
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
      select: {
        id: true,
        sessionId: true,
        source: true,
        status: true,
        lastMessage: true,
        lastRole: true,
        lastAt: true,
        pageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.chatbotConversation.count(),
  ]);

  res.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}));

// GET /v1/admin/chatbot/conversations/:id
r.get("/conversations/:id", asyncHandler(async (req, res) => {
  const convo = await prisma.chatbotConversation.findUnique({ where: { id: String(req.params.id) } });
  if (!convo) return res.status(404).json({ error: "NOT_FOUND" });
  res.json(convo);
}));

// PATCH /v1/admin/chatbot/conversations/:id
r.patch("/conversations/:id", validate({ body: ChatbotConversationUpdateBody }), asyncHandler(async (req, res) => {
  const updated = await prisma.chatbotConversation.update({
    where: { id: String(req.params.id) },
    data: { status: String((req.body as any).status).trim() },
  });
  res.json(updated);
}));

export default r;

