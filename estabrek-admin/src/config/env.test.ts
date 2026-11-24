import { describe, expect, test } from "vitest";
import { LOCAL_API, apiAddress, chooseServer, keptServer, wholeAddress } from "./env";

// The server's and the shop's addresses as they are written in a host's settings, made whole. A copy's admin was
// built with "x.up.railway.app" (no https://, no /v1): every call went to the admin's own site and came back as its
// own page, so its first setup never showed.

describe("The addresses the admin is built with", () => {
  test("the API's: https:// and /v1 added when they were left out, nothing else changed", () => {
    expect(apiAddress("estabrek-store-production-f87be770.up.railway.app")).toBe("https://estabrek-store-production-f87be770.up.railway.app/v1");
    expect(apiAddress("https://rose-api.up.railway.app")).toBe("https://rose-api.up.railway.app/v1");
    expect(apiAddress("https://rose-api.up.railway.app/")).toBe("https://rose-api.up.railway.app/v1");
    expect(apiAddress("https://rose-api.up.railway.app/v1")).toBe("https://rose-api.up.railway.app/v1");
    expect(apiAddress("https://rose-api.up.railway.app/v1/")).toBe("https://rose-api.up.railway.app/v1");
    expect(apiAddress("  'https://api.example.com/v1'  ")).toBe("https://api.example.com/v1");
    expect(apiAddress("https://api.example.com/api/v1")).toBe("https://api.example.com/api/v1");
  });

  test("this machine stays on http, and a path on the same site stays a path", () => {
    expect(apiAddress("http://localhost:4000/v1")).toBe("http://localhost:4000/v1");
    expect(apiAddress("localhost:4000")).toBe("http://localhost:4000/v1");
    expect(apiAddress("127.0.0.1:4311/v1")).toBe("http://127.0.0.1:4311/v1");
    expect(apiAddress("/v1")).toBe("/v1");
    expect(apiAddress("/v1/")).toBe("/v1");
  });

  test("the shop's: https:// added, no slash at the end", () => {
    expect(wholeAddress("rose.vercel.app")).toBe("https://rose.vercel.app");
    expect(wholeAddress("https://rose.vercel.app/")).toBe("https://rose.vercel.app");
    expect(wholeAddress("http://localhost:3000")).toBe("http://localhost:3000");
    expect(wholeAddress('"https://shop.example.com"')).toBe("https://shop.example.com");
  });
});

// A copy's admin put up on its host before its server (paintispassion.pages.dev: no VITE_API_BASE_URL, no server
// yet) spoke to http://localhost:4000 and showed a sign-in to nothing. With no address it now opens /connect.
describe("The server the admin speaks to", () => {
  test("the build's address always wins, even over one kept in this browser", () => {
    expect(chooseServer({ built: "rose-api.up.railway.app", kept: "https://other.up.railway.app/v1", adminHost: "rose.pages.dev" })).toEqual({ address: "https://rose-api.up.railway.app/v1", from: "build" });
  });

  test("an admin built with none, on a host: the server linked in this browser, else none at all", () => {
    expect(chooseServer({ built: "", kept: "https://paint-api.up.railway.app/v1", adminHost: "paintcopy.pages.dev" })).toEqual({ address: "https://paint-api.up.railway.app/v1", from: "browser" });
    expect(chooseServer({ built: undefined, kept: null, adminHost: "paintcopy.pages.dev" }).from).toBe("none");
    expect(chooseServer({ built: "  ", kept: "", adminHost: "abc123.paintcopy.pages.dev" }).from).toBe("none");
  });

  test("on this machine it still falls back to the local server", () => {
    expect(chooseServer({ built: undefined, kept: null, adminHost: "localhost:5178" })).toEqual({ address: LOCAL_API, from: "local" });
    expect(chooseServer({ built: undefined, kept: null, adminHost: "127.0.0.1:5173" }).from).toBe("local");
    expect(chooseServer({ built: undefined, kept: null, adminHost: "" }).from).toBe("local");
  });

  test("only an https address is kept (http only on this machine), made whole", () => {
    expect(keptServer("paint-api.up.railway.app")).toBe("https://paint-api.up.railway.app/v1");
    expect(keptServer("http://paint-api.up.railway.app")).toBeNull();
    expect(keptServer("http://localhost:4000")).toBe("http://localhost:4000/v1");
    expect(keptServer("javascript:alert(1)")).toBeNull();
    expect(keptServer("/v1")).toBeNull();
    expect(keptServer("")).toBeNull();
    expect(chooseServer({ built: undefined, kept: "http://evil.example/v1", adminHost: "paintcopy.pages.dev" }).from).toBe("none");
  });
});
