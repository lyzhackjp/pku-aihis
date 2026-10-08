import { createWorker, PSM } from "tesseract.js";
export type OCRResult = {
  text: string;
  blocks: any[];
  ms: number;
  engine: string;
};
let running: Worker;
let tesseract: any;
export function cancelOCR() {
  running?.terminate();
  running = null;
  tesseract?.terminate();
  tesseract = null;
}
export async function ndlOCR(
  canvas: HTMLCanvasElement,
  onProgress: (s: string) => void,
  signal: AbortSignal,
): Promise<OCRResult> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    running = new Worker(new URL("./ndl/ocr.worker.ts", import.meta.url), {
      type: "module",
    });
    const current = running;
    const stop = () => {
      current.terminate();
      if (running === current) running = null;
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      stop();
      reject(new DOMException("已取消", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    current.onmessage = (e) => {
      if (e.data.type === "progress") onProgress(e.data.message);
      if (e.data.type === "done") {
        stop();
        resolve(e.data);
      }
      if (e.data.type === "error") {
        stop();
        reject(Error(e.data.message));
      }
    };
    current.onerror = (e) => {
      stop();
      reject(Error(e.message || "浏览器 OCR Worker 未能启动。"));
    };
    const imageData = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height);
    current.postMessage({
      type: "ocr", id: crypto.randomUUID(), imageData,
      baseURL: new URL(import.meta.env.BASE_URL, document.baseURI).href,
    });
  });
}
export async function tesseractOCR(
  canvas: HTMLCanvasElement,
  language: string,
  vertical: boolean,
  onProgress: (s: string) => void,
  signal: AbortSignal,
): Promise<OCRResult> {
  const started = performance.now(),
    abort = () => cancelOCR();
  signal.addEventListener("abort", abort, { once: true });
  try {
    tesseract = await createWorker(language, 1, {
      workerPath: new URL("vendor/tesseract-worker.min.js", location.href).href,
      corePath: new URL("vendor/tesseract-core/", location.href).href,
      logger: (m) =>
        onProgress(`${m.status} ${Math.round((m.progress || 0) * 100)}%`),
    });
    if (signal.aborted) throw new DOMException("已取消", "AbortError");
    await tesseract.setParameters({
      tessedit_pageseg_mode: vertical ? PSM.SINGLE_BLOCK_VERT_TEXT : PSM.AUTO,
    });
    const result = await tesseract.recognize(canvas);
    if (signal.aborted) throw new DOMException("已取消", "AbortError");
    return {
      text: result.data.text,
      blocks: [],
      ms: performance.now() - started,
      engine: `Tesseract.js 7 / ${language} / ${vertical ? "纵排" : "自动版面"}`,
    };
  } finally {
    await tesseract?.terminate();
    tesseract = null;
    signal.removeEventListener("abort", abort);
  }
}
/** Optional external vision call. It is separate from local OCR and never stores a key. */
export async function visionOCR(
  canvas: HTMLCanvasElement,
  config: { endpoint: string; model: string; key: string },
  signal: AbortSignal,
): Promise<OCRResult> {
  if (!config.key) throw Error("填写图像识读接口专用 key。");
  const start = performance.now();
  const url = new URL(config.endpoint.replace(/\/$/, "") + "/chat/completions");
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw Error("接口须使用 HTTPS 或本机地址。");
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请仅转录图片中的文字，尽量保留段落与阅读顺序；难辨处标记[难辨]，不要解释、补写或概括。",
            },
            {
              type: "image_url",
              image_url: { url: canvas.toDataURL("image/png") },
            },
          ],
        },
      ],
      stream: false,
    }),
  });
  if (!response.ok)
    throw Error(`图像接口 HTTP ${response.status}；不假定聊天模型支持图像。`);
  const json = await response.json(),
    text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw Error("图像接口未返回转录文本。");
  return {
    text,
    blocks: [],
    ms: performance.now() - start,
    engine: `远端视觉模型：${config.model}（待核转录）`,
  };
}
