// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit.command;

public final class PluginCommand extends Command {
  private PluginCommand() { super(""); }
  public void setExecutor(CommandExecutor executor) {}
}
