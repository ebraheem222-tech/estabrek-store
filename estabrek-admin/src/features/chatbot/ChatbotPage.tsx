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
    <div dir="rtl" className="space-y-4">
      <PageHeader
        title="مساعد المتجر (Chatbot)"
        subtitle="قاعدة معرفة + سجل محادثات — لتحسين الدعم بدون تدريب عشوائي"
        right={
          <div className="flex items-center gap-2">
            <Button variant={tab === "kb" ? "primary" : "secondary"} onClick={() => setTab("kb")}>
              قاعدة المعرفة
            </Button>
            <Button variant={tab === "logs" ? "primary" : "secondary"} onClick={() => setTab("logs")}>
              المحادثات
            </Button>
          </div>
        }
      />

      {tab === "kb" ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label="اللغة"
                value={kbLocale}
                onChange={(e) => setKbLocale(e.target.value as Locale)}
                options={LOCALE_OPTIONS}
              />
              <Input label="بحث" value={kbQ} onValueChange={setKbQ} placeholder="اكتب كلمة..." />
              <Select
                label="مفعّل"
                value={kbEnabled}
                onChange={(e) => setKbEnabled(e.target.value as any)}
                options={[
                  { value: "all", label: "الكل" },
                  { value: "1", label: "مفعّل" },
                  { value: "0", label: "غير مفعّل" },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="accent" onClick={openCreateEntry}>
                إضافة سؤال/إجابة
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
                  <TH>السؤال</TH>
                  <TH className="w-[120px]">اللغة</TH>
                  <TH className="w-[120px]">الحالة</TH>
                  <TH>وسوم</TH>
                  <TH className="w-[160px]">آخر تحديث</TH>
                  <TH className="w-[220px]">إجراءات</TH>
                </TR>
              </THead>
              <TBody>
                {(qEntries.data?.items ?? []).map((e) => (
                  <TR key={e.id}>
                    <TD className="font-medium">{e.title}</TD>
                    <TD>{e.locale}</TD>
                    <TD>{e.isEnabled ? "مفعّل" : "موقوف"}</TD>
                    <TD className="text-xs opacity-80">{(e.tags ?? []).slice(0, 6).join(", ") || "-"}</TD>
                    <TD className="text-xs opacity-70">{formatDateTime(e.updatedAt)}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditEntry(e)}>
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant={e.isEnabled ? "ghost" : "success"}
                          onClick={() => actions.updateEntry.mutate({ id: e.id, body: { isEnabled: !e.isEnabled } })}
                        >
                          {e.isEnabled ? "إيقاف" : "تفعيل"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => actions.deleteEntry.mutate(e.id)}>
                          حذف
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
                {!qEntries.data?.items?.length ? (
                  <TR>
                    <TD colSpan={6} className="text-center text-white/50 py-8">
                      لا توجد بيانات
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
                label="حجم الصفحة"
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
                {qLogs.data ? `الكل: ${qLogs.data.total}` : null}
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
                    <TH className="w-[180px]">التاريخ</TH>
                    <TH className="w-[120px]">الحالة</TH>
                    <TH>آخر رسالة</TH>
                    <TH className="w-[220px]">الصفحة</TH>
                    <TH className="w-[120px]">عرض</TH>
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
                          فتح
                        </Button>
                      </TD>
                    </TR>
                  ))}
                  {!qLogs.data?.items?.length ? (
                    <TR>
                      <TD colSpan={5} className="text-center text-white/50 py-8">
                        لا توجد محادثات
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
        title={editingEntry ? "تعديل سؤال/إجابة" : "إضافة سؤال/إجابة"}
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
              حفظ
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="اللغة"
            value={entryLocale}
            onChange={(e) => setEntryLocale(e.target.value as Locale)}
            options={LOCALE_OPTIONS}
          />
          <Input
            label="الأولوية"
            type="number"
            value={String(entryPriority)}
            onValueChange={(v) => setEntryPriority(Number(v) || 0)}
            hint="أعلى = يظهر أكثر في البحث"
          />
        </div>

        <div className="mt-4">
          <Input label="السؤال / العنوان" value={entryTitle} onValueChange={setEntryTitle} placeholder="مثال: كم مدة الشحن؟" />
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-white/80">الإجابة</label>
          <textarea
            className="min-h-[160px] w-full rounded-xl border border-white/10 bg-surface-925 p-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent-500/20"
            value={entryAnswer}
            onChange={(e) => setEntryAnswer(e.target.value)}
            placeholder="اكتب إجابة واضحة..."
          />
          <div className="text-[11px] opacity-60">يدعم نص عادي أو Markdown بسيط.</div>
        </div>

        <div className="mt-4">
          <Input label="وسوم (tags) مفصولة بفاصلة" value={entryTags} onValueChange={setEntryTags} placeholder="شحن, مرتجعات, دفع" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input type="checkbox" checked={entryEnabled} onChange={(e) => setEntryEnabled(e.target.checked)} />
          <span className="text-sm">مفعّل</span>
        </div>
      </Modal>

      {/* Conversation modal */}
      <Modal
        open={!!openConversationId}
        title="تفاصيل المحادثة"
        onClose={() => setOpenConversationId(null)}
        widthClassName="max-w-3xl"
        footer={
          qConversation.data ? (
            <div className="flex items-center gap-2">
              <Select
                label="الحالة"
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
              {!messages.length ? <div className="text-sm opacity-60">لا توجد رسائل</div> : null}
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/60">غير موجودة</div>
        )}
      </Modal>
    </div>
  );
}

