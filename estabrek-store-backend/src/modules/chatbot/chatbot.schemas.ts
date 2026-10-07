import { z } from "zod";

const LocaleZ = z.enum(["ar", "he", "en"]);

export const ChatbotEntriesQuery = z.object({
  locale: LocaleZ.optional(),
  q: z.string().trim().min(1).max(200).optional(),
  enabled: z.enum(["0", "1"]).optional(),
  take: z.coerce.number().int().min(1).max(500).optional(),
});

export const ChatbotEntryCreateBody = z.object({
  locale: LocaleZ.optional(),
  title: z.string().trim().min(2).max(200),
  answer: z.string().trim().min(2).max(10_000),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.coerce.number().int().min(-100).max(100).optional(),
});

export const ChatbotEntryUpdateBody = ChatbotEntryCreateBody.partial();

export const ChatbotConversationsQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const ChatbotConversationUpdateBody = z.object({
  status: z.string().trim().min(1).max(32),
});

export const ChatbotMessageBody = z.object({
  conversationId: z.string().trim().min(1).optional(),
  sessionId: z.string().trim().min(1).optional(),
  locale: LocaleZ.optional(),
  message: z.string().trim().min(1).max(1200),
  pageUrl: z.string().trim().max(2048).optional(),
});
