import { defineConfig } from "vite";
import { readFileSync, createReadStream, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";
const local = process.env.PKU_OCR_MODELS
  ? resolve(process.env.PKU_OCR_MODELS)
  : null;
const scribe = process.env.PKU_SCRIBE_PACKAGE
  ? resolve(process.env.PKU_SCRIBE_PACKAGE)
  : null;
function localModels() {
  const middleware = (req: any, res: any, next: any) => {
    const path = String(req.url).split("?")[0];
    if (scribe && path.startsWith("/comparison/scribe-package/")) {
      const file = resolve(
        scribe,
        decodeURIComponent(path.slice("/comparison/scribe-package/".length)),
      );
      if (!file.startsWith(scribe + "/")) {
        res.statusCode = 403;
        return res.end();
      }
      const types = {
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
        ".json": "application/json",
        ".woff": "font/woff",
        ".ttf": "font/ttf",
        ".otf": "font/otf",
      };
      try {
        res.setHeader(
          "Content-Type",
          types[extname(file)] || "application/octet-stream",
        );
        res.setHeader("Content-Length", statSync(file).size);
        createReadStream(file).pipe(res);
      } catch {
        res.statusCode = 404;
        res.end("Optional Scribe package unavailable");
      }
      return;
    }
    if (
      !local ||
      !/^\/models\/(deim-s-1024x1024|parseq-ndl-(30|50|100))\.onnx$/.test(path)
    )
      return next();
    const file = join(local, path.split("/").pop());
    try {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Length", statSync(file).size);
      createReadStream(file).pipe(res);
    } catch {
      res.statusCode = 404;
      res.end("Model unavailable");
    }
  };
  return {
    name: "local-ocr-models",
    configureServer(server: any) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(middleware);
    },
  };
}
export default defineConfig({
  plugins: [localModels()],
  worker: { format: "es" },
  build: { target: "es2022" },
  server: { host: "127.0.0.1", port: 5174, fs: { allow: [resolve("../..")] } },
});
