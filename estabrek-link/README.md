# The server's link: the Paper plugin

This folder holds the source of the plugin a Minecraft Java site's owner puts on their game server (wave G5b of
`docs/sites-300-plan.ar.md`). The FiveM version is a Lua resource in `estabrek-store-backend/assets/link/fivem`.

The site's panel («لينك السيرفر») gives the plugin as `site-link.jar`. The backend (`src/lib/gameLink.ts`,
`linkDownload`) takes the blank jar from `estabrek-store-backend/assets/link/minecraft/site-link.jar` and stamps
`site-link.properties` inside it with:

- the site's name;
- where to call (`…/v1/link`);
- a new key (the old key stops working);
- the language.

All the other files stay as they were built, byte for byte. Nothing in the jar names the platform: the store is its
own brand. `build.mjs` refuses to write a jar that does.

## What it does

The plugin only makes outgoing HTTPS calls, so no port opens on the game server:

- **Every minute** it calls `POST /hello` with its version and how many players are online. The answer says whether
  the whitelist is on. It then calls `POST /deliveries` and runs each command it gets as the console. It reports back
  on `POST /deliveries/report`: each one given, or failed with the reason.
- **On join**, while the whitelist is on, it calls `POST /whitelist` with the player's UUID and name. A player the
  site refuses is turned away with the site's own words. Minecraft sites have no whitelist yet: there is no
  applications module on one.
- **`/link 482913`** claims the code a player took from «حسابي» on the site (`POST /claim`). Their Minecraft account is
  then linked to their account on the site.

A purchase is given only once its buyer has linked a Minecraft account. The site hands each purchase over once:

1. While the server runs the package's command, the purchase shows as «عم تنعطى». In the command, `{player}` becomes
   the player's name and `{uuid}` their UUID.
2. The server's report then marks it given, or failed with the reason. A failed purchase shows in «فشل التسليم» on the
   panel, with «جرّب كمان مرّة».
3. If the server goes down before it reports, the purchase goes back to waiting after 10 minutes.

## Building

```
node estabrek-link/build.mjs
```

The build needs Java 17 or newer. It uses IntelliJ's bundled JDK when one is there; otherwise set `JAVAC` to the path
of your `javac`.

The plugin compiles against `paper/stubs`. These are stand-ins with the exact shapes of the few Bukkit/Paper calls the
plugin makes, so nothing is downloaded. They are never packed into the jar.

Before packing, the build runs `paper/check`, which tests the plugin's small JSON reader and writer. The jar has fixed
dates, so the same source builds the same file. Commit the new `site-link.jar` after any change here.

The plugin targets `api-version: 1.20`. It runs on Paper, Purpur and Spigot 1.20 or newer, on Java 17 or newer.
