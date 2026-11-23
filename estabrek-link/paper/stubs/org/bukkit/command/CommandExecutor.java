// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit.command;

public interface CommandExecutor {
  boolean onCommand(CommandSender sender, Command command, String label, String[] args);
}
