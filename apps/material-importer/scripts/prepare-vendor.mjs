import { mkdir, copyFile, cp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url),
  target = "public/vendor";
await rm(target, {recursive:true,force:true});
await mkdir(target, { recursive: true });
const pdf = dirname(require.resolve("pdfjs-dist/package.json"));
await cp(join(pdf, "cmaps"), join(target, "cmaps"), { recursive: true });
await cp(join(pdf, "standard_fonts"), join(target, "standard_fonts"), {
  recursive: true,
});
await cp(join(pdf, "wasm"), join(target, "pdf-wasm"), { recursive: true });
const tess = dirname(require.resolve("tesseract.js/package.json"));
await copyFile(
  join(tess, "dist/worker.min.js"),
  join(target, "tesseract-worker.min.js"),
);
const tessRequire = createRequire(join(tess, "package.json"));
const core = dirname(tessRequire.resolve("tesseract.js-core/package.json"));
await cp(core, join(target, "tesseract-core"), {
  recursive: true,
  filter: (p) => !/\.md$|\.map$|package\.json$/.test(p),
});
