// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit.plugin;

import org.bukkit.event.Listener;

public interface PluginManager {
  void registerEvents(Listener listener, Plugin plugin);
}
