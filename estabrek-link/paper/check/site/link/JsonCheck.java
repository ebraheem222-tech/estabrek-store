package site.link;

import java.util.List;
import java.util.Map;

/** Run by build.mjs: the plugin's JSON as the site writes it (never packed into the plugin). */
public final class JsonCheck {
  private static void same(Object got, Object want, String what) {
    if (want == null ? got != null : !want.equals(got)) throw new AssertionError(what + ": " + got + " (wanted " + want + ")");
  }
  @SuppressWarnings("unchecked")
  public static void main(String[] args) {
    Map<String, Object> m = (Map<String, Object>) Json.parse("{\"items\":[{\"id\":\"r1\",\"command\":\"lp user Sara parent add star\"}],\"whitelist\":true,\"n\":2,\"x\":null}");
    List<Object> items = (List<Object>) m.get("items");
    same(((Map<String, Object>) items.get(0)).get("command"), "lp user Sara parent add star", "a command");
    same(m.get("whitelist"), Boolean.TRUE, "a yes");
    same(m.get("n"), 2.0, "a number");
    same(m.containsKey("x"), true, "a null kept");
    same(((Map<String, Object>) Json.parse("{\"message\":\"\u062a\u0645! \\\"ok\\\"\"}")).get("message"), "\u062a\u0645! \"ok\"", "escapes");
    same(Json.parse("{broken"), null, "not JSON");
    same(Json.quote("a\"b\\c\n"), "\"a\\\"b\\\\c\\n\"", "quoting");
    System.out.println("json ok");
  }
}
