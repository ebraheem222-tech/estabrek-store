import { appState } from "@/lib/pwaServer";
import { manifestOf } from "@/lib/pwa";

/**
 * GET /manifest.webmanifest — the shop as an app (admin → الإعدادات → التطبيق): its name, icons, colours and
 * where it opens. Not there (404) while the owner hasn't switched the app on.
 */
// Read on each request (the settings behind it are cached by the shop's own fetch cache, and refreshed when the
// owner saves): built as a static file, it would keep the answer it had when the shop was built.
export const dynamic = "force-dynamic";

export async function GET() {
  const state = await appState().catch(() => null);
  if (!state?.app.enabled) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(JSON.stringify(manifestOf(state.site as never, state.colours, state.version)), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
