// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit.entity;

import java.util.UUID;
import org.bukkit.command.CommandSender;

public interface Player extends CommandSender {
  UUID getUniqueId();
}
