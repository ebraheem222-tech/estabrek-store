// A role's tables, one by one (E0.5): a role with "pages: read / write" has every table of the data
// grid; here a role is given single tables instead, to see their rows or to change them too.
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import type { RoleTable } from "../../api/staff.api";
import { tableKey, toggleTable } from "./teamText";

export function RoleTables({ tables, selected, onChange, canGive }: { tables: RoleTable[]; selected: Set<string>; onChange: (next: Set<string>) => void; /** May the editor give this permission (they hold it themself)? */ canGive: (permission: string) => boolean }) {
  const lang = adminLang();
  if (!tables.length) return null;
  const all = { read: selected.has("pages:read"), write: selected.has("pages:write") };
  return (
    <fieldset className="rounded-xl border border-white/10 p-3" data-testid="role-tables">
      <legend className="px-1 text-sm font-medium">{say("جداول محددة|Single tables|טבלאות מסוימות")}</legend>
      <p className="text-xs text-white/60">
        {say(
          "«الصفحات: مشاهدة / تعديل» فوق بتعطي كل الجداول. من هون بتعطي الدور جداول معيّنة بس: يشوف سطورها، أو يعدّلها كمان. حقول الجدول والـ API تبعه بيضلوا لصاحب صلاحية الصفحات.|“Pages: view / edit” above gives every table. Here the role gets only the tables you tick: to see their rows, or to change them too. A table's fields and its API stay with the pages permission.|«דפים: צפייה / עריכה» למעלה נותן את כל הטבלאות. כאן התפקיד מקבל רק את הטבלאות שתסמנו: לראות את השורות, או גם לשנות אותן. שדות הטבלה וה-API שלה נשארים עם הרשאת הדפים.",
        )}
      </p>
      <ul className="mt-2 space-y-1.5">
        {tables.map((t) => {
          const read = tableKey(t.id, "read");
          const write = tableKey(t.id, "write");
          return (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm" data-testid={`role-table-${t.slug}`}>
              <span className="min-w-0 truncate">{t.name?.[lang]?.trim() || t.name?.ar?.trim() || t.name?.en?.trim() || t.slug}</span>
              <span className="flex gap-4">
                {(
                  [
                    ["read", read, all.read || selected.has(read) || selected.has(write), all.read, say("يشوف|See|צפייה")],
                    ["write", write, all.write || selected.has(write), all.write, say("يعدّل السطور|Change rows|שינוי שורות")],
                  ] as const
                ).map(([what, key, on, fromAll, label]) => (
                  <label key={what} className={`flex items-center gap-1.5 ${fromAll || !canGive(key) ? "opacity-50" : ""}`} title={fromAll ? say("من صلاحية الصفحات فوق|From the pages permission above|מהרשאת הדפים למעלה") : undefined}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-current"
                      checked={on}
                      disabled={fromAll || !canGive(key)}
                      onChange={(e) => onChange(toggleTable(selected, t.id, what, e.target.checked))}
                      data-permission={key}
                    />
                    {label}
                  </label>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
