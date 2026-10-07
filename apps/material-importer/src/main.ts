import "./style.css";
import JSZip from "jszip";
import {
  emptyProject,
  validateProject,
  uid,
  record,
  download,
  editSegment,
} from "../../../packages/course-project/project.mjs";
import {
  openDB,
  loadProject,
  saveProject,
  getAttachment,
} from "../../../packages/course-project/storage.mjs";
import {
  exportArchive,
  importArchive,
} from "../../../packages/course-project/archive.mjs";
import {
  identity,
  openPDF,
  pdfText,
  renderPDF,
  renderImage,
  wordSegments,
  bibliography,
  newSegment,
  pagesFrom,
} from "./parsers";
import { ndlOCR, tesseractOCR, visionOCR, cancelOCR } from "./ocr";
let project: any = emptyProject("材料预处理项目"),
  db: any,
  current = "",
  chosenSegment = "",
  mode = "文字层提取",
  range = "1-3",
  language = "jpn",
  vertical = true,
  busy = false,
  status = "",
  previewURL = "",
  controller: AbortController;
let comparisons: any[] = [],
  lastCanvas: HTMLCanvasElement,
  lastImageData: any;
const vision = {
  endpoint: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  key: "",
};
const receiverParam = new URLSearchParams(location.search).get("receiver");
let receiver = "";
try {
  receiver = receiverParam ? new URL(receiverParam).origin : "";
} catch {}
let connected = false;
const host = document.getElementById("app");
const source = () => project.sources.find((x: any) => x.id === current);
const segment = () =>
  project.segments.find(
    (x: any) => x.id === chosenSegment && x.sourceId === current,
  ) || project.segments.find((x: any) => x.sourceId === current);
