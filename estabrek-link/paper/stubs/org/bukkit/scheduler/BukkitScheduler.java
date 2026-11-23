// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit.scheduler;

import org.bukkit.plugin.Plugin;

public interface BukkitScheduler {
  BukkitTask runTask(Plugin plugin, Runnable task);
  BukkitTask runTaskTimer(Plugin plugin, Runnable task, long delay, long period);
  BukkitTask runTaskAsynchronously(Plugin plugin, Runnable task);
  BukkitTask runTaskTimerAsynchronously(Plugin plugin, Runnable task, long delay, long period);
}
