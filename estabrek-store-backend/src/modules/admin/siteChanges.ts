/**
 * Changes to the shop's settings made by the server on the owner's behalf (a
 * season starting, a scheduled change): the theme, maintenance mode, the
 * announcement bar. Each is kept in the settings history first (with a note
 * saying why) and the shop is refreshed, as when the owner saves the settings.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

export function themeOf(header: unknown) {
  const h = header && typeof header === "object" ? (header as Record<string, unknown>) : {};
  const t = h.theme && typeof h.theme === "object" ? (h.theme as Record<string, unknown>) : {};
  return { h, t, presetId: typeof t.presetId === "string" ? t.presetId : null };
}

export async function themePresetNow() {
  return themeOf((await getOrCreateSettings()).header).presetId;
}

/** Sets the theme preset (null = the shop's default). Returns the one before. */
export async function setThemePreset(presetId: string | null, note: string) {
  const s = await getOrCreateSettings();
  const { h, t, presetId: before } = themeOf(s.header);
  if (before === presetId) return before;
  const theme = { ...t };
  if (presetId) theme.presetId = presetId;
  else delete theme.presetId;
  await keepRevision(s as unknown as Record<string, unknown>, ["header.theme"], null, note);
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: { ...h, theme } as object } });
  triggerSettingsRevalidate();
  return before;
}

export type Maintenance = { on: boolean; message: string | null };

export async function maintenanceNow(): Promise<Maintenance> {
  const s = await getOrCreateSettings();
  return { on: s.maintenanceMode === true, message: s.maintenanceMessage ?? null };
}

/** Maintenance on or off (a message only replaces the saved one when given). Returns how it was. */
export async function setMaintenance(next: { on: boolean; message?: string | null }, note: string): Promise<Maintenance> {
  const s = await getOrCreateSettings();
  const before = { on: s.maintenanceMode === true, message: s.maintenanceMessage ?? null };
  const data: Record<string, unknown> = { maintenanceMode: next.on };
  if (next.message !== undefined) data.maintenanceMessage = next.message;
  // The owner's preview link needs a key (made once, then kept), as in the settings page.
  if (next.on && !s.maintenanceKey) data.maintenanceKey = randomBytes(12).toString("base64url");
  const changed = ["maintenanceMode", ...(next.message !== undefined && next.message !== before.message ? ["maintenanceMessage"] : [])];
  if (before.on === next.on && !changed.includes("maintenanceMessage")) return before;
  await keepRevision(s as unknown as Record<string, unknown>, changed, null, note);
  await prisma.siteSettings.update({ where: { id: s.id }, data });
  triggerSettingsRevalidate();
  return before;
}

export type Announcement = { on: boolean; text: string | null; link: string | null };

export async function announcementNow(): Promise<Announcement> {
  const s = await getOrCreateSettings();
  return { on: s.announcementIsActive === true, text: s.announcementText ?? null, link: s.announcementLinkUrl ?? null };
}

/** The announcement bar (text and link only replace the saved ones when given). Returns how it was. */
export async function setAnnouncement(next: { on: boolean; text?: string | null; link?: string | null }, note: string): Promise<Announcement> {
  const s = await getOrCreateSettings();
  const before = { on: s.announcementIsActive === true, text: s.announcementText ?? null, link: s.announcementLinkUrl ?? null };
  const data: Record<string, unknown> = { announcementIsActive: next.on };
  if (next.text !== undefined) data.announcementText = next.text;
  if (next.link !== undefined) data.announcementLinkUrl = next.link;
  const changed = [
    ...(before.on !== next.on ? ["announcementIsActive"] : []),
    ...(next.text !== undefined && next.text !== before.text ? ["announcementText"] : []),
    ...(next.link !== undefined && next.link !== before.link ? ["announcementLinkUrl"] : []),
  ];
  if (!changed.length) return before;
  await keepRevision(s as unknown as Record<string, unknown>, changed, null, note);
  await prisma.siteSettings.update({ where: { id: s.id }, data });
  triggerSettingsRevalidate();
  return before;
}
