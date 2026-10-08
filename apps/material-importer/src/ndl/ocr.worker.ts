import { LayoutDetector } from "./layout-detector";
import { TextRecognizer } from "./text-recognizer";
import { ReadingOrderProcessor } from "./reading-order";
import { NDLModelStore } from "./model-loader";
const recognizers = new Map<number, TextRecognizer>();
let layout: LayoutDetector;
const progress = (message: string) =>
  self.postMessage({ type: "progress", message });
self.onmessage = async (e: MessageEvent) => {
  if (e.data.type !== "ocr") return;
  const start = performance.now();
  try {
    const store = new NDLModelStore({ baseURL: e.data.baseURL });
    const model = async (name: string) => (await store.load(name, progress)).bytes;
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
