// Import the user's supplied reference pictures into stable, source-specific store paths.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const shop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const supplied = path.resolve(shop, "../addons_themes");
const target = path.resolve(shop, "public/templates/references");
const numbers = [576, 577, 578, 579, 582, 583, 584, 586, 587, 588, 589, 590, 591, 592, 594, 597, 598, 599, 601, 602, 604, 605, 606, 614, 615, 616, 617, 618, 619, 621, 622, 623, 625, 633];
const manifest = {};
const provenance = [];
const folders = readdirSync(supplied, { withFileTypes: true }).filter(entry => entry.isDirectory());
for (const number of numbers) {
  const folder = folders.find(entry => entry.name.startsWith(`templatemo_${number}_`));
  if (!folder) throw new Error(`Missing supplied template ${number}`);
  const root = path.join(supplied, folder.name);
  const files = {};
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const from = path.join(directory, entry.name);
      if (entry.isDirectory()) { walk(from); continue; }
      if (!/\.(avif|gif|jpe?g|png|svg|webp|mp4|webm)$/i.test(entry.name)) continue;
      const relative = path.relative(root, from).split(path.sep).join("/");
      if (/\.svg$/i.test(entry.name) && /<script\b|\bonload\s*=|<foreignObject\b/i.test(readFileSync(from, "utf8"))) throw new Error(`Active SVG is not a starter picture: ${folder.name}/${relative}`);
      const into = path.resolve(target, String(number), relative);
      if (!into.startsWith(target + path.sep)) throw new Error("Reference asset path escaped its target");
      mkdirSync(path.dirname(into), { recursive: true }); copyFileSync(from, into);
      files[relative] = `/templates/references/${number}/${relative}`;
    }
  };
  walk(root); manifest[number] = files;
  provenance.push({ number, folder: folder.name, files: Object.keys(files) });
}
const output = path.join(shop, "src/storeThemes/kits/templates/referenceAssets.ts");
writeFileSync(output, `/** Generated from the user's local addons_themes pictures; see public/templates/references/provenance.json. */\nexport const REFERENCE_ASSETS: Record<string, Record<string, string>> = ${JSON.stringify(manifest, null, 2)};\n`);
mkdirSync(target, { recursive: true });
writeFileSync(path.join(target, "provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
console.log(JSON.stringify({ sources: numbers.length, images: Object.values(manifest).reduce((sum, files) => sum + Object.keys(files).length, 0) }));
