import { Component, h, Prop, State, Watch, Listen } from "@stencil/core";
import { fileBlob, source, update, state, uid, now } from "../../lib/project";
@Component({ tag: "source-reader", shadow: false })
export class SourceReader {
  @Prop() attachmentId = "";
  @Prop() page = 1;
  @State() message = "";
  @State() opened = false;
  @State() mode = "PDF.js";
  @State() url = "";
  @State() pageCount = 0;
  @State() expanded = false;
  private zoteroFrame: HTMLIFrameElement;
  private canvas: HTMLCanvasElement;
  private document: any;
  private generation = 0;
  private renderTask: any;
  @Watch("attachmentId") @Watch("page") async change() {
    this.mode = "PDF.js";
    this.close();
    if (this.opened) await this.open();
  }
  disconnectedCallback() {
    this.close();
  }
  @Listen("keydown", { target: "window" }) key(e: KeyboardEvent) {
    if (this.expanded && e.key === "Escape") this.expanded = false;
  }
  private close() {
    this.generation++;
    this.renderTask?.cancel();
    this.renderTask = null;
    void this.document?.destroy().catch(() => {});
    this.document = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = "";
  }
  private async open() {
    this.close();
    this.mode = "PDF.js";
    const generation = ++this.generation;
    this.opened = true;
    this.message = "正在打开原件…";
    try {
      const a = source()?.attachments.find(
        (x: any) => x.id === this.attachmentId,
      );
      if (!a) throw Error("未找到附件。");
      const stored = a.localUrl?.startsWith("/local-file/")
        ? null
        : await fileBlob(a.id);
      if (generation !== this.generation) return;
      this.url = stored ? URL.createObjectURL(stored) : a.localUrl || "";
      if (!this.url) throw Error("原件未随记录保存，请在导入器中重新附加。");
      if (a.type?.startsWith("image/")) {
        this.mode = "图像";
        this.message = "";
        return;
      }
      if (!/pdf/i.test(a.type + a.name)) {
        this.mode = "下载";
        this.message = "此格式使用段落定位；可下载原件在原软件核对。";
        return;
      }
      // Same-origin, version-matched PDF.js worker; no file leaves this browser.
      const vendor = new URL("assets/vendor/", location.href);
      const pdf = await import(/* webpackIgnore: true */ `${vendor}pdf.mjs`);
      if (generation !== this.generation) return;
      pdf.GlobalWorkerOptions.workerSrc = `${vendor}pdf.worker.mjs`;
      const document = await pdf.getDocument({
        url: this.url,
        cMapUrl: `${vendor}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${vendor}standard_fonts/`,
        wasmUrl: `${vendor}pdf-wasm/`,
      }).promise;
      if (generation !== this.generation) {
        await document.destroy();
        return;
      }
      this.document = document;
      this.pageCount = document.numPages;
      await this.draw(Math.min(this.page, document.numPages));
    } catch (e) {
      if (generation === this.generation)
        this.message = `打开失败：${e.message}`;
    }
  }
  private async draw(page: number) {
    const doc = this.document,
      generation = this.generation;
    if (!doc || this.mode !== "PDF.js") return;
    try {
      const p = await doc.getPage(page);
      if (
        generation !== this.generation ||
        doc !== this.document ||
        this.mode !== "PDF.js" ||
        !this.canvas
      )
        return;
      const viewport = p.getViewport({ scale: 1.15 }),
        canvas = this.canvas;
      this.renderTask?.cancel();
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      this.renderTask = p.render({
        canvasContext: canvas.getContext("2d"),
        canvas,
        viewport,
      });
      await this.renderTask.promise;
      if (generation === this.generation)
        this.message = `PDF物理页 ${page} / ${doc.numPages}；印刷页码请另行登记。`;
    } catch (e) {
      if (
        generation === this.generation &&
        e.name !== "RenderingCancelledException"
      )
        this.message = `原页渲染失败：${e.message}`;
    }
  }
  private async initializeZotero() {
    const s = source(),
      attachment = this.attachmentId,
      projectId = state.project.id;
    const current = () =>
      state.project.id === projectId
        ? state.project.sources.find((x) => x.id === s.id)
        : null;
    try {
      const frame: any = this.zoteroFrame.contentWindow;
      if (!frame.createReader)
        throw Error("尚未安装可选的 Zotero Reader 比较构建。");
      const bytes = new Uint8Array(await (await fetch(this.url)).arrayBuffer());
      if (
        this.mode !== "Zotero Reader（比较）" ||
        this.zoteroFrame?.contentWindow !== frame ||
        this.attachmentId !== attachment
      )
        return;
      frame.createReader({
        type: "pdf",
        data: {
          buf: bytes,
          url: new URL("/comparison/zotero/", location.origin).href,
        },
        annotations: (s.readerAnnotations || []).filter(
          (a) => a.attachmentId === attachment,
        ),
        readOnly: false,
        authorName: "研究者",
        title: s.title,
        loggedIn: true,
        showAnnotations: true,
        sidebarWidth: 240,
        sidebarView: "annotations",
        primaryViewState: { pageIndex: Math.max(0, this.page - 1) },
        onSaveAnnotations: async (rows) => {
          const target = current();
          if (!target) return;
          await update("保存阅读器批注", s.id, () => {
            const map = new Map(
              (target.readerAnnotations || []).map((a) => [a.id, a]),
            );
            for (const a of rows)
              map.set(a.id, { ...a, attachmentId: attachment });
            target.readerAnnotations = [...map.values()];
          });
        },
        onDeleteAnnotations: (ids) => {
          const target = current();
          if (target)
            update(
              "删除阅读器批注",
              s.id,
              () =>
                (target.readerAnnotations = (
                  target.readerAnnotations || []
                ).filter((a) => !ids.includes(a.id))),
            );
        },
        onChangeViewState: () => {},
        onChangeSidebarWidth: () => {},
        onChangeSidebarView: () => {},
        onToggleSidebar: () => {},
        onOpenTagsPopup: () => {},
        onAddToNote: (rows) => {
          if (!current()) return;
          update("将阅读器批注转为来源笔记", s.id, () => {
            for (const a of rows)
              state.project.notes.push({
                id: uid("note"),
                sourceId: s.id,
                attachmentId: attachment,
                annotationId: a.id,
                pdfPage: (a.position?.pageIndex || 0) + 1,
                title: "阅读器批注",
                kind: "来源笔记",
                quote: a.text || "",
                body: a.comment || "",
                decision: "待核",
                createdAt: now(),
              });
          });
        },
        onToggleContextPane: () => {},
        onOpenLink: () => {},
        onSetData: () => {},
        onBringReaderToFront: () => {},
        onFocus: () => {},
        onBlur: () => {},
        onSaveImageAs: () => {},
        onCopyImage: () => {},
        onConfirm: () => Promise.resolve(false),
        onRotatePages: () => {},
        onDeletePages: () => {},
      });
      this.message =
        "Zotero Reader 原版网页阅读与批注；批注保存在此项目，不会自动同步 Zotero 云库。";
    } catch (e) {
      this.message = `Zotero 比较未打开：${e.message}`;
    }
  }
  render() {
    return (
      <div class={{ reader: true, expanded: this.expanded }}>
        <button onClick={() => this.open()} disabled={!this.attachmentId}>
          打开原件
        </button>
        {this.opened && (
          <button onClick={() => (this.expanded = !this.expanded)}>
            {this.expanded ? "返回四栏演示" : "展开原件阅读"}
          </button>
        )}
        {this.opened && (
          <select
            aria-label="阅读器比较"
            onChange={(e: any) => {
              this.mode = e.target.value;
              if (this.mode === "PDF.js" && this.document)
                setTimeout(
                  () => this.draw(Math.min(this.page, this.pageCount)),
                  0,
                );
            }}
          >
            <option selected={this.mode === "PDF.js"}>PDF.js</option>
            <option selected={this.mode === "Zotero Reader（比较）"}>
              Zotero Reader（比较）
            </option>
            <option selected={this.mode === "浏览器原生 PDF"}>
              浏览器原生 PDF
            </option>
          </select>
        )}
        <p role="status">{this.message}</p>
        {this.mode === "PDF.js" && (
          <canvas ref={(el) => (this.canvas = el)} class="pdf-page" />
        )}
        {this.mode === "浏览器原生 PDF" && this.url && (
          <iframe title="原件 PDF" src={`${this.url}#page=${this.page}`} />
        )}
        {this.mode === "Zotero Reader（比较）" && (
          <iframe
            ref={(el) => (this.zoteroFrame = el)}
            title="Zotero Reader 比较"
            src="/comparison/zotero/reader.html"
            onLoad={() => this.initializeZotero()}
          />
        )}{" "}
        {this.mode === "图像" && <img src={this.url} alt="原件图像" />}
        {this.mode === "下载" && this.url && (
          <a href={this.url} download>
            下载原件
          </a>
        )}
      </div>
    );
  }
}
