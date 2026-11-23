package site.link;

import java.io.File;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.logging.Level;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerPreLoginEvent;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * Your site's link for a Paper server. It talks to your site; your site never reaches into your server (no port to
 * open, no RCON password anywhere).
 *   - Every minute it says hello (how many play) and learns whether your site's whitelist is on. On a network, each
 *     server says it by its own name (plugins/SiteLink/server.properties: server=bedwars), the key of its row in your
 *     site's servers table, so the site shows each game's players and counts each one's play time.
 *   - It gives what players bought on your site: the site hands over each purchase waiting to be given with its
 *     command (the player's name in it), it runs as the console, and the site is told whether it went.
 *   - While the whitelist is on, a player joining is asked about on your site, and only those it knows come in.
 *   - /link 123456 links the player's game account to their account on your site (the code is on «حسابي»).
 *   - Your site's rankings: those online get a minute of play time at each hello, and /linkscore <board> <player>
 *     <value> (the console, a command block, or another plugin) sends the other numbers with the next hello.
 *
 * Made for your site when you downloaded it: site-link.properties inside holds its key. Keep the file private; a
 * new download makes a new key and this one stops working.
 */
public final class SiteLink extends JavaPlugin implements Listener, CommandExecutor {
  private static final String VERSION = "1.2.0";
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
  private String name = "Server";
  private String api = "";
  private String key = "";
  private String lang = "ar";
  /** This server's name on the site, when the site has several (a network's games); "" on a single server. */
  private String server = "";
  private volatile boolean whitelistOn = false;
  /** Who is online, as JSON, taken on the server's own thread (the hello is sent off it). */
  private volatile String online = "[]";
  private volatile int onlineCount = 0;
  private volatile int maxPlayers = 0;
  private final ConcurrentLinkedQueue<String> scores = new ConcurrentLinkedQueue<>();

  @Override
  public void onEnable() {
    try (InputStream in = SiteLink.class.getResourceAsStream("/site-link.properties")) {
      Properties p = new Properties();
      if (in != null) p.load(new InputStreamReader(in, StandardCharsets.UTF_8));
      name = p.getProperty("name", name);
      api = p.getProperty("api", "");
      key = p.getProperty("key", "");
      lang = p.getProperty("lang", "ar");
    } catch (Exception e) {
      getLogger().log(Level.WARNING, "Couldn't read site-link.properties", e);
    }
    if (!api.startsWith("http") || key.isEmpty() || key.startsWith("__")) {
      getLogger().warning("This copy has no key: download it again from your site's panel.");
      return;
    }
    server = serverName();
    Bukkit.getPluginManager().registerEvents(this, this);
    if (getCommand("link") != null) getCommand("link").setExecutor(this);
    if (getCommand("linkscore") != null) getCommand("linkscore").setExecutor(this);
    // Who is online, every 10 seconds on the server's thread; every minute (1200 ticks), after 10 seconds: hello, the
    // numbers for the rankings, then what waits to be given.
    Bukkit.getScheduler().runTaskTimer(this, this::seeOnline, 20L, 200L);
    Bukkit.getScheduler().runTaskTimerAsynchronously(this, this::tick, 200L, 1200L);
  }

  /** One call to the site: a JSON body, the server's key; the answer as a map (null: the site didn't answer). */
  @SuppressWarnings("unchecked")
  private Map<String, Object> call(String path, String body) {
    try {
      HttpRequest req = HttpRequest.newBuilder(URI.create(api + path))
          .timeout(Duration.ofSeconds(10))
          .header("Content-Type", "application/json")
          .header("Authorization", "Bearer " + key)
          .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
          .build();
      HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
      if (res.statusCode() != 200) return null;
      Object v = Json.parse(res.body());
      return v instanceof Map ? (Map<String, Object>) v : null;
    } catch (Exception e) {
      return null;
    }
  }

  private String word(String key) {
    switch (lang) {
      case "en":
        return key.equals("away") ? "The site isn't answering right now. Try again in a moment." : key.equals("how") ? "Type /link and the 6-digit code from «My account» on the site." : "That didn't work. Try again.";
      case "he":
        return key.equals("away") ? "האתר לא עונה כרגע. נסו שוב עוד רגע." : key.equals("how") ? "הקלידו /link ואת הקוד (6 ספרות) מ«החשבון שלי» באתר." : "זה לא הצליח. נסו שוב.";
      default:
        return key.equals("away") ? "الموقع مش رادد هلّق. جرّب كمان شوي." : key.equals("how") ? "اكتب /link والكود (6 أرقام) من «حسابي» بالموقع." : "ما زبط. جرّب كمان مرة.";
    }
  }

  /**
   * This server's name on the site (plugins/SiteLink/server.properties: server=bedwars), written empty with what it is
   * for the first time. Small English letters, numbers, - and _; anything else is left out.
   */
  private String serverName() {
    File dir = getDataFolder();
    File file = new File(dir, "server.properties");
    try {
      if (!file.exists()) {
        dir.mkdirs();
        Files.writeString(file.toPath(), "# This server's name on your site, when your site has several servers (a network's games: bedwars, skywars...).\n# It is the key of its row in the site's servers table. Leave it empty on a single server.\nserver=\n", StandardCharsets.UTF_8);
        return "";
      }
      Properties p = new Properties();
      try (InputStream in = Files.newInputStream(file.toPath())) {
        p.load(new InputStreamReader(in, StandardCharsets.UTF_8));
      }
      String name = p.getProperty("server", "").trim().toLowerCase(java.util.Locale.ROOT);
      if (name.isEmpty() || name.matches("[a-z0-9_-]{1,30}")) return name;
      getLogger().warning("server.properties: the server's name may have small English letters, numbers, - and _ only.");
    } catch (Exception e) {
      getLogger().log(Level.WARNING, "Couldn't read server.properties", e);
    }
    return "";
  }

  private void seeOnline() {
    StringBuilder b = new StringBuilder("[");
    int n = 0;
    for (Player p : Bukkit.getOnlinePlayers()) {
      if (n++ > 0) b.append(',');
      b.append("{\"id\":").append(Json.quote(p.getUniqueId().toString())).append(",\"name\":").append(Json.quote(p.getName())).append('}');
    }
    online = b.append(']').toString();
    onlineCount = n;
    maxPlayers = Bukkit.getMaxPlayers();
  }

  /** Hello, the numbers for the rankings, then the purchases waiting to be given: each command run as the console, and the site told how it went. */
  @SuppressWarnings("unchecked")
  private void tick() {
    Map<String, Object> hello = call("/hello", "{\"game\":\"minecraft\",\"version\":" + Json.quote(VERSION) + ",\"players\":" + onlineCount + ",\"max\":" + maxPlayers + ",\"online\":" + online + (server.isEmpty() ? "" : ",\"server\":" + Json.quote(server)) + ",\"lang\":" + Json.quote(lang) + "}");
    if (hello != null) whitelistOn = Boolean.TRUE.equals(hello.get("whitelist"));
    while (!scores.isEmpty()) {
      List<String> batch = new ArrayList<>();
      for (String s; batch.size() < 200 && (s = scores.poll()) != null; ) batch.add(s);
      call("/scores", "{\"items\":[" + String.join(",", batch) + "]}");
    }
    Map<String, Object> got = call("/deliveries", "{}");
    Object items = got == null ? null : got.get("items");
    if (!(items instanceof List)) return;
    for (Object o : (List<Object>) items) {
      if (!(o instanceof Map)) continue;
      Map<String, Object> item = (Map<String, Object>) o;
      Object id = item.get("id");
      Object command = item.get("command");
      if (!(id instanceof String) || !(command instanceof String)) continue;
      // Commands run on the server's own thread; the site is told from here.
      Bukkit.getScheduler().runTask(this, () -> {
        boolean ok;
        String error = null;
        try {
          ok = Bukkit.dispatchCommand(Bukkit.getConsoleSender(), (String) command);
          if (!ok) error = "The server didn't know the command";
        } catch (Exception e) {
          ok = false;
          error = String.valueOf(e.getMessage());
        }
        final boolean done = ok;
        final String why = error;
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> call("/deliveries/report", "{\"items\":[{\"id\":" + Json.quote((String) id) + ",\"ok\":" + done + (why == null ? "" : ",\"error\":" + Json.quote(why)) + "}]}"));
      });
    }
  }

  /** The whitelist: asked of the site as a player joins, while it is on (this event waits off the server's thread). */
  @EventHandler
  public void onJoin(AsyncPlayerPreLoginEvent event) {
    if (!whitelistOn) return;
    UUID id = event.getUniqueId();
    Map<String, Object> answer = call("/whitelist", "{\"ids\":{\"uuid\":" + Json.quote(id.toString()) + "},\"name\":" + Json.quote(event.getName()) + ",\"lang\":" + Json.quote(lang) + "}");
    if (answer == null) {
      event.disallow(AsyncPlayerPreLoginEvent.Result.KICK_WHITELIST, word("away"));
    } else if (!Boolean.TRUE.equals(answer.get("allowed"))) {
      Object message = answer.get("message");
      event.disallow(AsyncPlayerPreLoginEvent.Result.KICK_WHITELIST, message instanceof String ? (String) message : word("away"));
    }
  }

  /**
   * /linkscore money Steve 12500: a number for one of the site's boards (its key there), for a player online now. For
   * the console, command blocks and other plugins (the permission sitelink.score, which operators have).
   */
  private boolean score(CommandSender sender, String[] args) {
    if (!sender.hasPermission("sitelink.score")) return true;
    double value;
    try {
      value = args.length == 3 ? Double.parseDouble(args[2]) : Double.NaN;
    } catch (NumberFormatException e) {
      value = Double.NaN;
    }
    Player player = args.length == 3 ? Bukkit.getPlayerExact(args[1]) : null;
    if (Double.isNaN(value) || Double.isInfinite(value) || !args[0].matches("[A-Za-z0-9_-]{1,40}") || player == null) {
      sender.sendMessage("/linkscore <board> <online player> <number>");
      return true;
    }
    if (scores.size() < 1000) scores.add("{\"board\":" + Json.quote(args[0]) + ",\"player\":{\"id\":" + Json.quote(player.getUniqueId().toString()) + ",\"name\":" + Json.quote(player.getName()) + "},\"value\":" + value + "}");
    return true;
  }

  /** /link 123456: the code from «حسابي» on the site links this game account to that site account. */
  @Override
  public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    if (command.getName().equalsIgnoreCase("linkscore")) return score(sender, args);
    if (!(sender instanceof Player)) return true;
    Player player = (Player) sender;
    if (args.length != 1 || !args[0].matches("\\d{6}")) {
      player.sendMessage("[" + name + "] " + word("how"));
      return true;
    }
    String body = "{\"code\":" + Json.quote(args[0]) + ",\"game\":\"minecraft\",\"lang\":" + Json.quote(lang) + ",\"account\":{\"id\":" + Json.quote(player.getUniqueId().toString()) + ",\"name\":" + Json.quote(player.getName()) + "}}";
    UUID who = player.getUniqueId();
    Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
      Map<String, Object> answer = call("/claim", body);
      Object message = answer == null ? null : answer.get("message");
      String text = "[" + name + "] " + (message instanceof String ? (String) message : word("failed"));
      Bukkit.getScheduler().runTask(this, () -> {
        Player back = Bukkit.getPlayer(who);
        if (back != null) back.sendMessage(text);
      });
    });
    return true;
  }
}
