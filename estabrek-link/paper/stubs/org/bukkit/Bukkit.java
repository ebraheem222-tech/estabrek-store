// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit;

import java.util.Collection;
import java.util.UUID;
import org.bukkit.command.CommandSender;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.PluginManager;
import org.bukkit.scheduler.BukkitScheduler;

public final class Bukkit {
  private Bukkit() {}
  public static PluginManager getPluginManager() { throw new UnsupportedOperationException(); }
  public static BukkitScheduler getScheduler() { throw new UnsupportedOperationException(); }
  public static Collection<? extends Player> getOnlinePlayers() { throw new UnsupportedOperationException(); }
  public static boolean dispatchCommand(CommandSender sender, String commandLine) { throw new UnsupportedOperationException(); }
  public static ConsoleCommandSender getConsoleSender() { throw new UnsupportedOperationException(); }
  public static Player getPlayer(UUID id) { throw new UnsupportedOperationException(); }
}
