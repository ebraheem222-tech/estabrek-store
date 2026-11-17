/**
 * What a member is told of the rows a row links, and of who links it (lib/links.ts LinkView).
 *
 *  - A row of one of the store's tables is named to who may see that table (its own page's permission).
 *  - A row of one of the owner's tables is named to who may see that table: every one through pages:read, else the
 *    ones their role was given one by one (middleware/access.ts tableScope). To the others it is told by its id alone,
 *    and it is never looked up for them by name.
 *  - Who links a row (a grid's linked-from columns) is said only through the tables they may see: a linking row is
 *    named, and the column itself names its table.
 */
import { hasPermission, tableScope } from "../middleware/access.js";
import type { AdminAccess } from "../types/auth.js";
import { storePermission, type StoreId } from "./storeLinks.js";
import type { Incoming, LinkView } from "./links.js";

type Who = { access?: AdminAccess };

export function linkView(req: Who): LinkView {
  const scope = tableScope(req);
  return { store: (s: StoreId) => hasPermission(req, storePermission(s)), ...(scope ? { table: (id: string) => scope.has(id) } : {}) };
}

/** The relations linking a table, as far as this member may see the tables they belong to. */
export function seenIncoming(req: Who, incoming: Incoming[]): Incoming[] {
  const scope = tableScope(req);
  return scope ? incoming.filter((x) => scope.has(x.table)) : incoming;
}

/** A table as this member's grid gets it: its linked-from columns, only those of tables they may see. */
export function seenTable<T extends { incoming: Incoming[] }>(req: Who, table: T): T {
  const incoming = seenIncoming(req, table.incoming);
  return incoming.length === table.incoming.length ? table : { ...table, incoming };
}
