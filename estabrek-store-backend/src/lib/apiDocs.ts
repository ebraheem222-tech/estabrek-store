/**
 * The automatic API, described (B4): an OpenAPI document and TypeScript types, both made from
 * the tables' own fields, so a table that is opened is documented without a line written for it.
 * Pure: the routes hand over the tables a caller reaches (lib/dataApi.ts docTables), and the
 * document only ever says what that caller could call anyway.
 */
import type { Field } from "./collectionTree.js";
import type { Act } from "./apiKeys.js";
import { API_LIMITS, type DocTable } from "./dataApi.js";
import { GRID_LIMITS, OPS_BY_KIND, STATUSES, type ColumnKind } from "./dataQuery.js";

type Json = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const param = (name: string) => ({ $ref: `#/components/parameters/${name}` });
const answer = (name: string) => ({ $ref: `#/components/responses/${name}` });
const orNull = (schema: Json) => ({ oneOf: [schema, { type: "null" }] });

/** A name for a table's types: "demo-articles" → DemoArticles (a second table that would get the same name gets a number). */
export function typeNames(slugs: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const taken = new Set<string>();
  for (const slug of slugs) {
    const joined = slug.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
    const base = /^[A-Za-z]/.test(joined) ? joined : `T${joined}`;
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base}${n}`;
    taken.add(name);
    out.set(slug, name);
  }
  return out;
}

/** A name to read in documents: English first, then what there is, then the address. */
export function docName(name: unknown, fallback: string): string {
  const o = name && typeof name === "object" ? (name as Record<string, unknown>) : {};
  for (const l of ["en", "ar", "he"]) if (typeof o[l] === "string" && (o[l] as string).trim()) return (o[l] as string).trim();
  return fallback;
}

/** The fields a caller sees: every field but the relations to tables it can't read. */
export const shownFields = (table: DocTable) => table.fields.filter((f) => f.type !== "relation" || table.links.has(f.id));
/** The fields a caller may write (a key writes the private ones too). */
export const writtenFields = (table: DocTable) => (table.writeFields ?? table.fields).filter((f) => f.type !== "relation" || table.links.has(f.id));

const choices = (f: Field) => (f.options?.length ? { enum: f.options.map((o) => o.id) } : {});
const limits = (f: Field) => ({ ...(typeof f.min === "number" ? { minimum: f.min } : {}), ...(typeof f.max === "number" ? { maximum: f.max } : {}) });
const about = (f: Field) => {
  const name = docName(f.name, "");
  const notes = [name && name !== f.id ? name.replace(/\.+$/, "") : "", f.unique ? "Unique in the table" : ""].filter(Boolean);
  return notes.length ? { description: `${notes.join(". ")}.` } : {};
};

/** A field's value as a row answers it. */
function valueSchema(f: Field): Json {
  switch (f.type) {
    case "text":
    case "longText":
      return { ...orNull({ oneOf: [ref("Words"), { type: "string" }] }), description: [about(f).description, "Words by language; one string when `lang` is asked."].filter(Boolean).join(" ") };
    case "number":
    case "money":
      return { ...orNull({ type: "number", ...limits(f) }), ...about(f) };
    case "boolean":
      return { ...orNull({ type: "boolean" }), ...about(f) };
    case "date":
      return { ...orNull({ type: "string", format: "date" }), ...about(f) };
    case "datetime":
      return { ...orNull({ type: "string", format: "date-time" }), ...about(f) };
    case "select":
      return { ...orNull({ type: "string", ...choices(f) }), ...about(f) };
    case "multiSelect":
      return { ...orNull({ type: "array", items: { type: "string", ...choices(f) } }), ...about(f) };
    case "email":
      return { ...orNull({ type: "string", format: "email" }), ...about(f) };
    case "location":
      return { ...orNull(ref("Place")), ...about(f) };
    case "json":
      return { description: [about(f).description, "Any JSON."].filter(Boolean).join(" ") };
    case "relation":
      return { type: "array", items: { oneOf: [ref("LinkedRow"), { type: "object", description: "The linked row itself, when the relation is named in `expand`." }] }, ...about(f) };
    default:
      // A picture, a file, a video, a 3D model, a link, a colour, a phone: words.
      return { ...orNull({ type: "string" }), ...about(f) };
  }
}

/** A field's value as a write takes it. */
function inputSchema(f: Field): Json {
  switch (f.type) {
    case "text":
    case "longText":
      return { oneOf: [{ type: "string", description: "Goes to the language in `lang` (ar when not given)." }, ref("Words")], ...about(f) };
    case "relation":
      return { type: "array", items: { type: "string", description: "A row's id or address." }, ...about(f) };
    case "json":
      return { description: [about(f).description, "Any JSON."].filter(Boolean).join(" ") };
    default: {
      // The same as answered, without "nothing" (null or "" in a change empties the field).
      const { oneOf, ...rest } = valueSchema(f) as { oneOf?: Json[] } & Json;
      return { ...(oneOf?.[0] ?? {}), ...rest };
    }
  }
}

/** What a list can be asked of each column: the questions its kind takes. */
function filterTable(table: DocTable): string {
  const rows = shownFields(table).map((f) => `| \`${f.id}\` | ${OPS_BY_KIND[f.type as ColumnKind].join(", ")} |`);
  rows.push(`| \`slug\` | ${OPS_BY_KIND.$slug.join(", ")} |`, `| \`status\` | ${OPS_BY_KIND.$status.join(", ")} |`, `| \`createdAt\`, \`updatedAt\`, \`publishedAt\` | ${OPS_BY_KIND.$date.join(", ")} |`);
  return [
    "Filters are written `field[question]=value`, for example `price[gte]=10`. Several filters must all hold; `match=any` asks for any of them.",
    "`anyOf` takes values separated by commas, `between` takes two; `empty`, `notEmpty`, `isTrue` and `isFalse` need no value (`=1`). A day is written `2026-12-31`.",
    "A table's own field named like one of the row's columns wins; the row's own is then `$slug`, `$status`, `$createdAt`…",
    "",
    "| Column | Questions |",
    "| --- | --- |",
    ...rows,
  ].join("\n");
}

