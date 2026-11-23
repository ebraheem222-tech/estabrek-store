package site.link;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
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
 *   - Every minute it says hello (how many play) and learns whether your site's whitelist is on.
 *   - It gives what players bought on your site: the site hands over each purchase waiting to be given with its
 *     command (the player's name in it), it runs as the console, and the site is told whether it went.
 *   - While the whitelist is on, a player joining is asked about on your site, and only those it knows come in.
 *   - /link 123456 links the player's game account to their account on your site (the code is on «حسابي»).
 *
 * Made for your site when you downloaded it: site-link.properties inside holds its key. Keep the file private; a
 * new download makes a new key and this one stops working.
 */
public final class SiteLink extends JavaPlugin implements Listener, CommandExecutor {
  private static final String VERSION = "1.0.0";
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
  private String name = "Server";
  private String api = "";
  private String key = "";
  private String lang = "ar";
  private volatile boolean whitelistOn = false;

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
    Bukkit.getPluginManager().registerEvents(this, this);
    if (getCommand("link") != null) getCommand("link").setExecutor(this);
    // Every minute (1200 ticks), after 10 seconds: hello, then what waits to be given.
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

  /** Hello, then the purchases waiting to be given: each command run as the console, and the site told how it went. */
  @SuppressWarnings("unchecked")
  private void tick() {
    Map<String, Object> hello = call("/hello", "{\"game\":\"minecraft\",\"version\":" + Json.quote(VERSION) + ",\"players\":" + Bukkit.getOnlinePlayers().size() + ",\"lang\":" + Json.quote(lang) + "}");
    if (hello != null) whitelistOn = Boolean.TRUE.equals(hello.get("whitelist"));
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

  /** /link 123456: the code from «حسابي» on the site links this game account to that site account. */
  @Override
  public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
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
