// الزبائن → الأدوار والمجموعات (stage 2, item 3; backend lib/shopperRoles.ts): the roles the owner gives shoppers
// (three ready ones, or their own) and the groups shoppers are in. What a role or a group may do is chosen where it
// is used: a table's access (الـ API والمفاتيح) and a function's door.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { getApiErrorMessage } from "../../api/http";
import { useAuth } from "../../hooks/useAuth";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import * as R from "../../api/shopperRoles.api";
import type { RolesPage, ShopperGroup, ShopperRole } from "../../api/shopperRoles.api";
import { ROLES_KEY, roleName, useShopperRoles } from "./rolesUi";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 w-full rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";
const ROLE_KEY = /^[a-z][a-z0-9_-]{1,30}$/;

export function RolesGroupsCard() {
  const qc = useQueryClient();
  const lang = adminLang();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("customers:write");
  const q = useShopperRoles();
  const [role, setRole] = useState({ key: "", name: "" });
  const [group, setGroup] = useState("");
  const [members, setMembers] = useState<ShopperGroup | null>(null);
  const [asking, setAsking] = useState<{ kind: "role"; it: ShopperRole } | { kind: "group"; it: ShopperGroup } | null>(null);
  const done = (page: RolesPage) => {
    qc.setQueryData(ROLES_KEY, page);
    void qc.invalidateQueries({ queryKey: ["customers"] });
  };
  const onError = (e: unknown) => toast.error(say("ما زبط|That didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });
  const preset = useMutation({ mutationFn: (key: string) => R.addPreset(key), onSuccess: done, onError });
  const addRole = useMutation({
    mutationFn: () => R.addRole({ key: role.key.trim(), name: { [lang]: role.name.trim() } }),
    onSuccess: (page) => {
      done(page);
      setRole({ key: "", name: "" });
    },
    onError,
  });
  const addGroup = useMutation({
    mutationFn: () => R.addGroup({ name: group.trim() }),
    onSuccess: (page) => {
      done(page);
      setGroup("");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (x: NonNullable<typeof asking>) => (x.kind === "role" ? R.deleteRole(x.it.key) : R.deleteGroup(x.it.id)),
    onSuccess: (page) => {
      done(page);
      setAsking(null);
    },
    onError,
  });

  if (!q.data) return null;
  const d = q.data;
  const keyOk = ROLE_KEY.test(role.key.trim());

  return (
    <div className={box} data-testid="roles-groups">
      <h2 className="text-lg font-semibold">{say("الأدوار والمجموعات|Roles and groups|תפקידים וקבוצות")}</h2>
      <p className="mt-1 max-w-3xl text-sm text-white/60">
        {say(
          "الدور (مشرف، بائع…) بيخلّي صاحبه يعمل شغلة على كل سطور جدول، والمجموعة (فريق، صف، عيلة) بتخلّي الزبون يشوف اللي أضافوه أعضاء مجموعته. شو بيقدر كل دور يعمل بتختاره بـ«الـ API والمفاتيح» لكل جدول، وعلى باب الـ function.|A role (moderator, seller…) lets its holders do something on every row of a table, and a group (a team, a class, a family) lets a shopper see what their group's members added. What each role may do is chosen in “API & keys” for each table, and on a function's door.|תפקיד (מנחה, מוכר…) מאפשר למחזיקים בו לעשות פעולה על כל שורות הטבלה, וקבוצה (צוות, כיתה, משפחה) מאפשרת ללקוח לראות מה שחברי הקבוצה שלו הוסיפו. מה כל תפקיד רשאי לעשות בוחרים ב«API ומפתחות» לכל טבלה, ובדלת של הפונקציה.",
        )}
      </p>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <section data-testid="roles-list">
          <h3 className="font-semibold">{say("الأدوار|Roles|תפקידים")}</h3>
          <ul className="mt-2 divide-y divide-white/10">
            {d.roles.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-2 py-2" data-testid={`role-${r.key}`}>
                <span className="min-w-0">
                  <span className="font-medium">{roleName(r, r.key, lang)}</span> <bdi dir="ltr" className="text-xs text-white/40">{r.key}</bdi>
                  <span className="block text-xs text-white/50">{say(`${r.shoppers} زبون|${r.shoppers} shoppers|${r.shoppers} לקוחות`)}</span>
                </span>
                {canWrite ? (
                  <button type="button" className="text-xs text-red-300 underline" onClick={() => setAsking({ kind: "role", it: r })} data-testid={`role-${r.key}-delete`}>
                    {say("احذف|Delete|מחיקה")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {!d.roles.length ? <p className="mt-2 text-sm text-white/50">{say("ما في أدوار لهلّق.|No roles yet.|אין עדיין תפקידים.")}</p> : null}
          {canWrite ? (
            <div className="mt-3 space-y-2">
              {d.presets.length ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <span>{say("جاهزين:|Ready:|מוכנים:")}</span>
                  {d.presets.map((p) => (
                    <Button key={p.key} size="sm" variant="secondary" isLoading={preset.isPending && preset.variables === p.key} onClick={() => preset.mutate(p.key)} data-testid={`role-preset-${p.key}`}>
                      + {roleName({ key: p.key, name: p.name }, p.key, lang)}
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input className={field} value={role.name} maxLength={d.limits.name} placeholder={say("الإسم (مثلاً: مدرّب)|The name (e.g. Coach)|השם (למשל: מאמן)")} onChange={(e) => setRole({ ...role, name: e.target.value })} data-testid="role-new-name" />
                <input className={field} dir="ltr" value={role.key} maxLength={31} placeholder="coach" onChange={(e) => setRole({ ...role, key: e.target.value.toLowerCase() })} data-testid="role-new-key" />
                <Button size="sm" disabled={!keyOk || !role.name.trim() || d.roles.length >= d.limits.roles} isLoading={addRole.isPending} onClick={() => addRole.mutate()} data-testid="role-new-add">
                  {say("ضيف|Add|הוספה")}
                </Button>
              </div>
              <p className="text-xs text-white/40">{say("المفتاح بالإنجليزي، حروف صغيرة: هو اللي بتسمّيه الجداول والـ functions، وما بيتغيّر.|The key is in English, small letters: tables and functions name it, and it never changes.|המפתח באנגלית, באותיות קטנות: טבלאות ופונקציות קוראות לו כך, והוא לא משתנה.")}</p>
            </div>
          ) : null}
        </section>

        <section data-testid="groups-list">
          <h3 className="font-semibold">{say("المجموعات|Groups|קבוצות")}</h3>
          <ul className="mt-2 divide-y divide-white/10">
            {d.groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-2" data-testid={`group-${g.id}`}>
                <button type="button" className="min-w-0 text-start" onClick={() => setMembers(g)} data-testid={`group-${g.id}-open`}>
                  <span className="font-medium underline-offset-2 hover:underline">{g.name}</span>
                  <span className="block text-xs text-white/50">{say(`${g.members} عضو|${g.members} members|${g.members} חברים`)}</span>
                </button>
                {canWrite ? (
                  <button type="button" className="text-xs text-red-300 underline" onClick={() => setAsking({ kind: "group", it: g })} data-testid={`group-${g.id}-delete`}>
                    {say("احذف|Delete|מחיקה")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {!d.groups.length ? <p className="mt-2 text-sm text-white/50">{say("ما في مجموعات لهلّق.|No groups yet.|אין עדיין קבוצות.")}</p> : null}
          {canWrite ? (
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input className={field} value={group} maxLength={d.limits.name} placeholder={say("إسم المجموعة (مثلاً: فريق المبيعات)|The group's name (e.g. Sales team)|שם הקבוצה (למשל: צוות המכירות)")} onChange={(e) => setGroup(e.target.value)} data-testid="group-new-name" />
              <Button size="sm" disabled={!group.trim() || d.groups.length >= d.limits.groups} isLoading={addGroup.isPending} onClick={() => addGroup.mutate()} data-testid="group-new-add">
                {say("ضيف|Add|הוספה")}
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      <MembersModal group={members} canWrite={canWrite} onClose={() => setMembers(null)} />
      <ConfirmDialog
        open={!!asking}
        variant="danger"
        title={asking?.kind === "role" ? say("تحذف الدور؟|Delete the role?|למחוק את התפקיד?") : say("تحذف المجموعة؟|Delete the group?|למחוק את הקבוצה?")}
        message={
          asking?.kind === "role"
            ? say(`بينشال من ${asking.it.shoppers} زبون، والجداول والـ functions اللي بتسمّيه ما عاد حدا بيقدر يعمل فيها اللي كان إله.|It is taken from ${asking.it.shoppers} shoppers, and nobody can do what it allowed in the tables and functions that name it any more.|הוא יוסר מ־${asking.it.shoppers} לקוחות, ואף אחד לא יוכל עוד לעשות מה שהוא התיר בטבלאות ובפונקציות שקוראות לו.`)
            : asking
              ? say(`أعضاءها (${asking.it.members}) بيطلعوا منها.|Its ${asking.it.members} members leave it.|${asking.it.members} החברים שלה יוצאים ממנה.`)
              : ""
        }
        confirmText={say("احذف|Delete|מחיקה")}
        isLoading={remove.isPending}
        onConfirm={() => {
          if (asking) remove.mutate(asking);
        }}
        onClose={() => setAsking(null)}
      />
    </div>
  );
}

/** A group's members: added by email, taken out one by one. */
function MembersModal({ group, canWrite, onClose }: { group: ShopperGroup | null; canWrite: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [emails, setEmails] = useState("");
  const q = useQuery({ queryKey: ["shopper-group", group?.id], queryFn: () => R.getMembers(group!.id), enabled: !!group });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["shopper-group", group?.id] });
    await qc.invalidateQueries({ queryKey: ROLES_KEY });
    await qc.invalidateQueries({ queryKey: ["customers"] });
  };
  const add = useMutation({
    mutationFn: () => R.addMembers(group!.id, emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)),
    onSuccess: async (out) => {
      setEmails("");
      await refresh();
      const told = [
        out.added.length ? say(`انضاف ${out.added.length}|${out.added.length} added|${out.added.length} נוספו`) : "",
        out.unknown.length ? say(`ما في حساب: ${out.unknown.join("، ")}|No account: ${out.unknown.join(", ")}|אין חשבון: ${out.unknown.join(", ")}`) : "",
        out.full.length ? say(`بمجموعات كتير: ${out.full.join("، ")}|In too many groups: ${out.full.join(", ")}|ביותר מדי קבוצות: ${out.full.join(", ")}`) : "",
      ].filter(Boolean);
      toast.success(told.join(" · ") || say("كانوا فيها|They were in it already|הם כבר בה"));
    },
    onError: (e) => toast.error(say("ما زبط|That didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  const remove = useMutation({ mutationFn: (user: string) => R.removeMember(group!.id, user), onSuccess: refresh });
  return (
    <Modal open={!!group} title={group?.name ?? ""} description={say("أعضاء المجموعة|The group's members|חברי הקבוצה")} onClose={onClose} widthClassName="max-w-lg">
      <div className="space-y-3 text-sm" data-testid="group-members">
        {canWrite ? (
          <div className="space-y-2">
            <textarea className="min-h-[64px] w-full rounded-xl border border-white/10 bg-surface-925 p-3 text-sm text-white" dir="ltr" value={emails} placeholder="sara@example.com, lina@example.com" onChange={(e) => setEmails(e.target.value)} data-testid="group-members-emails" />
            <Button size="sm" disabled={!emails.trim()} isLoading={add.isPending} onClick={() => add.mutate()} data-testid="group-members-add">
              {say("ضيفهم بإيميلاتهم|Add them by email|הוספה לפי אימייל")}
            </Button>
          </div>
        ) : null}
        <ul className="divide-y divide-white/10">
          {(q.data?.members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2" data-testid={`group-member-${m.email}`}>
              <span className="min-w-0">
                <span>{m.name || say("بدون اسم|No name|ללא שם")}</span>
                <bdi dir="ltr" className="block truncate text-xs text-white/50">{m.email}</bdi>
              </span>
              {canWrite ? (
                <button type="button" className="text-xs text-red-300 underline" onClick={() => remove.mutate(m.id)} data-testid={`group-member-${m.email}-remove`}>
                  {say("طلّعه|Take out|הוצאה")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {q.data && !q.data.members.length ? <p className="text-white/50">{say("ما في أعضاء لهلّق.|No members yet.|אין עדיין חברים.")}</p> : null}
      </div>
    </Modal>
  );
}
