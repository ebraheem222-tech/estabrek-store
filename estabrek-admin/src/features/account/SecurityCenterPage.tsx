import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Select } from "../../components/ui/Select";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { formatDateTime, truncate } from "../../lib/format";
import { getApiErrorMessage } from "../../api/http";
import * as AuthAPI from "../../api/auth.api";
import * as SecAPI from "../../api/adminSecurity.api";
import * as AccountAPI from "../../api/account.api";
import { useAuth } from "../../hooks/useAuth";
import { authStore } from "../../store/auth.store";
import { useAdminSessions, useAdminSecurityEvents, useSecurityActions } from "../../hooks/useSecurity";
import { listLocalAdminAuditEvents, type LocalAdminAuditEvent } from "../../lib/adminAudit";

type Tab = "SECURITY" | "SESSIONS" | "AUDIT";

type AuditRow = {
  id: string;
  type: string;
  ip?: string | null;
  metadata?: any;
  createdAt: string;
  source: "server" | "local";
};

const LOCAL_AUDIT_STORAGE_KEY = "estabrek.admin.audit.v1";

function mapLocalAuditType(event: LocalAdminAuditEvent) {
  return `CMS_${event.action.toUpperCase().replace(/\./g, "_")}`;
}

function toTime(value: string) {
  const stamp = new Date(value).getTime();
  return Number.isFinite(stamp) ? stamp : 0;
}