const SECURITY = { key: [{ apiKey: [] }], customer: [{ shopper: [] }, { apiKey: [] }], public: [{}, { apiKey: [] }] } as const;
const WHO_SAYS = {
  key: "Needs an API key.",
  customer: "For a signed-in shopper, on their own rows only (their token in `Authorization: Bearer`); a key reaches every row.",
  public: "Open to everyone; a key sees more (every row outside the trash).",
} as const;

/** The whole document for these tables. `server` is where the routes start ("/v1/data"). */
export function openApi(tables: DocTable[], opts: { server: string; title?: string }): Json {
  const names = typeNames(tables.map((t) => t.slug));
  const paths: Json = {
    "/": {
      get: {
        operationId: "listTables",
        summary: "The tables this caller reaches",
        description: "Each with its fields and what the caller may do there. Without a key: the tables open to everyone.",
        security: SECURITY.public,
        responses: { "200": { description: "The tables", content: { "application/json": { schema: { type: "object", properties: { tables: { type: "array", items: { type: "object" } } } } } } }, "401": answer("Unauthorized"), "429": answer("TooMany") },
      },
    },
  };
  const schemas: Json = {
    Words: { type: "object", description: "Words by language.", properties: { ar: { type: "string" }, en: { type: "string" }, he: { type: "string" } }, additionalProperties: false },
    Status: { type: "string", enum: [...STATUSES] },
    Place: { type: "object", required: ["lat", "lng"], properties: { lat: { type: "number", minimum: -90, maximum: 90 }, lng: { type: "number", minimum: -180, maximum: 180 }, label: { type: "string" } } },
    LinkedRow: { type: "object", description: "A row another row links, lightly.", required: ["id", "slug", "status"], properties: { id: { type: "string" }, slug: { type: "string" }, status: ref("Status"), title: orNull({ oneOf: [ref("Words"), { type: "string" }] }) } },
    Error: { type: "object", required: ["error"], properties: { error: { type: "string", description: "A code: BAD_QUERY, ROW_INVALID, KEY_NEEDED, INVALID_KEY, NOT_ALLOWED, NOT_FOUND, RATE_LIMIT_KEY…" }, message: { type: "string" }, details: { description: "What exactly was wrong: for ROW_INVALID, `issues` with each field and why." } } },
  };

  for (const table of tables) {
    const T = names.get(table.slug)!;
    const title = docName(table.name, table.slug);
    const fields = shownFields(table);
    const rowPath = `/${table.slug}/{row}`;
    const act = (which: Act) => table.acts[which];
    const who = (which: Act) => ({ security: SECURITY[act(which)!], tags: [table.slug] });
    const says = (which: Act, text: string) => `${text} ${WHO_SAYS[act(which)!]}`;
    const body = (name: string) => ({ required: true, content: { "application/json": { schema: ref(name) } } });
    const row = (description: string) => ({ description, content: { "application/json": { schema: ref(`${T}Row`) } } });

    schemas[`${T}Values`] = { type: "object", description: `A row's values in "${title}": every field, null where the row has nothing.`, properties: Object.fromEntries(fields.map((f) => [f.id, valueSchema(f)])) };
    schemas[`${T}Row`] = { type: "object", required: ["id", "slug", "status", "values", "createdAt", "updatedAt", "publishedAt"], properties: { id: { type: "string" }, slug: { type: "string", description: "The row's address." }, status: ref("Status"), values: ref(`${T}Values`), createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }, publishedAt: orNull({ type: "string", format: "date-time" }) } };
    if (act("read")) schemas[`${T}Page`] = { type: "object", required: ["data", "page", "pageSize", "total", "pages"], properties: { data: { type: "array", items: ref(`${T}Row`) }, page: { type: "integer" }, pageSize: { type: "integer" }, total: { type: "integer", description: "Every row the question matches." }, pages: { type: "integer" } } };
    if (act("create") || act("update")) {
      const written = writtenFields(table);
      const required = written.filter((f) => f.required).map((f) => f.id);
      const input = Object.fromEntries(written.map((f) => [f.id, inputSchema(f)]));
      const own = { slug: { type: "string", description: "The row's address (made from its words when not given). Set with a key only." }, status: { ...ref("Status"), description: "Set with a key only; a row from anyone is a draft." }, lang: { type: "string", enum: ["ar", "en", "he"], description: "The language plain words go to." } };
      if (act("create")) schemas[`${T}Create`] = { type: "object", required: ["values"], properties: { values: { type: "object", properties: input, ...(required.length ? { required } : {}), additionalProperties: false }, ...own }, additionalProperties: false };
      if (act("update")) schemas[`${T}Change`] = { type: "object", description: "Only what is sent changes; the rest of the row stays.", properties: { values: { type: "object", properties: input, additionalProperties: false }, ...own }, additionalProperties: false };
    }

    const list: Json = {};
    if (act("read"))
      list.get = {
        operationId: `list${T}`,
        summary: `A page of "${title}"`,
        description: `${says("read", "Rows filtered, sorted and searched from the address.")} Without a key only published rows are seen.\n\n${filterTable(table)}`,
        ...who("read"),
        parameters: [param("page"), param("pageSize"), param("sort"), param("search"), param("lang"), param("status"), param("fields"), ...(table.links.size ? [param("expand")] : []), param("match"), ...(act("read") === "public" ? [param("mine")] : [])],
        responses: { "200": { description: "A page of rows", content: { "application/json": { schema: ref(`${T}Page`) } } }, "400": answer("BadRequest"), "401": answer("Unauthorized"), "403": answer("Forbidden"), "404": answer("NotFound"), "429": answer("TooMany") },
      };
    if (act("create"))
      list.post = {
        operationId: `add${T}`,
        summary: `A new row in "${title}"`,
        description: says("create", `The table's own rules hold (required fields, limits, the only value).${act("create") === "public" ? ` Without a key the row is a draft, and up to ${API_LIMITS.publicWritesPerMinute} rows a minute are taken from one place.` : ""}`),
        ...who("create"),
        requestBody: body(`${T}Create`),
        responses: { "201": row("The row as saved"), "400": answer("BadRequest"), "401": answer("Unauthorized"), "403": answer("Forbidden"), "404": answer("NotFound"), "409": answer("Conflict"), "429": answer("TooMany") },
      };
    if (Object.keys(list).length) paths[`/${table.slug}`] = list;

    const one: Json = {};
    if (act("read"))
      one.get = {
        operationId: `get${T}`,
        summary: `One row of "${title}"`,
        description: says("read", "By its id or its address."),
        ...who("read"),
        parameters: [param("row"), param("lang"), param("fields"), ...(table.links.size ? [param("expand")] : [])],
        responses: { "200": row("The row"), "400": answer("BadRequest"), "401": answer("Unauthorized"), "403": answer("Forbidden"), "404": answer("NotFound"), "429": answer("TooMany") },
      };
    if (act("update"))
      one.patch = {
        operationId: `change${T}`,
        summary: `Change a row of "${title}"`,
        description: says("update", "Some of its values, its status or its address; what isn't sent stays."),
        ...who("update"),
        parameters: [param("row")],
        requestBody: body(`${T}Change`),
        responses: { "200": row("The row as saved"), "400": answer("BadRequest"), "401": answer("Unauthorized"), "403": answer("Forbidden"), "404": answer("NotFound"), "409": answer("Conflict"), "429": answer("TooMany") },
      };
    if (act("delete"))
      one.delete = {
        operationId: `delete${T}`,
        summary: `Delete a row of "${title}"`,
        description: says("delete", "The row goes to the trash (the admin can bring it back for 30 days). Rows that link it are unlinked, deleted with it, or hold it back (409 ROWS_LINKED), as their relation says."),
        ...who("delete"),
        parameters: [param("row")],
        responses: { "200": { description: "Deleted", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, id: { type: "string" }, withThem: { type: "integer", description: "Rows deleted with it." } } } } } }, "401": answer("Unauthorized"), "403": answer("Forbidden"), "404": answer("NotFound"), "409": answer("Conflict"), "429": answer("TooMany") },
      };
    if (Object.keys(one).length) paths[rowPath] = one;
  }

  const fail = (description: string) => ({ description, content: { "application/json": { schema: ref("Error") } } });
  return {
    openapi: "3.1.0",
    info: {
      title: opts.title ?? "Data API",
      version: "1",
      description: "Made from the store's own tables: each table its owner opens has these routes. A key goes in the `X-Api-Key` header, never in the address. Without a key only published rows are seen; a signed-in shopper also reaches their own rows where a table lets them.",
    },
    servers: [{ url: opts.server }],
    tags: tables.map((t) => ({ name: t.slug, description: docName(t.name, t.slug) })),
    paths,
    components: {
      securitySchemes: {
        apiKey: { type: "apiKey", in: "header", name: "X-Api-Key", description: "Made in the admin (API & keys). Also accepted as `Authorization: Bearer <key>`." },
        shopper: { type: "http", scheme: "bearer", description: "A signed-in shopper's own token (the store's sign-in gives it). It reaches that shopper's rows only." },
      },
      parameters: {
        row: { name: "row", in: "path", required: true, schema: { type: "string" }, description: "The row's id or its address." },
        page: { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        pageSize: { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: API_LIMITS.pageSize, default: API_LIMITS.pageSizeDefault } },
        sort: { name: "sort", in: "query", schema: { type: "string" }, description: `Columns separated by commas, \`-\` in front for the other way: \`-price,title\`. Up to ${GRID_LIMITS.sorts}.` },
        search: { name: "search", in: "query", schema: { type: "string", maxLength: GRID_LIMITS.search }, description: "Words to look for anywhere in a row." },
        lang: { name: "lang", in: "query", schema: { type: "string", enum: ["ar", "en", "he"] }, description: "Answers words as one string in this language (another stands in when it has none), and sorts by it." },
        status: { name: "status", in: "query", schema: { type: "string", enum: ["all", "draft", "published", "archived"] }, description: "With a key only; without one the rows are always the published ones." },
        fields: { name: "fields", in: "query", schema: { type: "string" }, description: "Only these fields, separated by commas." },
        expand: { name: "expand", in: "query", schema: { type: "string" }, description: `Relations to answer as the linked rows themselves, separated by commas (up to ${API_LIMITS.expand}).` },
        match: { name: "match", in: "query", schema: { type: "string", enum: ["all", "any"], default: "all" }, description: "Every filter, or any of them." },
        mine: { name: "mine", in: "query", schema: { type: "string", enum: ["1"] }, description: "With a shopper's token: only that shopper's own rows, whatever their status." },
      },
      responses: {
        BadRequest: fail("The question or the values are wrong (BAD_QUERY, ROW_INVALID, VALIDATION_ERROR): `message` and `details` say what."),
        Unauthorized: fail("A key is needed (KEY_NEEDED), or the one sent doesn't work (INVALID_KEY, KEY_REVOKED, KEY_EXPIRED)."),
        Forbidden: fail("The table isn't open for this, or the key doesn't reach it (NOT_ALLOWED)."),
        NotFound: fail("No such table or row (a closed table answers the same)."),
        Conflict: fail("The address is taken (SLUG_TAKEN), or other rows hold this one (ROWS_LINKED)."),
        TooMany: fail("Too many requests: the key's own limit (RATE_LIMIT_KEY) or the server's (RATE_LIMIT). `Retry-After` says when."),
      },
      schemas,
    },
  };
}

