import { mkdir, copyFile, cp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url),
  target = "src/assets/vendor";
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const pdf = dirname(require.resolve("pdfjs-dist/package.json"));
await copyFile(join(pdf, "build/pdf.mjs"), join(target, "pdf.mjs"));
await copyFile(
  join(pdf, "build/pdf.worker.mjs"),
  join(target, "pdf.worker.mjs"),
);
await cp(join(pdf, "cmaps"), join(target, "cmaps"), { recursive: true });
await cp(join(pdf, "standard_fonts"), join(target, "standard_fonts"), {
  recursive: true,
});
await cp(join(pdf, "wasm"), join(target, "pdf-wasm"), { recursive: true });
await copyFile(
  require.resolve("jszip/dist/jszip.min.js"),
  join(target, "jszip.min.js"),
);
