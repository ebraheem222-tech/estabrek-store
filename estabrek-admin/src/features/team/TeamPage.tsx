// Team & permissions: who can open the admin and what each of them may do.
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as StaffAPI from "../../api/staff.api";
import type { MemberLink, PermissionGroup, StaffRole, TeamMember } from "../../api/staff.api";
import {
  STATUS_TEXT,
  describeActivity,
  describeDevice,
  groupCount,
  memberLinkUrl,
  relativeTime,
  shareMessage,
  togglePermission,
  whatsappUrl,
} from "./teamText";

type Tab = "members" | "roles";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>("members");
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("staff:write");

  return (
    <div dir="rtl" className="space-y-4" data-testid="team-page">
      <div className={box}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">الفريق والصلاحيات</h1>
            <p className="mt-1 text-sm text-white/60">
              مين بيقدر يفوت على لوحة الإدارة، وشو بيقدر يعمل فيها. كل تغيير بينحفظ بسجل النشاط.
            </p>
          </div>
        </div>
        <div className="mt-4 inline-flex rounded-xl bg-white/5 p-1" role="tablist">
          {(
            [
              ["members", "الأعضاء"],
              ["roles", "الأدوار"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm transition ${tab === key ? "bg-white/10 font-medium" : "text-white/60 hover:bg-white/5"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "members" ? <MembersTab canWrite={canWrite} /> : <RolesTab canWrite={canWrite} />}
    </div>
  );
}

/* ================================ Members ================================ */

function useTeamData() {
  const members = useQuery({ queryKey: ["staff", "members"], queryFn: StaffAPI.listMembers });
  const roles = useQuery({ queryKey: ["staff", "roles"], queryFn: StaffAPI.listRoles });
  return { members, roles };
}

function MembersTab({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const { admin, isSuperAdmin } = useAuth();
  const owner = isSuperAdmin();
  const { members, roles } = useTeamData();
  const [inviting, setInviting] = useState(false);
  const [link, setLink] = useState<{ member: Pick<TeamMember, "name" | "phone">; link: MemberLink } | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "suspend" | "remove" | "signout"; member: TeamMember } | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["staff"] });

  const update = useMutation({
    mutationFn: (v: { id: string; body: Parameters<typeof StaffAPI.updateMember>[1] }) => StaffAPI.updateMember(v.id, v.body),
    onSuccess: () => {
      toast.success("تم الحفظ");
      refresh();
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const makeLink = useMutation({
    mutationFn: (m: TeamMember) => StaffAPI.memberLink(m.id).then((l) => ({ member: m, link: l })),
    onSuccess: (out) => setLink(out),
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const signOut = useMutation({
    mutationFn: (id: string) => StaffAPI.revokeMemberSessions(id),
    onSuccess: (out) => {
      toast.success(out.revoked ? `انقطع الدخول من ${out.revoked} جهاز` : "ما كان في أجهزة داخلة");
      setConfirm(null);
      refresh();
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => StaffAPI.removeInvite(id),
    onSuccess: () => {
      toast.success("انحذفت الدعوة");
      setConfirm(null);
      refresh();
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });

  const list = members.data ?? [];
  const roleOptions = (roles.data ?? []).map((r) => ({ value: r.id, label: r.name }));

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/60">{list.length ? `${list.length} عضو` : ""}</div>
        {canWrite ? (
          <Button variant="primary" onClick={() => setInviting(true)} className="w-full sm:w-auto">
            دعوة عضو
          </Button>
        ) : null}
      </div>

      {members.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <Spinner /> جاري التحميل…
        </div>
      ) : members.isError ? (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
          {getApiErrorMessage(members.error)}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-white/10" data-testid="team-members">
          {list.map((m) => {
            const me = m.id === admin?.id;
            const status = STATUS_TEXT[m.status];
            const locked = me || (m.owner && !owner) || !canWrite;
            return (
              <li key={m.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between" data-member={m.email}>
                <button type="button" className="min-w-0 text-start" onClick={() => setDetails(m.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {me ? <Badge size="sm">أنت</Badge> : null}
                    {m.owner ? (
                      <Badge size="sm" variant="accent">
                        صاحب المتجر
                      </Badge>
                    ) : (
                      <Badge size="sm" variant="info">
                        {m.staffRole?.name ?? "بدون دور"}
                      </Badge>
                    )}
                    <Badge size="sm" variant={status.variant} dot>
                      {status.label}
                    </Badge>
                    {m.status === "ACTIVE" && !m.twoFactorEnabled ? (
                      <Badge size="sm" variant="warning">
                        بدون تحقق بخطوتين
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-xs text-white/60" dir="ltr" style={{ textAlign: "right" }}>
                    {m.email}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    آخر دخول: {relativeTime(m.lastLoginAt)}
                    {m.activeSessions ? ` · داخل من ${m.activeSessions} جهاز` : ""}
                  </div>
                </button>

                {locked ? null : (
                  <div className="flex flex-wrap items-center gap-2">
                    {!m.owner ? (
                      <div className="w-full sm:w-48">
                        <Select
                          aria-label={`دور ${m.name}`}
                          value={m.staffRole?.id ?? ""}
                          options={[...(m.staffRole ? [] : [{ value: "", label: "اختر دور" }]), ...roleOptions]}
                          onValueChange={(v) => v && v !== m.staffRole?.id && update.mutate({ id: m.id, body: { staffRoleId: v } })}
                          disabled={update.isPending || m.status === "SUSPENDED"}
                        />
                      </div>
                    ) : null}
                    {m.status === "SUSPENDED" ? (
                      <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: m.id, body: { status: "ACTIVE" } })}>
                        تشغيل الحساب
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => makeLink.mutate(m)} isLoading={makeLink.isPending && makeLink.variables?.id === m.id}>
                        {m.status === "INVITED" ? "رابط الدعوة" : "رابط كلمة مرور"}
                      </Button>
                    )}
                    {m.status === "ACTIVE" && m.activeSessions ? (
                      <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: "signout", member: m })}>
                        خروج من كل الأجهزة
                      </Button>
                    ) : null}
                    {m.status === "INVITED" ? (
                      <Button size="sm" variant="danger" onClick={() => setConfirm({ kind: "remove", member: m })}>
                        حذف الدعوة
                      </Button>
                    ) : m.status === "ACTIVE" ? (
                      <Button size="sm" variant="danger" onClick={() => setConfirm({ kind: "suspend", member: m })}>
                        إيقاف
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <InviteModal
        open={inviting}
        roles={roles.data ?? []}
        canAddOwner={owner}
        onClose={() => setInviting(false)}
        onInvited={(member, invite) => {
          setInviting(false);
          setLink({ member, link: invite });
          refresh();
        }}
      />
      <LinkModal value={link} onClose={() => setLink(null)} />
      <MemberDetailsModal id={details} onClose={() => setDetails(null)} />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === "suspend" ? "إيقاف الحساب" : confirm?.kind === "remove" ? "حذف الدعوة" : "خروج من كل الأجهزة"}
        message={
          confirm?.kind === "suspend"
            ? `${confirm.member.name} ما رح يقدر يفوت على لوحة الإدارة، وبينقطع دخوله من كل الأجهزة فوراً. سجل نشاطه بيضل محفوظ، وبتقدر ترجّع تشغّل الحساب أي وقت.`
            : confirm?.kind === "remove"
              ? `الدعوة المرسلة لـ ${confirm.member.email} بتوقف تشتغل.`
              : confirm
                ? `${confirm.member.name} بيطلع من كل الأجهزة وبيحتاج يسجّل دخول من جديد.`
                : ""
        }
        confirmText={confirm?.kind === "suspend" ? "إيقاف" : confirm?.kind === "remove" ? "حذف" : "تسجيل خروج"}
        variant={confirm?.kind === "signout" ? "warning" : "danger"}
        isLoading={update.isPending || remove.isPending || signOut.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "suspend") update.mutate({ id: confirm.member.id, body: { status: "SUSPENDED" } }, { onSettled: () => setConfirm(null) });
          else if (confirm.kind === "remove") remove.mutate(confirm.member.id);
          else signOut.mutate(confirm.member.id);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function InviteModal({
  open,
  roles,
  canAddOwner,
  onClose,
  onInvited,
}: {
  open: boolean;
  roles: StaffRole[];
  canAddOwner: boolean;
  onClose: () => void;
  onInvited: (member: TeamMember, invite: MemberLink) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const invite = useMutation({
    mutationFn: () =>
      StaffAPI.inviteMember({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        ...(roleId === "__owner" ? { owner: true } : { staffRoleId: roleId }),
      }),
    onSuccess: (out) => {
      setName("");
      setEmail("");
      setPhone("");
      setRoleId("");
      onInvited(out.member, out.invite);
    },
    onError: (e) => toast.error("ما زبطت الدعوة", { description: getApiErrorMessage(e) }),
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "اكتب الاسم";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "الإيميل مش صحيح";
    if (!roleId) next.role = "اختر دور";
    setErrors(next);
    if (!Object.keys(next).length) invite.mutate();
  };

  const roleOptions = [
    { value: "", label: "اختر دور" },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
    ...(canAddOwner ? [{ value: "__owner", label: "صاحب متجر (كل الصلاحيات)" }] : []),
  ];
  const picked = roles.find((r) => r.id === roleId);

  return (
    <Modal
      open={open}
      title="دعوة عضو للفريق"
      description="بيوصلك رابط تبعتله ياه (واتساب أو إيميل). بيفتحه وبيختار كلمة المرور بنفسه."
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={submit} isLoading={invite.isPending}>
          إنشاء الدعوة
        </Button>
      }
    >
      <div dir="rtl" className="space-y-4">
        <Input label="الاسم" placeholder="مثال: سارة" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="الإيميل"
          type="email"
          dir="ltr"
          placeholder="name@example.com"
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input label="رقم الهاتف (اختياري)" dir="ltr" placeholder="05X-XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Select label="الدور" value={roleId} error={errors.role} options={roleOptions} onValueChange={setRoleId} />
        {picked?.description ? <p className="text-xs text-white/60">{picked.description}</p> : null}
        {roleId === "__owner" ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            صاحب المتجر بيقدر يعمل كل شي، حتى يغيّر مفاتيح الدفع ويوقف حسابات أصحاب متجر ثانيين.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function LinkModal({ value, onClose }: { value: { member: Pick<TeamMember, "name" | "phone">; link: MemberLink } | null; onClose: () => void }) {
  const url = value ? memberLinkUrl(window.location.origin, value.link.token, value.link.kind) : "";
  const message = value ? shareMessage(value.member.name, url, value.link.kind) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("انسخ الرابط");
    } catch {
      toast.error("ما قدرت أنسخ. حدّد الرابط وانسخه يدوياً.");
    }
  };
  return (
    <Modal
      open={!!value}
      title={value?.link.kind === "invite" ? "رابط الدعوة جاهز" : "رابط كلمة المرور جاهز"}
      description={
        value?.link.kind === "invite"
          ? "ابعته للعضو. الرابط بيشتغل مرة وحدة ولمدة 7 أيام."
          : "ابعته للعضو. الرابط بيشتغل مرة وحدة ولمدة 24 ساعة، وبيطلّعه من كل الأجهزة بعد ما يغيّر كلمة المرور."
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={copy}>
            نسخ الرابط
          </Button>
          <a
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            href={whatsappUrl(message, value?.member.phone)}
            target="_blank"
            rel="noreferrer"
          >
            إرسال بواتساب
          </a>
        </div>
      }
    >
      <div dir="ltr" className="break-all rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs" data-testid="member-link">
        {url}
      </div>
      {value?.link.emailed ? (
        <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2 text-xs text-emerald-200" dir="rtl">
          انبعت الرابط كمان على إيميله.
        </p>
      ) : null}
      <p className="mt-3 text-xs text-white/60" dir="rtl">
        الرابط بيظهر هون مرة وحدة بس. إذا ضاع، اعمل رابط جديد من قائمة الأعضاء (والقديم بيوقف).
      </p>
    </Modal>
  );
}

function MemberDetailsModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ["staff", "member", id], queryFn: () => StaffAPI.getMember(id!), enabled: !!id });
  const d = q.data;
  return (
    <Modal open={!!id} title={d?.member.name ?? "العضو"} description={d?.member.email} onClose={onClose} widthClassName="max-w-2xl">
      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm">
          <Spinner /> جاري التحميل…
        </div>
      ) : q.isError ? (
        <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
      ) : d ? (
        <div dir="rtl" className="space-y-5">
          <section>
            <h3 className="text-sm font-semibold">الأجهزة الداخلة هلّق</h3>
            {d.sessions.length ? (
              <ul className="mt-2 space-y-2">
                {d.sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                    <span>{describeDevice(s.userAgent)}</span>
                    <span className="text-white/60" dir="ltr">
                      {s.ip ?? "—"}
                    </span>
                    <span className="text-white/60">آخر نشاط {relativeTime(s.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/60">ما في أجهزة داخلة.</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold">آخر التغييرات</h3>
            {d.activity.length ? (
              <ul className="mt-2 divide-y divide-white/10 text-xs">
                {d.activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                    <span>{describeActivity(a)}</span>
                    <span className="text-white/50">{relativeTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/60">ما عمل تغييرات بعد.</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold">الدخول والأمان</h3>
            {d.events.length ? (
              <ul className="mt-2 divide-y divide-white/10 text-xs">
                {d.events.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{EVENT_TEXT[e.type] ?? e.type}</span>
                    <span className="text-white/50" dir="ltr">
                      {e.ip ?? ""}
                    </span>
                    <span className="text-white/50">{relativeTime(e.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/60">ما في أحداث بعد.</p>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

const EVENT_TEXT: Record<string, string> = {
  LOGIN_SUCCESS: "دخول ناجح",
  LOGIN_FAILURE: "محاولة دخول فاشلة",
  MFA_CHALLENGE_SUCCESS: "تحقق بخطوتين ناجح",
  MFA_CHALLENGE_FAILURE: "تحقق بخطوتين فاشل",
  PASSWORD_RESET_REQUESTED: "طلب تغيير كلمة المرور",
  PASSWORD_RESET_COMPLETED: "غيّر كلمة المرور",
  PASSWORD_CHANGED: "غيّر كلمة المرور",
  SESSION_CREATED: "جلسة جديدة",
  SESSION_REVOKED: "إنهاء جلسة",
  ACCOUNT_LOCKED: "انقفل الحساب مؤقتاً (محاولات كثيرة)",
  ACCOUNT_UNLOCKED: "انفتح الحساب",
};

/* ================================ Roles ================================ */

function RolesTab({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const roles = useQuery({ queryKey: ["staff", "roles"], queryFn: StaffAPI.listRoles });
  const groups = useQuery({ queryKey: ["staff", "permissions"], queryFn: StaffAPI.getPermissionGroups, staleTime: Infinity });
  const [editing, setEditing] = useState<StaffRole | "new" | null>(null);
  const [deleting, setDeleting] = useState<StaffRole | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => StaffAPI.deleteRole(id),
    onSuccess: () => {
      toast.success("انحذف الدور");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });
  const total = useMemo(() => (groups.data ?? []).reduce((n, g) => n + g.permissions.length, 0), [groups.data]);

  return (
    <div className={box}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60">صاحب المتجر عنده كل الصلاحيات دائماً. الأدوار للأعضاء.</p>
        {canWrite ? (
          <Button variant="primary" onClick={() => setEditing("new")} className="w-full sm:w-auto">
            دور جديد
          </Button>
        ) : null}
      </div>
      {roles.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <Spinner /> جاري التحميل…
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="team-roles">
          {(roles.data ?? []).map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{r.name}</div>
                  {r.description ? <div className="mt-1 text-xs text-white/60">{r.description}</div> : null}
                </div>
                <Badge size="sm">{r.members ? `${r.members} عضو` : "بدون أعضاء"}</Badge>
              </div>
              <div className="mt-3 text-xs text-white/60">
                {r.permissions.length} من {total || "…"} صلاحية
              </div>
              {canWrite ? (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(r)}>
                    تعديل
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(r)} disabled={r.members > 0} title={r.members ? "انقل الأعضاء لدور ثاني أول" : undefined}>
                    حذف
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <RoleEditor value={editing} groups={groups.data ?? []} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title="حذف الدور"
        message={deleting ? `حذف دور "${deleting.name}"؟` : ""}
        confirmText="حذف"
        isLoading={del.isPending}
        onConfirm={() => {
          if (deleting) del.mutate(deleting.id);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function RoleEditor({ value, groups, onClose }: { value: StaffRole | "new" | null; groups: PermissionGroup[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { hasPermission, isSuperAdmin } = useAuth();
  const owner = isSuperAdmin();
  const editing = value && value !== "new" ? value : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  // Load the role when the editor opens.
  const key = value === "new" ? "new" : value?.id ?? "";
  React.useEffect(() => {
    if (!value) return;
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setSelected(new Set(editing?.permissions ?? ["dashboard:read"]));
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), description: description.trim() || null, permissions: [...selected] };
      return editing ? StaffAPI.updateRole(editing.id, body) : StaffAPI.createRole(body);
    },
    onSuccess: () => {
      toast.success(editing ? "انحفظ الدور" : "انضاف الدور");
      qc.invalidateQueries({ queryKey: ["staff"] });
      onClose();
    },
    onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }),
  });

  const canGive = (p: string) => owner || hasPermission(p as any);

  return (
    <Modal
      open={!!value}
      title={editing ? `تعديل "${editing.name}"` : "دور جديد"}
      onClose={onClose}
      widthClassName="max-w-2xl"
      footer={
        <Button
          variant="primary"
          isLoading={save.isPending}
          onClick={() => {
            if (name.trim().length < 2) return setError("اكتب اسم للدور");
            save.mutate();
          }}
        >
          حفظ
        </Button>
      }
    >
      <div dir="rtl" className="space-y-4">
        <Input
          label="اسم الدور"
          placeholder="مثال: خدمة الزبائن"
          value={name}
          error={error}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
        />
        <Input label="وصف قصير (اختياري)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="space-y-3" data-testid="role-permissions">
          {groups.map((g) => {
            const c = groupCount(g, selected);
            return (
              <fieldset key={g.key} className="rounded-xl border border-white/10 p-3">
                <legend className="px-1 text-sm font-medium">
                  {g.label} <span className="text-xs font-normal text-white/50">({c.on} من {c.total})</span>
                </legend>
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
                  {g.permissions.map((p) => {
                    const allowed = canGive(p.key);
                    return (
                      <label key={p.key} className={`flex items-center gap-2 text-sm ${allowed ? "" : "opacity-50"}`} title={allowed ? undefined : "ما عندك هالصلاحية، فما بتقدر تعطيها"}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-current"
                          checked={selected.has(p.key)}
                          disabled={!allowed}
                          onChange={(e) => setSelected((prev) => togglePermission(prev, p.key, e.target.checked, groups))}
                          data-permission={p.key}
                        />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
        {editing && editing.members ? (
          <p className="text-xs text-white/60">التغيير بيوصل للـ {editing.members} عضو على هالدور خلال ثواني.</p>
        ) : null}
      </div>
    </Modal>
  );
}
