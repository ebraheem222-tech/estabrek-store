import { describe, expect, test } from "vitest";
import { plainZip, readPlainZip, crc32 } from "../lib/plainZip.js";
import { steamFromHex } from "../lib/gameLink.js";

// A game server's link (wave G5 of docs/sites-300-plan.ar.md), by itself: the plain ZIP it is downloaded as, and
// FiveM's Steam identifier read as the SteamID64 the site keeps.

describe("A plain ZIP", () => {
  test("files and folders by their paths, read back as written; no way out of its folder", () => {
    const big = "lua ".repeat(2000);
    const zip = plainZip([{ name: "site-link/config.lua", data: 'Config.Key = "x"' }, { name: "site-link/server.lua", data: big }, { name: "../../evil.txt", data: "no" }]);
    expect(zip.subarray(0, 4).toString("hex")).toBe("504b0304");
    const back = readPlainZip(zip);
    expect(back.map((f) => f.name)).toEqual(["site-link/config.lua", "site-link/server.lua", "evil.txt"]);
    expect(back[1].data.toString()).toBe(big);
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });
});

describe("FiveM's Steam identifier", () => {
  test("the hex of a SteamID64, as the site keeps it", () => {
    expect(steamFromHex("110000112345678")).toBe("76561198265685624");
    expect(steamFromHex("not-hex")).toBeNull();
    expect(steamFromHex("1")).toBeNull();
  });
});
