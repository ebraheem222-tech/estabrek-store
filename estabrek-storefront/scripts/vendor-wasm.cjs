// Copies the animation players' WebAssembly files into public/vendor, so the shop serves them
// itself instead of the players fetching them from a public CDN (pageTree/TreeMedia.tsx points
// them here). Runs before `next dev` and `next build`; public/vendor isn't kept in git.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const out = path.join(root, "public", "vendor");
fs.mkdirSync(out, { recursive: true });
const files = [
  ["@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm", "dotlottie-player.wasm"],
  ["@rive-app/canvas/rive.wasm", "rive.wasm"],
  ["@rive-app/canvas/rive_fallback.wasm", "rive_fallback.wasm"],
];
for (const [from, to] of files) fs.copyFileSync(path.join(root, "node_modules", from), path.join(out, to));
console.log(`vendor-wasm: ${files.length} files in public/vendor`);
