// The shoppers' roles, as the admin's pages pick them (the customer's details, a table's access, a function's door).
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { adminLang } from "../../lib/lang";
import { getRoles, type Local, type ShopperRole } from "../../api/shopperRoles.api";

export const ROLES_KEY = ["shopper-roles"] as const;

/** The roles and groups there are; nothing for a member who may not see the customers. */
export function useShopperRoles() {
  const { hasPermission } = useAuth();
  return useQuery({ queryKey: ROLES_KEY, queryFn: getRoles, enabled: hasPermission("customers:read"), staleTime: 30_000 });
}

/** A role's name in the admin's language, else any it has, else its key. */
export function roleName(role: { key: string; name: Local } | undefined, key: string, lang = adminLang()): string {
  const n = role?.name;
  return n?.[lang]?.trim() || n?.ar?.trim() || n?.en?.trim() || n?.he?.trim() || key;
}

/** Chips to tick: which roles. A role named here that isn't there any more shows struck out (it can be taken away). */
export function RolePicker({ roles, value, onChange, disabled, testid, max = 10 }: { roles: ShopperRole[]; value: string[]; onChange: (next: string[]) => void; disabled?: boolean; testid: string; max?: number }) {
  const lang = adminLang();
  const gone = value.filter((k) => !roles.some((r) => r.key === k));
  return (
    <div className="flex flex-wrap gap-1.5" data-testid={testid}>
      {roles.map((r) => {
        const on = value.includes(r.key);
        return (
          <button
            key={r.key}
            type="button"
            aria-pressed={on}
            disabled={disabled || (!on && value.length >= max)}
            onClick={() => onChange(on ? value.filter((k) => k !== r.key) : [...value, r.key])}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? "border-sky-300/60 bg-sky-400/20 text-white" : "border-white/15 text-white/60 hover:text-white"} disabled:opacity-50`}
            data-testid={`${testid}-${r.key}`}
          >
            {on ? "✓ " : ""}
            {roleName(r, r.key, lang)}
          </button>
        );
      })}
      {gone.map((k) => (
        <button key={k} type="button" disabled={disabled} onClick={() => onChange(value.filter((x) => x !== k))} className="rounded-full border border-red-300/40 px-2.5 py-1 text-xs text-red-200 line-through" data-testid={`${testid}-${k}`}>
          {k}
        </button>
      ))}
    </div>
  );
}
