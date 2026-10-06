import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve, extname, join } from "node:path";
const root = resolve("www/pku-aihis/week04"),
  base = "/pku-aihis/week04/";
const index = process.argv.indexOf("--local-bundle");
const bundle = index < 0 ? null : resolve(process.argv[index + 1]);
const manifest = bundle
  ? JSON.parse(await readFile(join(bundle, "manifest.json"), "utf8"))
  : {};
const zi = process.argv.indexOf("--zotero-reader");
const zotero = zi < 0 ? null : resolve(process.argv[zi + 1]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".ftl": "text/plain",
};
const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/") {
      res.writeHead(302, { Location: base });
      res.end();
      return;
    }
    if (path === "/local-example" && bundle) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      res.end(await readFile(join(bundle, "project.json")));
      return;
    }
    let file;
    if (path.startsWith("/local-file/")) {
      const id = path.slice("/local-file/".length);
      file = manifest[id];
      if (!file) {
        res.writeHead(404);
        res.end("No local attachment");
        return;
      }
    } else if (path.startsWith("/comparison/zotero/") && zotero) {
      file = resolve(
        zotero,
        decodeURIComponent(path.slice("/comparison/zotero/".length)),
      );
      if (!file.startsWith(zotero + "/")) throw Error("Invalid path");
    } else {
      if (!path.startsWith(base)) {
        res.writeHead(404);
        res.end();
        return;
      }
      const relative = decodeURIComponent(path.slice(base.length));
      file = resolve(root, relative || "index.html");
      if (!file.startsWith(root + "/") && file !== join(root, "index.html")) {
        res.writeHead(403);
        res.end();
        return;
      }
    }
    const info = await stat(file);
    if (!info.isFile()) throw Error("No file");
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.setHeader("Accept-Ranges", "bytes");
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]),
        end = Math.min(
          range[2] ? Number(range[2]) : info.size - 1,
          info.size - 1,
        );
      if (start > end) {
        res.writeHead(416);
        res.end();
        return;
      }
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
        "Content-Length": end - start + 1,
      });
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.setHeader("Content-Length", info.size);
      createReadStream(file).pipe(res);
    }
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(3334, "127.0.0.1", () =>
  console.log(
    `Week04 preview: http://127.0.0.1:3334${base} ${bundle ? "(local teacher materials available)" : ""}`,
  ),
);
