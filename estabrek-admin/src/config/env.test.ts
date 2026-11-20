import { describe, expect, test } from "vitest";
import { apiAddress, wholeAddress } from "./env";

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