/* ---------------- TypeScript ---------------- */

const literal = (f: Field) => (f.options?.length ? f.options.map((o) => JSON.stringify(o.id)).join(" | ") : "string");

/** A field's type as answered (`T` is `Words`, or `string` when `lang` is asked). */
function valueType(f: Field): string {
  switch (f.type) {
    case "text":
    case "longText":
      return "T | null";
    case "number":
    case "money":
      return "number | null";
    case "boolean":
      return "boolean | null";
    case "select":
      return `${literal(f)} | null`;
    case "multiSelect":
      return `Array<${literal(f)}> | null`;
    case "location":
      return "Place | null";
    case "json":
      return "unknown";
    case "relation":
      return "LinkedRow<T>[]";
    default:
      return "string | null";
  }
}

function inputType(f: Field): string {
  switch (f.type) {
    case "text":
    case "longText":
      return "string | Words";
    case "number":
    case "money":
      return "number";
    case "boolean":
      return "boolean";
    case "select":
      return literal(f);
    case "multiSelect":
      return `Array<${literal(f)}>`;
    case "location":
      return "Place";
    case "json":
      return "unknown";
    case "relation":
      return "string[]";
    default:
      return "string";
  }
}

/** The same tables as types to paste into a program. */
export function typesText(tables: DocTable[], opts: { server: string }): string {
  const names = typeNames(tables.map((t) => t.slug));
  const out: string[] = [
    "// Types for the store's data API, made from its tables' fields.",
    "// Made again whenever a table changes: copy them afresh then.",
    "",
    'export type Lang = "ar" | "en" | "he";',
    "/** Words by language: what a text field holds. With ?lang=… the API answers one string instead. */",
    "export type Words = Partial<Record<Lang, string>>;",
    `export type Status = ${STATUSES.map((s) => JSON.stringify(s)).join(" | ")};`,
    "export type Place = { lat: number; lng: number; label?: string };",
    "/** A row another row links. */",
    "export type LinkedRow<T = Words> = { id: string; slug: string; status: Status; title: T | null };",
    "export type Row<V> = { id: string; slug: string; status: Status; values: V; createdAt: string; updatedAt: string; publishedAt: string | null };",
    "export type Page<R> = { data: R[]; page: number; pageSize: number; total: number; pages: number };",
    "export type ApiError = { error: string; message?: string; details?: unknown };",
  ];
  for (const table of tables) {
    const T = names.get(table.slug)!;
    const fields = shownFields(table);
    out.push("", `/** ${docName(table.name, table.slug).replace(/\*\//g, "* /")}: ${opts.server}/${table.slug} */`);
    out.push(`export type ${T}Values<T = Words> = {`, ...fields.map((f) => `  ${f.id}: ${valueType(f)};`), "};");
    out.push(`/** ${T}Row is what the API answers; ${T}Row<string> when ?lang is asked. */`, `export type ${T}Row<T = Words> = Row<${T}Values<T>>;`);
    if (table.acts.create || table.acts.update) {
      // Required fields first, as a new row needs them; a change takes any of them.
      const written = writtenFields(table);
      const sorted = [...written.filter((f) => f.required), ...written.filter((f) => !f.required)];
      out.push(`/** The values a new row takes (a change takes Partial<${T}Input>). */`, `export type ${T}Input = {`, ...sorted.map((f) => `  ${f.id}${f.required ? "" : "?"}: ${inputType(f)}${f.required ? "" : " | null"};`), "};");
    }
  }
  return `${out.join("\n")}\n`;
}