const node = (tag: string, text = "", className = "") => {
  const n = document.createElement(tag);
  n.textContent = text;
  n.className = className;
  return n;
};
const button = (label: string, fn: () => any, disabled = false) => {
  const b = node("button", label) as HTMLButtonElement;
  b.disabled = disabled;
  b.onclick = () =>
    Promise.resolve(fn()).catch((e) => {
      status = `操作失败：${e.message}`;
      render();
    });
  return b;
};
function field(
  label: string,
  value: any,
  change: (v: string) => void,
  type = "text",
) {
  const l = node("label", "", "field");
  l.append(node("span", label));
  const input =
    type === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");
  if (input instanceof HTMLInputElement) input.type = type;
  else input.rows = 5;
  input.value = value ?? "";
  input.onchange = () => change(input.value);
  l.append(input);
  return l;
}
function select(
  label: string,
  value: string,
  options: string[],
  change: (v: string) => void,
) {
  const l = node("label", "", "field");
  l.append(node("span", label));
  const s = document.createElement("select");
  for (const o of options) {
    const option = node("option", o) as HTMLOptionElement;
    option.value = o;
    option.selected = o === value;
    s.append(option);
  }
  s.onchange = () => change(s.value);
  l.append(s);
  return l;
}
function card(title: string, text: string) {
  const c = node("article", "", "card");
  c.append(node("h3", title), node("p", text));
  return c;
}
function col(number: string, title: string) {
  const c = node("section", "", "flow-col");
  c.append(node("h2", `${number} · ${title}`));
  return c;
}
async function persist(files: any[] = []) {
  await saveProject(db, project, files);
}
async function edit(action: string, target: string, fn: () => void) {
  fn();
  record(project, action, target);
  await persist();
  render();
}
async function blob(a: any) {
  const b = await getAttachment(db, a.id);
  if (!b) throw Error("附件未随项目保存，请重新导入原件。");
  return new File([b as Blob], a.name, { type: a.type });
}
async function ingest(files: File[]) {
  if (busy) return;
  busy = true;
  status = "正在登记文件与内容指纹…";
  render();
  try {
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "zip") {
        const r = await importArchive(JSZip, file);
        project = validateProject(r.project);
        await persist(r.files);
        current = project.sources[0]?.id || "";
        continue;
      }
      if (ext === "json") {
        const j = JSON.parse(await file.text());
        if (j.schema) {
          project = validateProject(j);
          await persist();
          current = project.sources[0]?.id || "";
          continue;
        }
      }
      if (["ris", "bib", "bibtex", "csv", "json"].includes(ext)) {
        const sources = bibliography(await file.text(), ext);
        project.sources.push(...sources);
        current = sources[0]?.id || current;
        record(
          project,
          "导入题录，正文未取得",
          current,
          `${file.name}：${sources.length} 条`,
        );
        continue;
      }
      if (
        !["pdf", "docx", "txt", "md", "png", "jpg", "jpeg", "webp"].includes(
          ext,
        )
      )
        throw Error(
          `${file.name} 暂不支持；旧版 .doc 请先另存为 .docx 或 PDF。`,
        );
      const item = await identity(file);
      const duplicate = project.sources.find((x: any) =>
        x.attachments.some((a: any) => a.sha256 === item.attachment.sha256),
      );
      if (duplicate) {
        status = `${file.name} 已导入；保留此前校订与阅读记录。`;
        current = duplicate.id;
        continue;
      }
      project.sources.push(item.source);
      current = item.source.id;
      if (ext === "pdf") {
        const pdf = await openPDF(file);
        item.source.pdfPages = pdf.numPages;
        await pdf.destroy();
        range = `1-${Math.min(3, item.source.pdfPages)}`;
      }
      project.tasks.push({
        id: uid("task"),
        sourceId: item.source.id,
        status: "待读",
        priority: 2,
        type: "筛选",
        range: "",
        readRange: "",
        next: "选择处理范围，核对文字与原件",
        blocker: "正文尚未处理",
        understanding: "",
      });
      record(project, "登记本机材料", item.source.id, file.name);
      await persist([{ id: item.attachment.id, blob: file }]);
    }
    await persist();
    status = status.startsWith("正在")
      ? "文件已保存；选择范围和处理方式后继续。"
      : status;
  } catch (e) {
    await persist();
    status = `导入中断：${e.message}；此前已完成的文件仍可接续。`;
  } finally {
    busy = false;
    render();
  }
}
async function canvasFor(s: any, pageNumber: number) {
  const a = s.attachments[0],
    file = await blob(a);
  if (/pdf$/i.test(a.name)) {
    const pdf = await openPDF(file);
    try {
      return await renderPDF(pdf, pageNumber);
    } finally {
      await pdf.destroy();
    }
  }
  return renderImage(file);
}
async function ocr(canvas: HTMLCanvasElement, engine = mode) {
  const progress = (text: string) => {
    status = text;
    const label = document.getElementById("status");
    if (label) label.textContent = text;
  };
  if (engine === "NDLOCR-Lite（本机浏览器）")
    return ndlOCR(canvas, progress, controller.signal);
  if (engine === "Tesseract（本机浏览器）")
    return tesseractOCR(
      canvas,
      language,
      vertical,
      progress,
      controller.signal,
    );
  if (engine === "视觉模型 API（发送选页）")
    return visionOCR(canvas, vision, controller.signal);
  throw Error("图像／扫描页需要选择识读方式。");
}
async function process() {
  const s = source();
  if (!s?.attachments.length) return;
  busy = true;
  controller = new AbortController();
  status = "正在处理明确选择的范围…";
  render();
  try {
    const a = s.attachments[0],
      file = await blob(a),
      ext = a.name.split(".").pop().toLowerCase();
    if (ext === "docx") {
      const r = await wordSegments(file, s.id, a.id);
      project.segments.push(
        ...r.segments.filter(
          (n: any) =>
            !project.segments.some(
              (o: any) =>
                o.sourceId === n.sourceId &&
                o.locator === n.locator &&
                o.method === n.method,
            ),
        ),
      );
      status = `取得 ${r.segments.length} 个正文／脚注段落；Mammoth 提示 ${r.warnings.length} 项。`;
      s.processingWarnings = r.warnings;
    } else if (["txt", "md"].includes(ext)) {
      const text = await file.text();
      text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .forEach((p, i) => {
          if (
            !project.segments.some(
              (o: any) =>
                o.sourceId === s.id &&
                o.paragraph === i + 1 &&
                o.method === "本机纯文本",
            )
          )
            project.segments.push(
              newSegment(s.id, a.id, p, "本机纯文本", {
                locator: `文本段落 ${i + 1}`,
                paragraph: i + 1,
              }),
            );
        });
      status = "文本段落已登记；段落号不等于印刷页码。";
    } else {
      const pages = ext === "pdf" ? pagesFrom(range, s.pdfPages) : [1];
      for (const pageNumber of pages) {
        if (controller.signal.aborted)
          throw new DOMException("已取消", "AbortError");
        if (
          project.segments.some(
            (x: any) =>
              x.sourceId === s.id &&
              x.pdfPage === pageNumber &&
              x.method === mode,
          )
        ) {
          status = `跳过已处理 PDF ${pageNumber}；不会覆盖校订文字。`;
          continue;
        }
        let text = "",
          blocks = [],
          ms = 0,
          engine = mode;
        if (ext === "pdf" && mode === "文字层提取") {
          const pdf = await openPDF(file);
          try {
            const r = await pdfText(pdf, pageNumber);
            text = r.text;
          } finally {
            await pdf.destroy();
          }
          if (!text.trim()) {
            status = `PDF ${pageNumber} 未提取到文字；请改用识读，未生成虚构正文。`;
            s.status = "待OCR";
            continue;
          }
        } else {
          lastCanvas = await canvasFor(s, pageNumber);
          const r = await ocr(lastCanvas);
          text = r.text;
          blocks = r.blocks;
          ms = r.ms;
          engine = r.engine;
        }
        const seg = newSegment(
          s.id,
          a.id,
          text,
          mode,
          ext === "pdf"
            ? { pdfPage: pageNumber, printedPage: "" }
            : { locator: "图像全页" },
        );
        Object.assign(seg, { blocks, processingMs: ms, engine });
        project.segments.push(seg);
        chosenSegment = seg.id;
        record(
          project,
          "处理所选范围",
          seg.id,
          `${ext === "pdf" ? "PDF " + pageNumber : "图像"}；${engine}`,
        );
        await persist();
      }
      if (!status.includes("未提取"))
        status = "所选范围处理完成；文字均保持待核状态。";
    }
    s.processedRange =
      ext === "pdf"
        ? range
        : ext === "docx"
          ? "DOCX正文段落和脚注"
          : "所导入文本／图像";
    await persist();
  } catch (e) {
    status =
      e.name === "AbortError"
        ? "已取消；已完成页保留，可选择剩余范围继续。"
        : `处理失败：${e.message}；已完成部分保留。`;
  } finally {
    busy = false;
    render();
  }
}
async function compare(engine: string) {
  const s = source();
  if (!s?.attachments.length) return;
  busy = true;
  controller = new AbortController();
  status = `正在用 ${engine} 识读同一页…`;
  render();
  try {
    lastCanvas = await canvasFor(s, segment()?.pdfPage || 1);
    const r = await ocr(lastCanvas, engine);
    comparisons.push({
      ...r,
      sourceId: s.id,
      pdfPage: segment()?.pdfPage || 1,
      time: new Date().toISOString(),
    });
    project.comparisons = [
      ...(project.comparisons || []),
      comparisons[comparisons.length - 1],
    ];
    await persist();
    status = `实测完成：${r.engine}，${(r.ms / 1000).toFixed(1)} 秒。`;
  } catch (e) {
    status = `比较失败：${e.message}`;
  } finally {
    busy = false;
    render();
  }
}
async function exportZIP() {
  busy = true;
  status = "正在打包本机原件与处理记录…";
  render();
  try {
    const r = await exportArchive(JSZip, project, (id) =>
      getAttachment(db, id),
    );
    download(r.blob, "材料项目_含原件.zip");
    status = `备份已生成；缺失原件 ${r.missing.length} 个。`;
  } finally {
    busy = false;
    render();
  }
}
async function transfer() {
  if (!connected || !window.opener || !receiver)
    throw Error("没有已连接的课件窗口。可下载 ZIP，再在课件中恢复／追加。");
  const files = [];
  for (const s of project.sources)
    for (const a of s.attachments) {
      const b = await getAttachment(db, a.id);
      if (b && !files.some((x) => x.id === a.id))
        files.push({ id: a.id, blob: b });
    }
  window.opener.postMessage(
    { type: "PKU_PROJECT", project: validateProject(project), files },
    receiver,
  );
  status = "已发送，正在等待课件接收结果…";
  render();
}
window.addEventListener("message", (e) => {
  if (e.source !== window.opener || e.origin !== receiver) return;
  if (e.data?.type === "PKU_IMPORT_HELLO") {
    connected = true;
    render();
  }
  if (e.data?.type === "PKU_IMPORT_ACCEPTED") {
    status = "课件已接收；返回课件查看材料、阅读队列和笔记。";
    render();
  }
});
function render() {
  host.replaceChildren();
  const shell = node("main", "", "shell"),
    header = node("header", "", "top");
  header.append(
    node("div", "材料导入与预处理", "brand"),
    node("p", "文件 → 范围 → 文字与校订 → 进入研究项目"),
  );
  shell.append(header);
  const msg = node("p", status, "status");
  msg.id = "status";
  msg.setAttribute("role", "status");
  shell.append(msg);
  const grid = node("div", "", "flow-grid"),
    one = col("01", "文件与任务"),
    two = col("02", "选择处理范围"),
    three = col("03", "对照、校订与比较"),
    four = col("04", "保存与接续");
  const upload = field(
    "PDF / DOCX / 图像 / 文本 / RIS / BibTeX / CSV / 备份",
    null,
    () => {},
    "file",
  ) as HTMLLabelElement;
  const input = upload.querySelector("input");
  input.multiple = true;
  input.disabled = busy;
  input.accept =
    ".pdf,.docx,.png,.jpg,.jpeg,.webp,.txt,.md,.ris,.bib,.bibtex,.csv,.json,.zip";
  input.onchange = () => ingest([...input.files]);
  one.append(upload);
  const drop = node("div", "或将文件拖到这里", "drop");
  drop.ondragover = (e) => {
    e.preventDefault();
  };
  drop.ondrop = (e) => {
    e.preventDefault();
    ingest([...e.dataTransfer.files]);
  };
  one.append(drop);
  one.append(
    field(
      "项目问题",
      project.question,
      (v) => edit("登记研究问题", project.id, () => (project.question = v)),
      "textarea",
    ),
  );
  for (const s of project.sources)
    one.append(
      button(
        `${s.title} · ${s.attachments.length ? "有原件" : "仅题录"}`,
        () => {
          current = s.id;
          chosenSegment = "";
          comparisons = (project.comparisons || []).filter(
            (x: any) => x.sourceId === current,
          );
          if (previewURL) URL.revokeObjectURL(previewURL);
          previewURL = "";
          if (s.pdfPages) range = `1-${Math.min(3, s.pdfPages)}`;
          render();
        },
        busy,
      ),
    );
  const s = source(),
    seg = segment();
  if (s) {
    two.append(
      field("题名（由文件名暂拟，需核对）", s.title, (v) =>
        edit("核对题名", s.id, () => (s.title = v)),
      ),
      select("材料角色", s.kind, ["待分类", "史料", "二手文献", "教师研究草稿"], (v) =>
        edit("登记材料角色", s.id, () => {
          s.kind = v;
          if (v === "教师研究草稿") s.included = false;
        }),
      ),
      field("责任者（未知留空）", s.author, (v) =>
        edit("登记责任者", s.id, () => (s.author = v)),
      ),
      field("出版年代", s.date, (v) =>
        edit("登记出版年代", s.id, () => (s.date = v)),
      ),
    );
    if (s.pdfPages)
      two.append(
        field(
          `PDF 物理页序（共 ${s.pdfPages} 页；例 1-3,7）`,
          range,
          (v) => (range = v),
        ),
      );
    two.append(
      select(
        "处理方式",
        mode,
        [
          "文字层提取",
          "NDLOCR-Lite（本机浏览器）",
          "Tesseract（本机浏览器）",
          "视觉模型 API（发送选页）",
        ],
        (v) => {
          mode = v;
          render();
        },
      ),
    );
    if (mode === "Tesseract（本机浏览器）") {
      two.append(
        select(
          "语言模型",
          language,
          ["jpn", "jpn_vert", "chi_sim", "chi_tra", "eng"],
          (v) => (language = v),
        ),
        select(
          "版面",
          vertical ? "纵排" : "自动",
          ["纵排", "自动"],
          (v) => (vertical = v === "纵排"),
        ),
      );
    }
    if (mode === "视觉模型 API（发送选页）")
      two.append(
        field("视觉接口地址", vision.endpoint, (v) => (vision.endpoint = v)),
        field("视觉模型名", vision.model, (v) => (vision.model = v)),
        field(
          "图像接口 key（仅本窗口内存）",
          vision.key,
          (v) => (vision.key = v),
          "password",
        ),
        node(
          "p",
          "点击处理后，所选页的图像会发送至此接口；聊天接口不一定支持图像。",
        ),
      );
    two.append(
      button("处理所选范围", process, busy || !s.attachments.length),
      button(
        "取消；保留已完成页",
        () => {
          controller?.abort();
          cancelOCR();
        },
        !busy,
      ),
      node(
        "p",
        "本机文字提取与 OCR 不发送原件。NDLOCR 模型首次按需加载；大型整卷请分批选择必要页。",
      ),
    );
    const segments = project.segments.filter((x: any) => x.sourceId === s.id);
    if (segments.length) {
      const l = node("label", "", "field");
      l.append(node("span", "当前已处理片段"));
      const sel = document.createElement("select");
      sel.setAttribute("aria-label", "当前已处理片段");
      for (const p of segments) {
        const o = new Option(
          `${p.pdfPage ? "PDF " + p.pdfPage : p.locator} · ${p.method}`,
          p.id,
        );
        o.selected = p.id === seg?.id;
        sel.append(o);
      }
      sel.onchange = () => {
        chosenSegment = sel.value;
        previewURL = "";
        render();
      };
      sel.disabled = busy;
      l.append(sel);
      three.append(l);
    }
    if (seg) {
      three.append(
        field("印刷页码／档号（另行核对）", seg.printedPage, (v) =>
          edit("登记印刷定位", seg.id, () => (seg.printedPage = v)),
        ),
        field(
          "校订文字（原始识读另存）",
          seg.text,
          (v) =>
            edit("校订转录", seg.id, () => {
              seg.originalText ??= seg.text;
              editSegment(project, seg.id, v);
            }),
          "textarea",
        ),
        select(
          "人工核验状态",
          seg.verification,
          ["待核", "所选短段已核", "难辨，待进一步核对"],
          (v) => edit("登记转录核验", seg.id, () => (seg.verification = v)),
        ),
        button("预览对应原页", async () => {
          lastCanvas = await canvasFor(s, seg.pdfPage || 1);
          if (previewURL) URL.revokeObjectURL(previewURL);
          previewURL = lastCanvas.toDataURL("image/png");
          render();
        }),
      );
    }
    if (previewURL) {
      const img = document.createElement("img");
      img.src = previewURL;
      img.alt = "对应物理页原图";
      img.className = "source-image";
      three.append(img);
    }
    three.append(
      button(
        "同页比较：NDLOCR-Lite",
        () => compare("NDLOCR-Lite（本机浏览器）"),
        busy || !s.attachments.length,
      ),
      button(
        "同页比较：Tesseract",
        () => compare("Tesseract（本机浏览器）"),
        busy || !s.attachments.length,
      ),
    );
    three.append(
      button(
        "另窗比较：Scribe.js",
        () => window.open("/comparisons/scribe.html", "scribe-comparison"),
        busy,
      ),
    );
    for (const r of comparisons)
      three.append(
        card(`${r.engine} · ${(r.ms / 1000).toFixed(1)} 秒`, r.text),
      );
  } else
    two.append(
      card("先选择材料", "题录可以没有正文；图像与扫描 PDF 需要明确启动识读。"),
    );
  four.append(
    card(
      "当前处理覆盖",
      `${project.sources.length} 项材料；${project.segments.length} 个实际正文片段。所有未处理页仍保持未覆盖。`,
    ),
    button("保存并下载含原件 ZIP", exportZIP, busy),
    button(
      connected ? "送回已经连接的课件" : "送回课件（须从课件打开本页）",
      transfer,
      busy || !connected,
    ),
    button(
      "导出第三周语料格式（不含向量）",
      () => {
        const records = project.segments
          .filter((x: any) => x.text && !x.derived)
          .map((x: any) => {
            const s = project.sources.find((a: any) => a.id === x.sourceId);
            return {
              id: x.id,
              source_id: s.id,
              title: s.title,
              author: s.author,
              date: s.date,
              file_page: x.pdfPage,
              printed_page: x.printedPage,
              locator: x.locator,
              text: x.text,
              status: x.verification,
              extraction_method: x.method,
            };
          });
        download(
          new Blob([JSON.stringify(records, null, 2)], {
            type: "application/json",
          }),
          "第三周_处理片段_不含向量.json",
        );
      },
      busy,
    ),
    node(
      "p",
      "第四周可以直接接收本页处理后的原件与记录；学生不必先手写 JSON。第三周格式仅用于兼容旧演示。",
    ),
  );
  const history = node("ol", "", "history");
  for (const event of project.events.slice(-8).reverse())
    history.append(
      node(
        "li",
        `${event.time.slice(11, 19)} · ${event.action} · ${event.detail || ""}`,
      ),
    );
  four.append(
    history,
    node(
      "p",
      "本页数据保存在当前浏览器。导出的 ZIP 包含附件与指纹；仅有题录时不声称已经取得或通读正文。",
    ),
  );
  grid.append(one, two, three, four);
  shell.append(grid);
  host.append(shell);
  if (busy) {
    for (const el of host.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input,select,textarea"))
      el.disabled = true;
  }
}
try {
  db = await openDB("pku-history-material-importer");
  project = (await loadProject(db)) || project;
  current = project.sources[0]?.id || "";
  status = "选择文件开始；之前保存的处理记录可在本页接续。";
  render();
  if (window.opener && receiver)
    window.opener.postMessage({ type: "PKU_IMPORT_READY" }, receiver);
} catch (e) {
  status = `浏览器项目无法打开：${e.message}`;
  render();
}
