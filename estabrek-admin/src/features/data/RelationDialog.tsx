/**
 * A new relation for the open table, straight from the grid: the table it links (one of the
 * owner's, or one of the store's: products, categories, orders, customers), how the rows pair up
 * (the four kinds, each drawn with the two tables' names), and what deleting a linked row does.
 *
 * It is a field like any other: the collections page changes or removes it. Here it is added in
 * one step, under the table's relations as they stand (the ones it has, and the ones that link it).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "../../lib/toast";
import { getApiErrorMessage } from "../../api/http";
import { say } from "../../studio/say";
import { Modal } from "../../components/ui/Modal";
import { listCollections, updateCollection, type Collection, type Local, type OnDelete } from "../../api/collections.api";
import type { Lang } from "../../api/data.api";
import { firstLinkable } from "../collections/collectionForms";
import { LINK_KINDS, LINK_KIND_NAME, LINK_KIND_SHORT, ON_DELETE, ON_DELETE_NAME, linkKind, type LinkKind } from "../collections/fieldRules";
import { input } from "./GridCells";
import { LINK_MARKS, relationField } from "./relationField";
import { STORE_FIELD_NAME, STORE_LINK_NAME, storeLinkTables, storeTarget } from "./storeLinks";

const primary = "rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-40";
const label = "block text-xs text-white/60";
const words = (v: Local | undefined | null, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";
export function RelationDialog({ table, lang, onClose, onDone }: { table: Collection; lang: Lang; onClose: () => void; onDone: () => void }) {
  const all = useQuery({ queryKey: ["collections"], queryFn: listCollections });
  const own = useMemo(() => all.data ?? [table], [all.data, table]);
  const theirs = useMemo(() => storeLinkTables(), []);
  const nameOf = (to: string | undefined) => {
    const store = storeTarget(to);
    if (store) return say(STORE_LINK_NAME[store]);
    const c = own.find((x) => x.id === to);
    return c ? words(c.name, lang) || c.slug : say("جدول مش موجود|A table that isn't there|טבלה שאינה קיימת");
  };
  const here = words(table.name, lang) || table.slug;
  const [to, setTo] = useState(() => firstLinkable(own, table.id));
  const [kind, setKind] = useState<LinkKind>("manyToOne");
  const [onDelete, setDelete] = useState<OnDelete>("unlink");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const store = storeTarget(to);
  const target = own.find((c) => c.id === to) ?? null;
  const there = nameOf(to);
  const usual = store ? say(STORE_FIELD_NAME[store]) : there;

  // The relations as they stand: this table's own, and the other tables' that link it.
  const has = table.fields.filter((f) => f.type === "relation");
  const from = own.flatMap((c) => (c.id === table.id ? [] : c.fields.filter((f) => f.type === "relation" && f.to === table.id).map((f) => ({ c, f }))));

  async function save() {
    setBusy(true);
    try {
      const field = relationField(table, { to, kind, onDelete, name, lang }, target);
      await updateCollection(table.id, { slug: table.slug, name: table.name, fields: [...table.fields, field] });
      toast.success(say("انضافت العلاقة|The relation was added|הקישור נוסף"), { description: `${here} ${LINK_MARKS[kind][0]} ─ ${LINK_MARKS[kind][1]} ${there}` });
      onDone();
    } catch (e) {
      toast.error(say("ما انضافت العلاقة|The relation wasn't added|הקישור לא נוסף"), { description: getApiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      disableBackdropClose
      title={say("علاقة جديدة|A new relation|קישור חדש")}
      description={say(`ربط سطور «${here}» بسطور جدول ثاني: من جداولك أو من جداول المتجر.|Link the rows of “${here}” to another table's rows: one of yours, or one of the store's.|קישור השורות של ״${here}״ לשורות של טבלה אחרת: שלך או של החנות.`)}
      widthClassName="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={primary} disabled={busy || !to} onClick={() => void save()} data-testid="relation-save">
            {say("ضيف العلاقة|Add the relation|הוסף את הקישור")}
          </button>
        </div>
      }
    >
      <div className="space-y-4" data-testid="relation-dialog">
        <div className="rounded-lg bg-white/[0.03] p-3 text-xs" data-testid="relation-now">
          <div className="mb-1.5 text-white/55">{say("علاقات هالجدول هلأ|This table's relations now|הקישורים של הטבלה כעת")}</div>
          {!has.length && !from.length ? <div className="text-white/40">{say("ما في ولا علاقة لسا.|None yet.|עדיין אין.")}</div> : null}
          <ul className="space-y-1">
            {has.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-1.5" data-testid={`relation-has-${f.id}`}>
                <bdi className="font-medium text-white/85">{words(f.name, lang) || f.id}</bdi>
                {/* This table's side first, then the linked table's: in the page's own direction, like the cards below. */}
                <b className="rounded bg-white/10 px-1.5 tabular-nums text-white/70">{LINK_MARKS[linkKind(f)][0]}</b>
                <span className="text-white/40" aria-hidden>
                  ─
                </span>
                <b className="rounded bg-white/10 px-1.5 tabular-nums text-white/70">{LINK_MARKS[linkKind(f)][1]}</b>
                <bdi className="text-white/75">{nameOf(f.to)}</bdi>
                <span className="text-white/40">· {say(LINK_KIND_SHORT[linkKind(f)])}</span>
              </li>
            ))}
            {from.map(({ c, f }) => (
              <li key={`${c.id}.${f.id}`} className="flex flex-wrap items-center gap-1.5 text-white/60" data-testid={`relation-from-${c.slug}-${f.id}`}>
                <span>{say("مربوط من|Linked from|מקושר מ")}</span>
                <bdi className="text-white/75">{`${words(c.name, lang) || c.slug} · ${words(f.name, lang) || f.id}`}</bdi>
                <span className="text-white/40">· {say(LINK_KIND_SHORT[linkKind(f)])}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className={label}>
            {say("الجدول اللي بيرتبط فيه|The table it links|הטבלה המקושרת")}
            <select className={`${input} mt-1`} value={to} onChange={(e) => setTo(e.target.value)} data-testid="relation-to">
              <optgroup label={say("جداولك|Your tables|הטבלאות שלך")}>
                {own.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id === table.id ? `${words(c.name, lang) || c.slug} (${say("هالجدول نفسه|this table|הטבלה הזו")})` : words(c.name, lang) || c.slug}
                  </option>
                ))}
              </optgroup>
              <optgroup label={say("جداول المتجر|The store's tables|טבלאות החנות")}>
                {theirs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {say(t.name)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className={label}>
            {say("إسم العمود|The column's name|שם העמודה")}
            <input className={`${input} mt-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder={usual} maxLength={60} data-testid="relation-name" />
          </label>
        </div>

        <div role="radiogroup" aria-label={say("كيف بيرتبطوا|How they pair up|איך הן מתקשרות")} className="grid gap-2 md:grid-cols-2" data-testid="relation-kinds">
          {LINK_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              data-testid={`relation-kind-${k}`}
              className={`rounded-xl border p-3 text-start ${kind === k ? "border-accent-500/70 bg-accent-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
            >
              <span className="block text-sm font-medium">{say(LINK_KIND_SHORT[k])}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-white/80">
                <bdi className="max-w-[9rem] truncate">{here}</bdi>
                <b className="rounded bg-white/10 px-1.5 tabular-nums">{LINK_MARKS[k][0]}</b>
                <span className="text-white/40" aria-hidden>
                  ─
                </span>
                <b className="rounded bg-white/10 px-1.5 tabular-nums">{LINK_MARKS[k][1]}</b>
                <bdi className="max-w-[9rem] truncate">{there}</bdi>
              </span>
              <span className="mt-1.5 block text-[11px] leading-5 text-white/50">{say(LINK_KIND_NAME[k])}</span>
            </button>
          ))}
        </div>

        {store ? (
          <p className="text-[11px] leading-5 text-white/55" data-testid="relation-store-note">
            {say(
              "سطر المتجر ما بيتغيّر من هون أبداً. وإذا انحذف من المتجر، الربط بينفك لحاله وسطورك بتضل. وإسم السطر المربوط بيبين بس للي معه صلاحية يشوف هالجدول بالمتجر.|The store's row is never changed from here. If it is deleted in the store, the link is dropped and your rows stay. A linked row's name shows only to who may see that table in the store.|שורת החנות אינה משתנה מכאן לעולם. אם היא נמחקת בחנות, הקישור מתבטל והשורות שלך נשארות. שם השורה המקושרת מוצג רק למי שמורשה לראות את הטבלה הזו בחנות.",
            )}
          </p>
        ) : (
          <label className={label}>
            {say("لما ينحذف السطر المربوط|When the linked row is deleted|כשהשורה המקושרת נמחקת")}
            <select className={`${input} mt-1`} value={onDelete} onChange={(e) => setDelete(e.target.value as OnDelete)} data-testid="relation-ondelete">
              {ON_DELETE.map((v) => (
                <option key={v} value={v}>
                  {say(ON_DELETE_NAME[v])}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </Modal>
  );
}
