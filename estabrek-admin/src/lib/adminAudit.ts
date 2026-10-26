import { logSecurityEvent } from "../api/adminSecurity.api";
import type { Role } from "../types/auth";

const LOCAL_AUDIT_KEY = "estabrek.admin.audit.v1";
const MAX_LOCAL_EVENTS = 250;

export type AdminAuditAction =
  | "page.update"
  | "page.status.change"
  | "template.apply"
  | "section.create"
  | "section.update"
  | "section.delete"
  | "section.move"
  | "section.visibility"
  | "section.duplicate";

export type AdminAuditEntity = "page" | "section" | "template";

export type AdminAuditInput = {
  action: AdminAuditAction;
  entity: AdminAuditEntity;
  entityId?: string | null;
  pageId?: string | null;
  role?: Role | null;
  metadata?: Record<string, unknown>;
};

export type LocalAdminAuditEvent = AdminAuditInput & {
  id: string;
  createdAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readLocalAuditEvents(): LocalAdminAuditEvent[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LocalAdminAuditEvent => {
      return !!item && typeof item === "object" && typeof item.id === "string" && typeof item.createdAt === "string";
    });
  } catch {
    return [];
  }
}

function writeLocalAuditEvents(events: LocalAdminAuditEvent[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(events.slice(0, MAX_LOCAL_EVENTS)));
  } catch {
    // Ignore quota/storage errors; audit remains best-effort.
  }
}

export function listLocalAdminAuditEvents(): LocalAdminAuditEvent[] {
  return readLocalAuditEvents();
}

export async function recordAdminAuditEvent(input: AdminAuditInput): Promise<void> {
  const event: LocalAdminAuditEvent = {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
  };

  const existing = readLocalAuditEvents();
  writeLocalAuditEvents([event, ...existing]);

  try {
    await logSecurityEvent({
      type: `CMS_${input.action.toUpperCase().replace(/\./g, "_")}`,
      metadata: {
        source: "admin-dashboard",
        entity: input.entity,
        entityId: input.entityId ?? null,
        pageId: input.pageId ?? null,
        role: input.role ?? null,
        ...(input.metadata ?? {}),
      },
    });
  } catch {
    // Backend audit endpoint may be read-only in some environments.
  }
}
