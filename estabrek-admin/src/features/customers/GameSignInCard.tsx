// الزبائن → الدخول بحساب Discord وربط Steam (sites wave G2; backend lib/socialSignIn.ts, header.signIn.discord and
// header.signIn.steam): a game server's players sign in with Discord and link the Steam account they play with.
// Discord needs the owner's own Discord application (free): its client ID here, its secret kept as DISCORD_CLIENT_SECRET
// in الاتصالات والأسرار (never typed here). Steam needs nothing. Both stay off until switched on; the card stays folded
// on a store that doesn't use them.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { getSettings, updateSettings } from "../../api/settings.api";
import { getConnections } from "../../api/connections.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import { DISCORD_CLIENT, DISCORD_SECRET, gameSignInOf, shopOrigin, type GameSignIn } from "./signInSettings";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 w-full rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";

export function GameSignInCard({ accountsOn }: { accountsOn: boolean }) {
  const qc = useQueryClient();
  const settings = useSettings();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const canSeeSecrets = hasPermission("connections:read");
  const saved = useMemo(() => (settings.data ? gameSignInOf(settings.data.header) : null), [settings.data]);
  const [draft, setDraft] = useState<GameSignIn>({ discord: { enabled: false, clientId: "" }, steam: { enabled: false } });
  const [open, setOpen] = useState(false);
  const key = JSON.stringify(saved);
  useEffect(() => {
    if (!saved) return;
    setDraft(saved);
    if (saved.discord.enabled || saved.steam.enabled) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const conns = useQuery({ queryKey: ["connections"], queryFn: getConnections, enabled: open && canSeeSecrets });
  const save = useMutation({
    mutationFn: async (next: GameSignIn) => {
      // The header as it is now (another card may have saved meanwhile), with these two parts replaced.
      const current = await getSettings();
      const header = (current.header ?? {}) as Record<string, unknown>;
      const signIn = (header.signIn && typeof header.signIn === "object" ? header.signIn : {}) as Record<string, unknown>;
      return updateSettings({ header: { ...header, signIn: { ...signIn, discord: { enabled: next.discord.enabled, clientId: next.discord.clientId.trim() }, steam: { enabled: next.steam.enabled } } } });
    },
    onSuccess: async () => {
      toast.success(say("انحفظ|Saved|נשמר"));
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(say("ما انحفظ|It wasn't saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });
  if (!saved) return null;
  const idOk = DISCORD_CLIENT.test(draft.discord.clientId.trim());
  const dirty = JSON.stringify({ ...draft, discord: { ...draft.discord, clientId: draft.discord.clientId.trim() } }) !== JSON.stringify(saved);
  const discordOn = saved.discord.enabled && DISCORD_CLIENT.test(saved.discord.clientId);
  const kept = conns.data ? conns.data.secrets.some((s) => s.name === DISCORD_SECRET) : null;
  const callback = `${shopOrigin()}/api/account/discord/callback`;

  return (
    <div className={box} data-testid="game-sign-in-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{say("الدخول بحساب Discord وربط Steam|Sign in with Discord, link Steam|כניסה עם Discord וקישור Steam")}</h2>
          <p className="mt-1 max-w-3xl text-sm text-white/60">
            {say(
              "لسيرفرات الألعاب والمجتمعات: اللاعب بيفوت بحساب Discord تبعه، وبيربط حساب Steam اللي بيلعب فيه من صفحة «حسابي». اللي عنده حساب بنفس الإيميل بيفوت على نفس الحساب.|For game servers and communities: players sign in with their Discord account, and link the Steam account they play with from “My account”. Someone with an account under the same email gets that same account.|לשרתי משחקים ולקהילות: השחקן נכנס עם חשבון ה-Discord שלו, ומקשר את חשבון ה-Steam שהוא משחק בו מ«החשבון שלי». מי שיש לו חשבון עם אותו אימייל נכנס לאותו חשבון.",
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${discordOn || saved.steam.enabled ? "text-emerald-300" : "text-white/50"}`} data-testid="game-sign-in-state">
            {discordOn && saved.steam.enabled
              ? say("Discord و Steam شغّالين|Discord and Steam on|Discord ו-Steam פעילים")
              : discordOn
                ? say("Discord شغّال|Discord on|Discord פעיל")
                : saved.steam.enabled
                  ? say("Steam شغّال|Steam on|Steam פעיל")
                  : say("موقّف|Off|כבוי")}
          </span>
          {!open ? (
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)} data-testid="game-sign-in-open">
              {say("اضبطه|Set it up|להגדרה")}
            </Button>
          ) : null}
        </div>
      </div>
      {open ? (
        <>
          {!accountsOn ? <p className="mt-2 text-xs text-amber-200/80">{say("بيشتغل بس وحسابات الزباين شغّالة (فوق).|It works only with customer accounts on (above).|זה עובד רק כשחשבונות הלקוחות פעילים (למעלה).")}</p> : null}
          <h3 className="mt-4 text-sm font-semibold">Discord</h3>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-xs leading-5 text-white/60" data-testid="discord-sign-in-steps">
            <li>{say("بـ discord.com/developers/applications: «New Application» وسمّيها باسم السيرفر.|At discord.com/developers/applications: “New Application”, named after the server.|ב-discord.com/developers/applications: «New Application» בשם השרת.")}</li>
            <li>
              {say("بـ «OAuth2» ← «Redirects» حطّ هالعنوان بالزبط:|Under “OAuth2” → “Redirects”, add exactly this address:|ב-«OAuth2» ← «Redirects» להוסיף בדיוק את הכתובת הזו:")}{" "}
              <bdi dir="ltr" className="break-all font-mono text-white/80" data-testid="discord-sign-in-callback">
                {callback}
              </bdi>
            </li>
            <li>{say("انسخ «Client ID» لهون.|Copy the “Client ID” here.|להעתיק לכאן את ה-«Client ID».")}</li>
            <li>
              {say("«Reset Secret» وانسخ الـ Client Secret لسر جديد بـ «الاتصالات والأسرار» اسمه|“Reset Secret”, and put the Client Secret in a new secret in “Connections & secrets” named|«Reset Secret», ולשים את ה-Client Secret בסוד חדש ב«חיבורים וסודות» בשם")}{" "}
              <code dir="ltr" className="font-mono text-white/80">{DISCORD_SECRET}</code>
              {". "}
              {kept === true ? (
                <span className="text-emerald-300" data-testid="discord-secret-kept">{say("محفوظ ✓|Kept ✓|נשמר ✓")}</span>
              ) : kept === false ? (
                <Link to="/connections" className="text-amber-200 underline" data-testid="discord-secret-missing">
                  {say("لسّا مش محفوظ: روح حطّه|Not kept yet: go and add it|עוד לא נשמר: להוספה")}
                </Link>
              ) : null}
            </li>
          </ol>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block text-xs text-white/60">
              Client ID
              <input
                className={`${field} mt-1`}
                dir="ltr"
                inputMode="numeric"
                value={draft.discord.clientId}
                maxLength={22}
                placeholder="1234567890123456789"
                disabled={!canWrite}
                onChange={(e) => setDraft({ ...draft, discord: { ...draft.discord, clientId: e.target.value.trim() } })}
                data-testid="discord-sign-in-client"
              />
            </label>
            <label className="flex h-10 items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.discord.enabled} disabled={!canWrite || (!draft.discord.enabled && !idOk)} onChange={(e) => setDraft({ ...draft, discord: { ...draft.discord, enabled: e.target.checked } })} data-testid="discord-sign-in-enabled" />
              {say("شغّل الدخول بـ Discord|Switch Discord sign-in on|הפעלת כניסה עם Discord")}
            </label>
          </div>
          {draft.discord.clientId && !idOk ? (
            <p className="mt-1 text-xs text-amber-200" data-testid="discord-sign-in-bad">
              {say("هاد مش Client ID تبع Discord: أرقام بس، بين 15 و22 رقم.|That isn't a Discord Client ID: digits only, 15 to 22 of them.|זה לא Client ID של Discord: רק ספרות, בין 15 ל-22.")}
            </p>
          ) : null}

          <h3 className="mt-5 text-sm font-semibold">Steam</h3>
          <p className="mt-1 text-xs leading-5 text-white/60">
            {say(
              "ما بدّه شي: Steam ما بيعطي إيميل، فاللاعب بيربطه بحسابه من «حسابي» بعد ما يفوت، وبيطلع رقم Steam تبعه (SteamID64) بحسابه.|Nothing to set up: Steam gives no email, so players link it to their account from “My account” once signed in, and their Steam number (SteamID64) shows on it.|אין מה להגדיר: Steam לא נותן אימייל, אז השחקן מקשר אותו לחשבון שלו מ«החשבון שלי» אחרי שנכנס, ומספר ה-Steam שלו (SteamID64) מופיע בו.",
            )}
          </p>
          <label className="mt-2 flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.steam.enabled} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, steam: { enabled: e.target.checked } })} data-testid="steam-link-enabled" />
            {say("شغّل ربط Steam|Switch Steam linking on|הפעלת קישור Steam")}
          </label>
          <div className="mt-3">
            <Button size="sm" disabled={!canWrite || !dirty || (draft.discord.enabled && !idOk)} isLoading={save.isPending} onClick={() => save.mutate(draft)} data-testid="game-sign-in-save">
              {say("احفظ|Save|שמירה")}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
