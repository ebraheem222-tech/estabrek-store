package site.link;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Just enough JSON for talking to the site: objects, arrays, strings, numbers, true/false/null read into Java maps,
 * lists, strings, doubles and booleans; and a string written with its escapes.
 */
final class Json {
  private final String s;
  private int i;

  private Json(String s) {
    this.s = s;
  }

  /** The value a JSON text holds (null: not JSON). */
  static Object parse(String text) {
    if (text == null) return null;
    try {
      Json j = new Json(text);
      j.space();
      Object v = j.value();
      j.space();
      return j.i == j.s.length() ? v : null;
    } catch (RuntimeException e) {
      return null;
    }
  }

  /** A string as JSON writes it. */
  static String quote(String v) {
    if (v == null) return "null";
    StringBuilder b = new StringBuilder("\"");
    for (int k = 0; k < v.length(); k++) {
      char c = v.charAt(k);
      switch (c) {
        case '"': b.append("\\\""); break;
        case '\\': b.append("\\\\"); break;
        case '\n': b.append("\\n"); break;
        case '\r': b.append("\\r"); break;
        case '\t': b.append("\\t"); break;
        default:
          if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
          else b.append(c);
      }
    }
    return b.append('"').toString();
  }

  private void space() {
    while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++;
  }

  private Object value() {
    char c = s.charAt(i);
    if (c == '{') return object();
    if (c == '[') return array();
    if (c == '"') return string();
    if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
    if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
    if (s.startsWith("null", i)) { i += 4; return null; }
    return number();
  }

  private Map<String, Object> object() {
    Map<String, Object> out = new LinkedHashMap<>();
    i++;
    space();
    if (s.charAt(i) == '}') { i++; return out; }
    while (true) {
      space();
      String key = string();
      space();
      if (s.charAt(i++) != ':') throw new IllegalStateException("':'");
      space();
      out.put(key, value());
      space();
      char c = s.charAt(i++);
      if (c == '}') return out;
      if (c != ',') throw new IllegalStateException("','");
    }
  }

  private List<Object> array() {
    List<Object> out = new ArrayList<>();
    i++;
    space();
    if (s.charAt(i) == ']') { i++; return out; }
    while (true) {
      space();
      out.add(value());
      space();
      char c = s.charAt(i++);
      if (c == ']') return out;
      if (c != ',') throw new IllegalStateException("','");
    }
  }

  private String string() {
    if (s.charAt(i++) != '"') throw new IllegalStateException("'\"'");
    StringBuilder b = new StringBuilder();
    while (true) {
      char c = s.charAt(i++);
      if (c == '"') return b.toString();
      if (c != '\\') { b.append(c); continue; }
      char e = s.charAt(i++);
      switch (e) {
        case 'n': b.append('\n'); break;
        case 'r': b.append('\r'); break;
        case 't': b.append('\t'); break;
        case 'b': b.append('\b'); break;
        case 'f': b.append('\f'); break;
        case 'u': b.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
        default: b.append(e);
      }
    }
  }

  private Double number() {
    int start = i;
    while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
    if (start == i) throw new IllegalStateException("a value");
    return Double.valueOf(s.substring(start, i));
  }
}
