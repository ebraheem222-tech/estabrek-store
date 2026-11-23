// Compile-only stand-in for the Bukkit/Paper API (estabrek-link/README.md): the shapes the plugin calls, never packed.
package org.bukkit.command;

public interface CommandSender {
  void sendMessage(String message);
  String getName();
}
