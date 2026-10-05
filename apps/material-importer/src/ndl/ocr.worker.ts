import { LayoutDetector } from "./layout-detector";
import { TextRecognizer } from "./text-recognizer";
import { ReadingOrderProcessor } from "./reading-order";
import models from "./models.json";
const recognizers = new Map<number, TextRecognizer>();
let layout: LayoutDetector;
const progress = (message: string) =>
  self.postMessage({ type: "progress", message });
async function model(name: string) {
  const hash = models[name]?.sha256;
  if (!hash) throw Error("模型未登记。");
  const cache = await caches.open("pku-ndl-models-v1");
  const url = new URL(`models/${name}`, self.location.origin).href;
  const key = `${url}?sha256=${hash}`,
    cached = await cache.match(key);
  if (cached) return cached.arrayBuffer();
  progress(
    `首次载入 ${name}；约 ${Math.round(models[name].bytes / 1024 / 1024)} MB`,
  );
  const r = await fetch(url);
  if (!r.ok) throw Error(`模型尚未配置：${name}。使用本机启动脚本准备模型。`);
  const bytes = await r.arrayBuffer();
  const actual = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  if (actual !== hash) throw Error(`模型指纹不符：${name}`);
  try {
    await cache.put(key, new Response(bytes));
  } catch {
    progress("模型已载入，但浏览器空间不足，未缓存。");
  }
  return bytes;
}
self.onmessage = async (e: MessageEvent) => {
  if (e.data.type !== "ocr") return;
  const start = performance.now();
  try {
    if (!layout) {
      layout = new LayoutDetector();
      await layout.initialize(await model("deim-s-1024x1024.onnx"));
    }
    progress("识别实际页面的文字行与版面…");
    const detected = await layout.detect(e.data.imageData),
      regions = detected.lines;
    const crops = TextRecognizer.cropImageDataBatch(e.data.imageData, regions),
      blocks = [];
    for (let i = 0; i < regions.length; i++) {
      const category = regions[i].charCountCategory,
        width = category === 3 ? 256 : category === 2 ? 384 : 768,
        size = category === 3 ? 30 : category === 2 ? 50 : 100;
      if (!recognizers.has(size)) {
        const r = new TextRecognizer([1, 3, 16, width]);
        await r.initialize(await model(`parseq-ndl-${size}.onnx`));
        recognizers.set(size, r);
      }
      progress(`识读第 ${i + 1} / ${regions.length} 行`);
      const r = await recognizers.get(size).recognizeCropped(crops[i]);
      blocks.push({ ...regions[i], text: r.text, readingOrder: i + 1 });
    }
    const ordered = new ReadingOrderProcessor().process(
      blocks,
      detected.blocks,
    );
    self.postMessage({
      type: "done",
      id: e.data.id,
      text: ordered.map((x) => x.text).join("\n"),
      blocks: ordered,
      ms: performance.now() - start,
      engine: "NDLOCR-Lite / DEIM + PARSeq16 / ONNX WASM",
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      id: e.data.id,
      message: (error as Error).message,
    });
  }
};