export default function SecurityCenterPage() {
  const { admin } = useAuth();
  const [tab, setTab] = useState<Tab>("SECURITY");

  // --- 2FA (TOTP)
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpLabel, setTotpLabel] = useState("هاتف");
  const [isTotpLoading, setIsTotpLoading] = useState(false);

  // --- 2FA (SMS)
  const [smsChallengeId, setSmsChallengeId] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState("");
  const [smsLabel, setSmsLabel] = useState("رقم الهاتف");
  const [isSmsLoading, setIsSmsLoading] = useState(false);

  // --- Recovery
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  // --- Sessions / Audit
  const currentSessionId = useMemo(() => SecAPI.getCurrentSessionIdFromRefresh(), []);
  const [sessStatus, setSessStatus] = useState<SecAPI.SessionStatus | "">("");
  const sessionsQuery = useAdminSessions({ take: 50, skip: 0, ...(sessStatus ? { status: sessStatus as any } : {}) });

  const [eventType, setEventType] = useState<string>("");
  const eventsQuery = useAdminSecurityEvents({ take: 100, skip: 0, ...(eventType ? { type: eventType } : {}) });
  const [localAuditEvents, setLocalAuditEvents] = useState<LocalAdminAuditEvent[]>(() => listLocalAdminAuditEvents());

  const actions = useSecurityActions();

  // Confirm revoke single session
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const refreshLocalAuditEvents = () => {
    setLocalAuditEvents(listLocalAdminAuditEvents());
  };

  async function refreshMe() {
    try {
      const me = await AccountAPI.getAdminMe();
      // backend may return {admin: {...}}; keep the signed-in admin in sync
      // (the 2FA badge, and pages that were waiting for two-step sign-in).
      const next = (me?.admin ?? me) as any;
      if (next?.id) authStore.setAdmin(next);
    } catch {
      // ignore
    }
  }

  async function setupTotp() {
    setIsTotpLoading(true);
    try {
      const r = await AuthAPI.twofaSetup();
      setTotpSecret(r.secret);
      setTotpUri(r.uri);
    } finally {
      setIsTotpLoading(false);
    }
  }

  async function enableTotp() {
    if (!totpSecret) return;
    setIsTotpLoading(true);
    try {
      await AuthAPI.twofaEnableTotp({ secret: totpSecret, code: totpCode.trim(), label: totpLabel });
      setTotpCode("");
      setTotpSecret(null);
      setTotpUri(null);
      await refreshMe();
      // After enabling, generate recovery codes immediately.
      const rc = await AuthAPI.recoveryGenerate({ count: 10 });
      setRecoveryCodes(rc.codes);
      setRecoveryOpen(true);
    } finally {
      setIsTotpLoading(false);
    }
  }

  async function startSms2fa() {
    setIsSmsLoading(true);
    try {
      const r = await AuthAPI.twofaSmsStart();
      setSmsChallengeId(r.challengeId);
    } finally {
      setIsSmsLoading(false);
    }
  }

  async function confirmSms2fa() {
    if (!smsChallengeId) return;
    setIsSmsLoading(true);
    try {
      await AuthAPI.twofaSmsConfirm({ challengeId: smsChallengeId, code: smsCode.trim(), label: smsLabel });
      setSmsCode("");
      setSmsChallengeId(null);
      await refreshMe();
      const rc = await AuthAPI.recoveryGenerate({ count: 10 });
      setRecoveryCodes(rc.codes);
      setRecoveryOpen(true);
    } finally {
      setIsSmsLoading(false);
    }
  }

  async function disable2fa() {
    // backend supports optional deviceId; if not provided it disables default.
    await AuthAPI.twofaDisable({});
    await refreshMe();
  }

  const sessionRows = sessionsQuery.data?.items ?? [];
  const serverEventRows = (eventsQuery.data?.items ?? []).map((event) => ({
    ...event,
    source: "server" as const,
  }));

  const localEventRows = useMemo<AuditRow[]>(() => {
    const rows = localAuditEvents.map((event) => ({
      id: `local:${event.id}`,
      type: mapLocalAuditType(event),
      ip: null,
      metadata: {
        action: event.action,
        entity: event.entity,
        entityId: event.entityId ?? null,
        pageId: event.pageId ?? null,
        role: event.role ?? null,
        ...(event.metadata ?? {}),
      },
      createdAt: event.createdAt,
      source: "local" as const,
    }));
    if (!eventType) return rows;
    return rows.filter((event) => event.type === eventType);
  }, [localAuditEvents, eventType]);

  const auditRows = useMemo<AuditRow[]>(() => {
    const rows: AuditRow[] = [...serverEventRows, ...localEventRows];
    rows.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
    return rows;
  }, [serverEventRows, localEventRows]);

  const hasLocalAuditFallback = localEventRows.length > 0;
  const showLocalFallbackHint = eventsQuery.isError || !serverEventRows.length;

  const knownEventTypes = useMemo(() => {
    const s = new Set<string>();
    for (const e of serverEventRows) s.add(e.type);
    for (const e of localEventRows) s.add(e.type);
    return Array.from(s).sort();
  }, [serverEventRows, localEventRows]);

  useEffect(() => {
    refreshLocalAuditEvents();
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_AUDIT_STORAGE_KEY) {
        refreshLocalAuditEvents();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (tab === "AUDIT") refreshLocalAuditEvents();
  }, [tab]);

  // Sent here because the store requires two-step sign-in (Security rules).
  const mustSetUp2fa = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("setup") === "2fa";

  return (
    <div className="space-y-4">
      {mustSetUp2fa && !admin?.twoFactorEnabled ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200" data-testid="setup-2fa-required">
          صاحب المتجر طلب تفعيل التحقق بخطوتين لكل الحسابات. فعّله هون (تطبيق المصادقة أو SMS)، وبعدها بتفتح باقي صفحات لوحة الإدارة.
        </div>
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">الأمان</h1>
          <p className="text-white/60 text-sm">إدارة الحماية، الجلسات، وسجل التدقيق (Audit Log).</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "SECURITY" ? "primary" : "ghost"} onClick={() => setTab("SECURITY")}>الحماية</Button>
          <Button variant={tab === "SESSIONS" ? "primary" : "ghost"} onClick={() => setTab("SESSIONS")}>الجلسات</Button>
          <Button variant={tab === "AUDIT" ? "primary" : "ghost"} onClick={() => setTab("AUDIT")}>سجل التدقيق</Button>
        </div>
      </div>

      {tab === "SECURITY" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">التحقق بخطوتين (2FA)</h2>
                <p className="text-white/60 text-sm">ننصح بتفعيل 2FA قبل نشر المشروع.</p>
              </div>
              {admin?.twoFactorEnabled ? <Badge variant="success">مفعّل</Badge> : <Badge variant="default">غير مفعّل</Badge>}
            </div>

            <div className="mt-4 space-y-3">
              {!admin?.twoFactorEnabled ? (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={setupTotp} isLoading={isTotpLoading}>تجهيز TOTP</Button>
                    <Button variant="secondary" onClick={startSms2fa} isLoading={isSmsLoading}>تفعيل SMS 2FA</Button>
                  </div>

                  {totpSecret && (
                    <div className="rounded-2xl border border-white/[0.08] p-4 space-y-3">
                      <div className="text-sm text-white/70">
                        1) افتح Google Authenticator / Microsoft Authenticator<br />
                        2) أضف حساب جديد واكتب الـ Secret يدويًا
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <div className="text-xs text-white/50 mb-1">Secret</div>
                          <div className="flex flex-wrap gap-2">
                            <Input value={totpSecret} readOnly />
                            <Button
                              variant="ghost"
                              onClick={() => navigator.clipboard.writeText(totpSecret)}
                              title="نسخ"
                            >
                              نسخ
                            </Button>
                          </div>
                        </div>
                        {totpUri && (
                          <div className="text-xs text-white/50 break-all">URI: {totpUri}</div>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs text-white/50 mb-1">اسم الجهاز</div>
                            <Input value={totpLabel} onChange={(e) => setTotpLabel(e.target.value)} />
                          </div>
                          <div>
                            <div className="text-xs text-white/50 mb-1">كود 6 أرقام</div>
                            <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="123456" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={enableTotp} isLoading={isTotpLoading} disabled={!totpCode.trim()}>تفعيل</Button>
                          <Button variant="ghost" onClick={() => { setTotpSecret(null); setTotpUri(null); }}>إلغاء</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {smsChallengeId && (
                    <div className="rounded-2xl border border-white/[0.08] p-4 space-y-3">
                      <div className="text-sm text-white/70">تم إرسال كود إلى رقم هاتفك. أدخل الكود للتفعيل.</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-white/50 mb-1">اسم الجهاز</div>
                          <Input value={smsLabel} onChange={(e) => setSmsLabel(e.target.value)} />
                        </div>
                        <div>
                          <div className="text-xs text-white/50 mb-1">الكود</div>
                          <Input value={smsCode} onChange={(e) => setSmsCode(e.target.value)} placeholder="123456" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={confirmSms2fa} isLoading={isSmsLoading} disabled={!smsCode.trim()}>تأكيد</Button>
                        <Button variant="ghost" onClick={() => { setSmsChallengeId(null); setSmsCode(""); }}>إلغاء</Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-white/70">2FA مفعّل. إذا فقدت جهازك استخدم Recovery Codes.</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const rc = await AuthAPI.recoveryGenerate({ count: 10 });
                        setRecoveryCodes(rc.codes);
                        setRecoveryOpen(true);
                      }}
                    >
                      توليد Recovery Codes
                    </Button>
                    <Button variant="danger" onClick={disable2fa}>إلغاء تفعيل 2FA</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">نصائح سريعة</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/70 list-disc pr-5">
              <li>فعّل 2FA (TOTP أفضل من SMS إن أمكن).</li>
              <li>راجع الجلسات واحذف أي جلسة مش مشهورة.</li>
              <li>راقب Audit Log خصوصاً محاولات الدخول الفاشلة.</li>
              <li>لا تخزن Recovery Codes داخل المتصفح—احفظها بمكان آمن.</li>
            </ul>
          </Card>
        </div>
      )}

      {tab === "SESSIONS" && (
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">الجلسات</h2>
              <p className="text-white/60 text-sm">شاهد الأجهزة المسجّلة عندك واحذف أي جلسة غير معروفة.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={sessStatus}
                onChange={(e) => setSessStatus(e.target.value as any)}
                placeholder="كل الحالات"
                options={[
                  { value: "ACTIVE", label: "ACTIVE" },
                  { value: "REVOKED", label: "REVOKED" },
                  { value: "EXPIRED", label: "EXPIRED" },
                ]}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!currentSessionId) return;
                  actions.revokeOthers.mutate(currentSessionId);
                }}
                disabled={!currentSessionId}
                isLoading={actions.revokeOthers.isPending}
                title={!currentSessionId ? "لا يوجد refreshToken" : ""}
              >
                تسجيل خروج من باقي الأجهزة
              </Button>
            </div>
          </div>

          <div className="mt-4">
                        <>
              <div className="space-y-3 sm:hidden">
                {sessionsQuery.isLoading && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm opacity-70">جارٍ التحميل...</div>
                )}
                {!sessionsQuery.isLoading && sessionRows.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm opacity-70">لا يوجد جلسات.</div>
                )}
                {sessionRows.map((s) => {
                  const isCurrent = !!currentSessionId && s.id === currentSessionId;
                  return (
                    <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "REVOKED" ? "danger" : "warning"}>{s.status}</Badge>
                          {isCurrent && <Badge variant="info">الجلسة الحالية</Badge>}
                        </div>
                        <div className="text-xs opacity-70">{formatDateTime(s.createdAt)}</div>
                      </div>
                      <div className="mt-2 text-xs opacity-80">IP: {s.ip ?? "-"}</div>
                      <div className="mt-1 text-xs opacity-70">{s.userAgent ? truncate(s.userAgent, 80) : "-"}</div>
                      <div className="mt-2 text-xs opacity-70">تنتهي: {formatDateTime(s.expiresAt)}</div>
                      <div className="mt-3">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={s.status !== "ACTIVE" || isCurrent}
                          onClick={() => setRevokeId(s.id)}
                        >
                          إنهاء الجلسة
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden sm:block">
                <Table>
                  <THead>
                    <TR>
                      <TH>الحالة</TH>
                      <TH>IP</TH>
                      <TH>UA</TH>
                      <TH>الإنشاء</TH>
                      <TH>الانتهاء</TH>
                      <TH></TH>
                    </TR>
                  </THead>
                  <TBody>
                    {sessionsQuery.isLoading && (
                      <TR>
                        <TD colSpan={6} className="text-center py-6 text-white/60">جارٍ التحميل...</TD>
                      </TR>
                    )}
                    {!sessionsQuery.isLoading && sessionRows.length === 0 && (
                      <TR>
                        <TD colSpan={6} className="text-center py-6 text-white/60">لا يوجد جلسات.</TD>
                      </TR>
                    )}
                    {sessionRows.map((s) => {
                      const isCurrent = !!currentSessionId && s.id === currentSessionId;
                      return (
                        <TR key={s.id}>
                          <TD>
                            <div className="flex items-center gap-2">
                              <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "REVOKED" ? "danger" : "warning"}>{s.status}</Badge>
                              {isCurrent && <Badge variant="info">الجلسة الحالية</Badge>}
                            </div>
                          </TD>
                          <TD className="text-xs">{s.ip ?? "-"}</TD>
                          <TD className="text-xs">{s.userAgent ? truncate(s.userAgent, 60) : "-"}</TD>
                          <TD className="text-xs">{formatDateTime(s.createdAt)}</TD>
                          <TD className="text-xs">{formatDateTime(s.expiresAt)}</TD>
                          <TD className="text-left">
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={s.status !== "ACTIVE" || isCurrent}
                              onClick={() => setRevokeId(s.id)}
                            >
                              إلغاء
                            </Button>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </>
          </div>
        </Card>
      )}

      {tab === "AUDIT" && (
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Audit Log</h2>
              <p className="text-white/60 text-sm">سجلّ الأحداث الأمنية (تسجيل دخول، فشل، جلسات...).</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={eventType}
                onValueChange={(value) => setEventType(value)}
                placeholder="كل الأنواع"
                options={knownEventTypes.map((t) => ({ value: t, label: t }))}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  void eventsQuery.refetch();
                  refreshLocalAuditEvents();
                }}
              >
                تحديث
              </Button>
            </div>
          </div>
          {showLocalFallbackHint ? (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {eventsQuery.isError
                ? "تعذر تحميل سجل التدقيق من الخادم. يتم عرض السجل المحلي (fallback)."
                : "يتم عرض السجل المحلي (fallback) إلى جانب سجل الخادم."}
            </div>
          ) : null}
          {hasLocalAuditFallback ? (
            <div className="mt-2 text-[11px] text-white/60">
              Browser fallback events: {localEventRows.length}
            </div>
          ) : null}

          <div className="mt-4">
                        <>
              <div className="space-y-3 sm:hidden">
                {eventsQuery.isLoading && auditRows.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm opacity-70">جارٍ التحميل...</div>
                )}
                {!eventsQuery.isLoading && auditRows.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm opacity-70">لا يوجد سجل.</div>
                )}
                {auditRows.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs opacity-70">{formatDateTime(e.createdAt)}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{e.type}</Badge>
                        <Badge variant={e.source === "local" ? "warning" : "info"}>
                          {e.source === "local" ? "LOCAL" : "SERVER"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-xs opacity-80">IP: {e.ip ?? "-"}</div>
                    {e.metadata ? (
                      <pre className="mt-2 whitespace-pre-wrap break-all text-white/70 bg-white/[0.03] rounded-xl p-3 text-xs overflow-auto">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    ) : (
                      <div className="mt-2 text-xs opacity-70">-</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="hidden sm:block">
                <Table>
                  <THead>
                    <TR>
                      <TH>الوقت</TH>
                      <TH>النوع</TH>
                      <TH>المصدر</TH>
                      <TH>IP</TH>
                      <TH>البيانات</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {eventsQuery.isLoading && auditRows.length === 0 && (
                      <TR>
                        <TD colSpan={5} className="text-center py-6 text-white/60">جارٍ التحميل...</TD>
                      </TR>
                    )}
                    {!eventsQuery.isLoading && auditRows.length === 0 && (
                      <TR>
                        <TD colSpan={5} className="text-center py-6 text-white/60">لا يوجد سجل.</TD>
                      </TR>
                    )}
                    {auditRows.map((e) => (
                      <TR key={e.id}>
                        <TD className="text-xs">{formatDateTime(e.createdAt)}</TD>
                        <TD className="text-xs"><Badge variant="default">{e.type}</Badge></TD>
                        <TD className="text-xs">
                          <Badge variant={e.source === "local" ? "warning" : "info"}>
                            {e.source === "local" ? "LOCAL" : "SERVER"}
                          </Badge>
                        </TD>
                        <TD className="text-xs">{e.ip ?? "-"}</TD>
                        <TD className="text-xs">
                          {e.metadata ? (
                            <pre className="whitespace-pre-wrap break-all text-white/70 bg-white/[0.03] rounded-xl p-3 max-w-[560px] overflow-auto">
                              {JSON.stringify(e.metadata, null, 2)}
                            </pre>
                          ) : (
                            "-"
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!revokeId}
        title="إلغاء جلسة"
        message="هل أنت متأكد؟ سيتم تسجيل خروج هذا الجهاز فوراً."
        confirmText="إلغاء"
        cancelText="رجوع"
        variant="danger"
        isLoading={actions.revokeSession.isPending}
        onConfirm={async () => {
          if (!revokeId) return;
          try {
            await actions.revokeSession.mutateAsync(revokeId);
            setRevokeId(null);
          } catch (err) {
            alert(getApiErrorMessage(err));
          }
        }}
        onClose={() => setRevokeId(null)}
      />

      <Modal
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        disableBackdropClose
        title="Recovery Codes"
        description="احفظ هذه الأكواد بمكان آمن. ستظهر مرة واحدة فقط."
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => setRecoveryOpen(false)}
            >
              نسختها
            </Button>
          </div>
        }
        closeText="إغلاق"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(recoveryCodes ?? []).map((c) => (
              <div key={c} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm text-white/80">
                {c}
              </div>
            ))}
          </div>
          {recoveryCodes && (
            <Button
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))}
            >
              نسخ الكل
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}



