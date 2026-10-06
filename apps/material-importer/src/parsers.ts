import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as mammoth from "mammoth";
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-ris";
import Papa from "papaparse";
import JSZip from "jszip";
import { uid, sha256, now } from "../../../packages/course-project/project.mjs";
// PDF assets match the locked PDF.js build and are copied into dist by Vite.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export { pdfjs };
export function pagesFrom(value: string, total: number) {
  const result = new Set<number>();
  for (const item of value.split(/[,，]/)) {
    const m = item.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
    if (!m) throw Error("页码格式例如 1-3,7；使用 PDF 物理页序。");
    const start = Number(m[1]),
      end = Number(m[2] || m[1]);
    if (start < 1 || end < start || end > total)
      throw Error(`页序须在 1–${total} 内。`);
    if (end - start > 1000) throw Error("单次页数过多，请分批处理。");
    for (let n = start; n <= end; n++) result.add(n);
  }
  return [...result].sort((a, b) => a - b);
}
export async function identity(file: File) {
  if (file.size > 512 * 1024 * 1024)
    throw Error("单文件超过 512MB，请选取必要页后导入。");
  const hash = await sha256(file),
    attachment = {
      id: `file-${hash}`,
      name: file.name,
      type: file.type || "application/octet-stream",
      bytes: file.size,
      sha256: hash,
    };
  const source: any = {
    id: uid("source"),
    title: file.name.replace(/\.[^.]+$/, ""),
    author: "",
    date: "",
    kind: "待分类",
    acquisition: "本机文件导入",
    titleStatus: "由文件名暂拟，待核对原件",
    attachments: [attachment],
    tags: [],
    collections: [],
    included: true,
    status: "待核",
  };
  return { source, attachment, file };
}
export async function openPDF(file: Blob) {
  return pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: new URL("vendor/cmaps/", location.href).href,
    cMapPacked: true,
    standardFontDataUrl: new URL("vendor/standard_fonts/", location.href).href,
    wasmUrl: new URL("vendor/pdf-wasm/", location.href).href,
  }).promise;
}
export async function pdfText(document: any, pageNumber: number) {
  const page = await document.getPage(pageNumber),
    content = await page.getTextContent();
  const text = content.items
    .map((x: any) => x.str + (x.hasEOL ? "\n" : " "))
    .join("")
    .trim();
  return { text, items: content.items.length };
}
export async function renderPDF(document: any, pageNumber: number) {
  const page = await document.getPage(pageNumber),
    viewport = page.getViewport({ scale: 1.5 });
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({
    canvasContext: canvas.getContext("2d"),
    canvas,
    viewport,
  }).promise;
  return canvas;
}
export async function renderImage(file: Blob) {
  const image = await createImageBitmap(file),
    canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d").drawImage(image, 0, 0);
  image.close();
  return canvas;
}
export function newSegment(
  sourceId: string,
  attachmentId: string,
  text: string,
  method: string,
  locator: any = {},
) {
  return {
    id: uid("segment"),
    sourceId,
    attachmentId,
    text,
    method,
    ...locator,
    verification: "待核",
    revision: 1,
    derived: false,
    processedAt: now(),
    coverage: "仅本次明确选择的页或段落；未自动认定全文已读",
  };
}
export async function wordSegments(
  file: File,
  sourceId: string,
  attachmentId: string,
) {
  const bytes = await file.arrayBuffer();
  const parsed = await mammoth.extractRawText({ arrayBuffer: bytes });
  // Read document.xml separately to preserve paragraph locators and footnote identity.
  const zip = await JSZip.loadAsync(bytes),
    xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw Error("Word 文件缺少正文结构。");
  const dom = new DOMParser().parseFromString(xml, "application/xml");
  if (dom.querySelector("parsererror")) throw Error("Word 正文结构无法解析。");
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const segments = Array.from(dom.getElementsByTagNameNS(ns, "p"))
    .map((p, i) => ({
      p,
      index: i + 1,
      text: Array.from(p.getElementsByTagNameNS(ns, "t"))
        .map((n) => n.textContent || "")
        .join(""),
    }))
    .filter((x) => x.text.trim())
    .map((x) =>
      newSegment(sourceId, attachmentId, x.text, "Mammoth + DOCX 段落结构", {
        locator: `正文段落 ${x.index}`,
        paragraph: x.index,
      }),
    );
  const footnotes = await zip.file("word/footnotes.xml")?.async("string");
  if (footnotes) {
    const d = new DOMParser().parseFromString(footnotes, "application/xml");
    for (const fn of Array.from(d.getElementsByTagNameNS(ns, "footnote"))) {
      const id = Number(fn.getAttributeNS(ns, "id"));
      if (id < 1) continue;
      const text = Array.from(fn.getElementsByTagNameNS(ns, "t"))
        .map((n) => n.textContent || "")
        .join("");
      if (text)
        segments.push(
          newSegment(sourceId, attachmentId, text, "DOCX 脚注结构", {
            locator: `脚注 ${id}`,
            footnoteId: id,
          }),
        );
    }
  }
  return {
    segments,
    warnings: parsed.messages.map((x) => x.message),
    mammothTextLength: parsed.value.length,
  };
}
export function bibliography(text: string, extension: string) {
  const items =
    extension === "csv"
      ? Papa.parse(text, { header: true, skipEmptyLines: true }).data
      : new Cite(text).data;
  return (items as any[]).map((x) => ({
    id: uid("source"),
    title: String(x.title || x.题名 || "未载题名"),
    author: Array.isArray(x.author)
      ? x.author
          .map((a: any) => a.literal || `${a.given || ""} ${a.family || ""}`)
          .join("; ")
      : String(x.author || x.作者 || ""),
    date: String(x.issued?.["date-parts"]?.[0]?.[0] || x.year || x.年份 || ""),
    kind: "二手文献",
    attachments: [],
    tags: [],
    collections: [],
    included: true,
    status: "待取得",
    acquisition: `${extension.toUpperCase()} 题录导入`,
    originalFields: x,
  }));
}
