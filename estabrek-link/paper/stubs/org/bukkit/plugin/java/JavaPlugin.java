// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit.plugin.java;

import java.util.logging.Logger;
import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.Plugin;

public abstract class JavaPlugin implements Plugin {
  public JavaPlugin() {}
  public void onEnable() {}
  public void onDisable() {}
  public Logger getLogger() { throw new UnsupportedOperationException(); }
  public PluginCommand getCommand(String name) { throw new UnsupportedOperationException(); }
}
