// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit.event.player;

import java.util.UUID;
import org.bukkit.event.Event;

public class AsyncPlayerPreLoginEvent extends Event {
  public enum Result { ALLOWED, KICK_FULL, KICK_BANNED, KICK_WHITELIST, KICK_OTHER }
  public UUID getUniqueId() { throw new UnsupportedOperationException(); }
  public String getName() { throw new UnsupportedOperationException(); }
  public void disallow(Result result, String message) { throw new UnsupportedOperationException(); }
}
