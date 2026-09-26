// Postinstall patch for @cloudflare/next-on-pages@1.12.1.
//
// Backports the upstream 1.13.x fix for the worker-bundling failure:
//
//   ✘ [ERROR] Could not resolve "async_hooks"
//
// The Vercel builder's function launchers (@vercel/next) contain a bare
// `require("async_hooks")`. next-on-pages 1.12.1 bundles the worker with
// esbuild `platform: "neutral"` and `external: ["node:*", ...]`, which does
// not cover the bare `async_hooks` specifier, so the build fails. Upstream
// fixed this in 1.13.x by externalizing `async_hooks` and extending the
// built-in-modules plugin filter (we stay on 1.12.1 because 1.13.x requires
// Next >= 14.3, which does not exist for our Next 14.2.x app).
//
// This script is idempotent and runs on `postinstall`, so fresh installs
// (including Cloudflare Pages builds) get the fix automatically.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const target = join(
  process.cwd(),
  "node_modules",
  "@cloudflare",
  "next-on-pages",
  "dist",
  "index.js",
);

let src;
try {
  src = readFileSync(target, "utf8");
} catch {
  console.log("[patch-next-on-pages] package not installed, skipping.");
  process.exit(0);
}

const edits = [
  [
    'external: ["node:*", "./__next-on-pages-dist__/*", "cloudflare:*"],',
    'external: ["node:*", "async_hooks", "./__next-on-pages-dist__/*", "cloudflare:*"],',
  ],
  [
    'external: ["node:*", `${relativeNopDistPath}/*`, "*.wasm", "cloudflare:*"],',
    'external: ["node:*", "async_hooks", `${relativeNopDistPath}/*`, "*.wasm", "cloudflare:*"],',
  ],
  [
    "build3.onResolve({ filter: /^(node|cloudflare):/ }, ({ kind, path: path2 }) => {",
    "build3.onResolve({ filter: /^(node:|cloudflare:|async_hooks)/ }, ({ kind, path: path2 }) => {",
  ],
];

let applied = 0;
for (const [from, to] of edits) {
  if (src.includes(to)) continue; // already patched
  if (!src.includes(from)) {
    console.error(`[patch-next-on-pages] expected pattern not found, skipping:\n${from}`);
    continue;
  }
  src = src.replace(from, to);
  applied++;
}

if (applied > 0) {
  writeFileSync(target, src);
  console.log(`[patch-next-on-pages] applied ${applied} edit(s).`);
} else {
  console.log("[patch-next-on-pages] already patched, nothing to do.");
}
