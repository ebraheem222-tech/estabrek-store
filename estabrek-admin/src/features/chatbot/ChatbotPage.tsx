// src/features/chatbot/ChatbotPage.tsx
import React, { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import type { ChatbotConversation, ChatbotEntry, Locale } from "../../api/chatbot.api";
import { useChatbotActions, useChatbotConversation, useChatbotConversations, useChatbotEntries } from "../../hooks/useChatbot";
import { formatDateTime, truncate } from "../../lib/format";
import { tr } from "@/lib/words";

type Tab = "kb" | "logs";

const LOCALE_OPTIONS = [
  { value: "ar", label: "العربية" },
  { value: "he", label: "עברית" },
  { value: "en", label: "English" },
];

function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export default function ChatbotPage() {
  const [tab, setTab] = useState<Tab>("kb");

  // KB filters
  const [kbLocale, setKbLocale] = useState<Locale>("ar");
  const [kbQ, setKbQ] = useState("");
  const [kbEnabled, setKbEnabled] = useState<"all" | "1" | "0">("all");

  const qEntries = useChatbotEntries({
    locale: kbLocale,
    q: kbQ.trim() ? kbQ.trim() : undefined,
    enabled: kbEnabled === "all" ? undefined : kbEnabled,
    take: 300,
  });

  const actions = useChatbotActions();

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChatbotEntry | null>(null);

  const [entryLocale, setEntryLocale] = useState<Locale>("ar");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryAnswer, setEntryAnswer] = useState("");
  const [entryTags, setEntryTags] = useState("");
  const [entryEnabled, setEntryEnabled] = useState(true);
  const [entryPriority, setEntryPriority] = useState<number>(0);

  const openCreateEntry = () => {
    setEditingEntry(null);
    setEntryLocale(kbLocale);
    setEntryTitle("");
    setEntryAnswer("");
    setEntryTags("");
    setEntryEnabled(true);
    setEntryPriority(0);
    setEntryModalOpen(true);
  };

  const openEditEntry = (e: ChatbotEntry) => {
    setEditingEntry(e);
    setEntryLocale(e.locale);
    setEntryTitle(e.title ?? "");
    setEntryAnswer(e.answer ?? "");
    setEntryTags((e.tags ?? []).join(", "));
    setEntryEnabled(e.isEnabled !== false);
    setEntryPriority(typeof e.priority === "number" ? e.priority : 0);
    setEntryModalOpen(true);
  };

  const saveEntry = async () => {
    const body = {
      locale: entryLocale,
      title: entryTitle.trim(),
      answer: entryAnswer.trim(),
      tags: parseTags(entryTags),
      isEnabled: entryEnabled,
      priority: entryPriority,
    };

    if (editingEntry) {
      await actions.updateEntry.mutateAsync({ id: editingEntry.id, body });
    } else {
      await actions.createEntry.mutateAsync(body);
    }
    setEntryModalOpen(false);
  };

  // Logs
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(30);
  const qLogs = useChatbotConversations({ page: logsPage, pageSize: logsPageSize });

  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const qConversation = useChatbotConversation(openConversationId);

  const messages = useMemo(() => {
    const convo = qConversation.data as ChatbotConversation | undefined;
    const raw = convo?.messages;
    return safeArray<{ role?: string; content?: string; at?: string }>(raw);
  }, [qConversation.data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={tr("مساعد المتجر (Chatbot)", "Store assistant (chatbot)")}
        subtitle={tr("قاعدة معرفة + سجل محادثات — لتحسين الدعم بدون تدريب عشوائي", "A knowledge base + chat history — better support without random training")}
        right={
          <div className="flex items-center gap-2">
            <Button variant={tab === "kb" ? "primary" : "secondary"} onClick={() => setTab("kb")}>
              {tr("قاعدة المعرفة", "Knowledge base")}
            </Button>
            <Button variant={tab === "logs" ? "primary" : "secondary"} onClick={() => setTab("logs")}>
              {tr("المحادثات", "Chats")}
            </Button>
          </div>
        }
      />

      {tab === "kb" ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label={tr("اللغة", "Language")}
                value={kbLocale}
                onChange={(e) => setKbLocale(e.target.value as Locale)}
                options={LOCALE_OPTIONS}
              />
              <Input label={tr("بحث", "Search")} value={kbQ} onValueChange={setKbQ} placeholder={tr("كلمة للبحث...", "Type a word...")} />
              <Select
                label={tr("مفعّل", "Active")}
                value={kbEnabled}
                onChange={(e) => setKbEnabled(e.target.value as any)}
                options={[
                  { value: "all", label: tr("الكل", "All") },
                  { value: "1", label: tr("مفعّل", "Active") },
                  { value: "0", label: tr("غير مفعّل", "Inactive") },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="accent" onClick={openCreateEntry}>
                {tr("إضافة سؤال/إجابة", "Add a question/answer")}
              </Button>
            </div>
          </div>

          {qEntries.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>{tr("السؤال", "Question")}</TH>
                  <TH className="w-[120px]">{tr("اللغة", "Language")}</TH>
                  <TH className="w-[120px]">{tr("الحالة", "Status")}</TH>
                  <TH>{tr("وسوم", "Tags")}</TH>
                  <TH className="w-[160px]">{tr("آخر تحديث", "Last updated")}</TH>
                  <TH className="w-[220px]">{tr("إجراءات", "Actions")}</TH>
                </TR>
              </THead>
              <TBody>
                {(qEntries.data?.items ?? []).map((e) => (
                  <TR key={e.id}>
                    <TD className="font-medium">{e.title}</TD>
                    <TD>{e.locale}</TD>
                    <TD>{e.isEnabled ? tr("مفعّل", "Active") : tr("موقوف", "Stopped")}</TD>
                    <TD className="text-xs opacity-80">{(e.tags ?? []).slice(0, 6).join(", ") || "-"}</TD>
                    <TD className="text-xs opacity-70">{formatDateTime(e.updatedAt)}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditEntry(e)}>
                          {tr("تعديل", "Edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant={e.isEnabled ? "ghost" : "success"}
                          onClick={() => actions.updateEntry.mutate({ id: e.id, body: { isEnabled: !e.isEnabled } })}
                        >
                          {e.isEnabled ? tr("إيقاف", "Stop") : tr("تفعيل", "Activate")}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => actions.deleteEntry.mutate(e.id)}>
                          {tr("حذف", "Delete")}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
                {!qEntries.data?.items?.length ? (
                  <TR>
                    <TD colSpan={6} className="text-center text-white/50 py-8">
                      {tr("لا توجد بيانات", "No data")}
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label={tr("حجم الصفحة", "Page size")}
                value={String(logsPageSize)}
                onChange={(e) => {
                  setLogsPageSize(Number(e.target.value));
                  setLogsPage(1);
                }}
                options={[
                  { value: "20", label: "20" },
                  { value: "30", label: "30" },
                  { value: "50", label: "50" },
                ]}
              />
              <div className="text-xs opacity-60 pt-7">
                {qLogs.data ? tr(`الكل: ${qLogs.data.total}`, "All: {0}", [qLogs.data.total]) : null}
              </div>
            </div>
          </div>

          {qLogs.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH className="w-[180px]">{tr("التاريخ", "Date")}</TH>
                    <TH className="w-[120px]">{tr("الحالة", "Status")}</TH>
                    <TH>{tr("آخر رسالة", "Last message")}</TH>
                    <TH className="w-[220px]">{tr("الصفحة", "Page")}</TH>
                    <TH className="w-[120px]">{tr("عرض", "View")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {(qLogs.data?.items ?? []).map((c) => (
                    <TR key={c.id}>
                      <TD className="text-xs opacity-80">{formatDateTime(c.createdAt)}</TD>
                      <TD>{c.status}</TD>
                      <TD className="text-xs opacity-80">{truncate(c.lastMessage ?? "", 110) || "-"}</TD>
                      <TD className="text-xs opacity-60">{truncate(c.pageUrl ?? "", 48) || "-"}</TD>
                      <TD>
                        <Button size="sm" variant="secondary" onClick={() => setOpenConversationId(c.id)}>
                          {tr("فتح", "Open")}
                        </Button>
                      </TD>
                    </TR>
                  ))}
                  {!qLogs.data?.items?.length ? (
                    <TR>
                      <TD colSpan={5} className="text-center text-white/50 py-8">
                        {tr("لا توجد محادثات", "No chats")}
                      </TD>
                    </TR>
                  ) : null}
                </TBody>
              </Table>

              <Pagination
                page={qLogs.data?.page ?? logsPage}
                totalPages={qLogs.data?.totalPages ?? 1}
                onChange={setLogsPage}
                className="pt-4"
              />
            </>
          )}
        </div>
      )}

      {/* Entry modal */}
      <Modal
        open={entryModalOpen}
        title={editingEntry ? tr("تعديل سؤال/إجابة", "Edit question/answer") : tr("إضافة سؤال/إجابة", "Add a question/answer")}
        onClose={() => setEntryModalOpen(false)}
        widthClassName="max-w-2xl"
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              isLoading={actions.createEntry.isPending || actions.updateEntry.isPending}
              onClick={saveEntry}
              disabled={!entryTitle.trim() || !entryAnswer.trim()}
            >
              {tr("حفظ", "Save")}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={tr("اللغة", "Language")}
            value={entryLocale}
            onChange={(e) => setEntryLocale(e.target.value as Locale)}
            options={LOCALE_OPTIONS}
          />
          <Input
            label={tr("الأولوية", "Priority")}
            type="number"
            value={String(entryPriority)}
            onValueChange={(v) => setEntryPriority(Number(v) || 0)}
            hint={tr("أعلى = يظهر أكثر في البحث", "Higher = shows more in search")}
          />
        </div>

        <div className="mt-4">
          <Input label={tr("السؤال / العنوان", "Question / title")} value={entryTitle} onValueChange={setEntryTitle} placeholder={tr("مثال: كم مدة الشحن؟", "e.g. How long does shipping take?")} />
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-white/80">{tr("الإجابة", "Answer")}</label>
          <textarea
            className="min-h-[160px] w-full rounded-xl border border-white/10 bg-surface-925 p-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-500/20"
            value={entryAnswer}
            onChange={(e) => setEntryAnswer(e.target.value)}
            placeholder={tr("إجابة واضحة...", "Write a clear answer...")}
          />
          <div className="text-[11px] opacity-60">{tr("يدعم نص عادي أو Markdown بسيط.", "Takes plain text or simple Markdown.")}</div>
        </div>

        <div className="mt-4">
          <Input label={tr("وسوم (tags) مفصولة بفاصلة", "Tags separated by commas")} value={entryTags} onValueChange={setEntryTags} placeholder={tr("شحن, مرتجعات, دفع", "shipping, returns, payment")} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input type="checkbox" checked={entryEnabled} onChange={(e) => setEntryEnabled(e.target.checked)} />
          <span className="text-sm">{tr("مفعّل", "Active")}</span>
        </div>
      </Modal>

      {/* Conversation modal */}
      <Modal
        open={!!openConversationId}
        title={tr("تفاصيل المحادثة", "Chat details")}
        onClose={() => setOpenConversationId(null)}
        widthClassName="max-w-3xl"
        footer={
          qConversation.data ? (
            <div className="flex items-center gap-2">
              <Select
                label={tr("الحالة", "Status")}
                value={String((qConversation.data as any)?.status ?? "OPEN")}
                onChange={(e) => {
                  const status = e.target.value;
                  if (!openConversationId) return;
                  actions.updateConversationStatus.mutate({ id: openConversationId, status });
                }}
                options={[
                  { value: "OPEN", label: "OPEN" },
                  { value: "CLOSED", label: "CLOSED" },
                  { value: "NEEDS_HUMAN", label: "NEEDS_HUMAN" },
                ]}
              />
            </div>
          ) : null
        }
      >
        {qConversation.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : qConversation.data ? (
          <div className="space-y-3">
            <div className="text-xs opacity-60">
              {formatDateTime((qConversation.data as any).createdAt)} · {(qConversation.data as any).pageUrl ?? "-"}
            </div>

            <div className="space-y-2">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={
                    "rounded-2xl border p-3 text-sm " +
                    (m.role === "user"
                      ? "border-white/[0.08] bg-white/[0.03]"
                      : "border-accent-500/20 bg-accent-500/10")
                  }
                >
                  <div className="mb-1 text-[11px] opacity-60">
                    {m.role ?? "-"} · {formatDateTime(m.at ?? "")}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content ?? ""}</div>
                </div>
              ))}
              {!messages.length ? <div className="text-sm opacity-60">{tr("لا توجد رسائل", "No messages")}</div> : null}
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/60">{tr("غير موجودة", "Not found")}</div>
        )}
      </Modal>
    </div>
  );
}

