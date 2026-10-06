import { Component, h, State, Listen } from "@stencil/core";
import {
  init,
  state,
  install,
  listProjects,
  switchProject,
} from "../../lib/project";
import { model } from "../../lib/model";
import { field } from "../../lib/ui";
import topics from "../../assets/data/pages.json";
import processes from "../../assets/data/processes.json";
import { resolveView, viewHash, viewData } from "../../lib/navigation.mjs";
const CHANNEL = "pku-aihis-week04-20261005";
@Component({ tag: "course-app", shadow: false })
export class CourseApp {
  @State() ready = false;
  @State() error = "";
  @State() current = 0;
  @State() active = "P01";
  @State() overview = false;
  @State() settings = false;
  @State() revision = 0;
  @State() importerUrl = "http://127.0.0.1:5174/";
  @State() workbench = false;
  @State() savedProjects: any[] = [];
  @State() related: string[] = [];
  private remembered: Record<string, string> = {};
  private channel: BroadcastChannel;
  private importer: Window;
  private importerOrigin = "";
  private focusStack: HTMLElement[] = [];
  async componentWillLoad() {
    if (new URLSearchParams(location.search).has("presenter")) return;
    try {
      await init();
      this.ready = true;
      this.savedProjects = (await listProjects(state.db)) as any[];
      this.workbench = new URLSearchParams(location.search).has("workbench");
      this.go(location.hash.slice(1) || "W01", false);
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => {
        if (e.data.type === "REQUEST") this.sync();
        if (e.data.type === "NAV") this.go(e.data.id);
      };
    } catch (e) {
      this.error = `项目无法打开：${e.message}`;
    }
  }
  disconnectedCallback() {
    this.channel?.close();
    model.key = "";
  }
  @Listen("project-change", { target: "window" }) async changed() {
    this.revision++;
    if (state.db) this.savedProjects = (await listProjects(state.db)) as any[];
  }
  @Listen("navigate-page", { target: "window" }) navigate(e: CustomEvent) {
    const view = resolveView(processes, e.detail, this.remembered);
    if (!view) return;
    if (!this.related.length && view.index === this.current) this.go(e.detail);
    else this.openRelated(e.detail);
  }
  @Listen("hashchange", { target: "window" }) hash() {
    this.go(location.hash.slice(1), false);
  }
  @Listen("message", { target: "window" }) async imported(e: MessageEvent) {
    if (e.source !== this.importer || e.origin !== this.importerOrigin) return;
    if (e.data?.type === "PKU_IMPORT_READY") {
      this.importer.postMessage(
        { type: "PKU_IMPORT_HELLO" },
        this.importerOrigin,
      );
      return;
    }
    if (e.data?.type === "PKU_PROJECT")
      try {
        await install(e.data.project, e.data.files || [], true);
        this.error = "材料已追加到共同项目；可在材料库、队列和笔记中继续。";
        this.importer.postMessage(
          { type: "PKU_IMPORT_ACCEPTED" },
          this.importerOrigin,
        );
      } catch (error) {
        this.error = `导入失败：${error.message}`;
      }
  }
  private view() {
    return resolveView(
      processes,
      `${processes[this.current].id}/${this.active}`,
    );
  }
  private go(id: string | number, push = true) {
    const target = typeof id === "number" ? processes[id]?.id : id;
    if (!target) return;
    const view = resolveView(processes, target, this.remembered);
    if (!view) return;
    const different = view.index !== this.current;
    this.remembered[processes[this.current].id] = this.active;
    this.current = view.index;
    this.active = view.mode.id;
    this.remembered[view.process.id] = view.mode.id;
    this.overview = false;
    this.related = [];
    const hash = viewHash(view);
    if (push && different && location.hash !== hash)
      history.pushState(null, "", hash);
    else history.replaceState(null, "", hash);
    this.sync();
  }
  private sync() {
    this.channel?.postMessage({
      type: "STATE",
      index: this.current,
      ...viewData(this.view(), topics),
      next: processes[this.current + 1],
      total: processes.length,
      related: this.related.length
        ? topics.find((t) => t.id === this.related.at(-1))?.title
        : "",
    });
  }
  private openRelated(id: string) {
    const view = resolveView(processes, id);
    if (!view) return;
    this.focusStack.push(document.activeElement as HTMLElement);
    this.related = [...this.related, view.mode.id];
    this.sync();
    requestAnimationFrame(() =>
      (
        document.querySelector(".related-dialog button") as HTMLElement
      )?.focus(),
    );
  }
  private closeRelated() {
    this.related = this.related.slice(0, -1);
    const focus = this.focusStack.pop();
    this.sync();
    requestAnimationFrame(() => {
      if (focus?.isConnected) focus.focus();
      else
        (
          document.querySelector(".related-dialog button") as HTMLElement
        )?.focus();
    });
  }
  private openImport() {
    try {
      const u = new URL(this.importerUrl, location.href);
      this.importerOrigin = u.origin;
      u.searchParams.set("receiver", location.origin);
      this.importer = window.open(
        u.href,
        "week04-material-importer",
        "width=1450,height=920",
      );
      if (!this.importer)
        this.error =
          "导入器窗口未打开；请允许本页打开窗口，或直接打开导入器下载备份。";
    } catch {
      this.error = "导入器地址无效。";
    }
  }
  @Listen("keydown", { target: "window" }) key(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (document.querySelector(".reader.expanded")) return;
    if (e.key === "Escape") {
      if (this.related.length) this.closeRelated();
      else if (this.settings) this.settings = false;
      else this.overview = !this.overview;
      e.preventDefault();
      return;
    }
    if (this.related.length || this.settings || this.overview) {
      if (e.key === "Tab") {
        const dialog = document.querySelector(".overlay .dialog");
        const controls = Array.from(
          dialog?.querySelectorAll<HTMLElement>(
            "button:not([disabled]),a[href],input,textarea,select,summary",
          ) || [],
        ).filter((x) => x.offsetParent !== null);
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      return;
    }
    if (
      e
        .composedPath()
        .some((x: any) =>
          x.matches?.(
            "input,textarea,select,button,a[href],summary,[contenteditable=true]",
          ),
        )
    )
      return;
    const delta = {
      ArrowRight: 1,
      PageDown: 1,
      " ": 1,
      ArrowLeft: -1,
      PageUp: -1,
    }[e.key];
    if (delta) {
      e.preventDefault();
      this.go(this.current + delta);
    }
    if (e.key === "Home") this.go(0);
    if (e.key === "End") this.go(processes.length - 1);
    if (e.key.toLowerCase() === "p") this.presenter();
  }
  private presenter() {
    const u = new URL(location.href);
    u.searchParams.delete("workbench");
    u.searchParams.set("presenter", "1");
    window.open(u.href, "week04-presenter", "width=1150,height=800");
    setTimeout(() => this.sync(), 800);
  }
  render() {
    if (new URLSearchParams(location.search).has("presenter"))
      return <deck-presenter />;
    if (!this.ready)
      return <p role="status">{this.error || "正在打开课程项目…"}</p>;
    const view = this.view(),
      p = view.process,
      mode = view.mode;
    const relatedView = this.related.length
      ? resolveView(processes, this.related.at(-1))
      : null;
    return (
      <div class={{ "deck-shell": true, workbench: this.workbench }}>
        <div
          class="deck-interface"
          ref={(el) => {
            if (el)
              el.inert = Boolean(relatedView || this.overview || this.settings);
          }}
        >
          <header class="deck-top">
            <a href="../">PKU / AI × HISTORY</a>
            <span>
              {this.workbench
                ? "德教研究工作台"
                : "第四周 · 文献与个人知识系统"}
            </span>
            <button onClick={() => (this.overview = !this.overview)}>
              {this.workbench ? "全部研究环节" : "课程地图"}
            </button>
            <button onClick={() => this.openImport()}>导入材料</button>
            <button onClick={() => this.openRelated("P35")}>保存与恢复</button>
            <button onClick={() => (this.settings = true)}>
              模型与导入设置
            </button>
            <a
              href={`?${this.workbench ? "" : "workbench=1"}${viewHash(view)}`}
              target="_blank"
            >
              {this.workbench ? "打开课件" : "独立知识工作台"} ↗
            </a>
            <button onClick={() => this.presenter()}>教师视图 ↗</button>
          </header>
          <p class="project-strip">
            {state.project.title} · {state.project.question || "研究问题待填写"}{" "}
            <span>{state.status}</span>
          </p>
          {this.savedProjects.length > 1 && (
            <label class="project-picker">
              已保存项目{" "}
              <select
                aria-label="切换已保存项目"
                onChange={(e: any) => switchProject(e.target.value)}
              >
                {this.savedProjects.map((x) => (
                  <option value={x.id} selected={x.id === state.project.id}>
                    {x.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {this.error && (
            <div class="notice" role="status">
              {this.error}
              <button onClick={() => (this.error = "")}>收起</button>
            </div>
          )}
          {this.workbench && (
            <nav class="workspace-tabs" aria-label="研究环节">
              {processes.map((x) => (
                <button
                  aria-current={x.id === p.id ? "page" : undefined}
                  onClick={() => this.go(x.id)}
                >
                  {x.title}
                </button>
              ))}
            </nav>
          )}
          <main>
            <deck-slide
              slide-id={p.id}
              header-title={p.title}
              kicker={`${this.current + 1} / ${processes.length} · 教案 ${p.section}`}
              notes={viewData(view, topics).notes}
            >
              <nav class="process-tabs" aria-label="本环节功能">
                {p.modes.map((x) => (
                  <button
                    aria-pressed={x.id === mode.id ? "true" : "false"}
                    onClick={() => this.go(`${p.id}/${x.id}`)}
                  >
                    {x.label}
                  </button>
                ))}
              </nav>
              <process-workspace topic-id={mode.id} />
              <div slot="footer">
                {p.purpose} ·
                页内功能切换不改变本环节；原件和相关工具可临时回看。
              </div>
            </deck-slide>
          </main>
          <nav class="deck-nav">
            <button
              disabled={this.current === 0}
              onClick={() => this.go(this.current - 1)}
            >
              ← 上一环节
            </button>
            <span>
              {this.current + 1} / {processes.length} · {mode.label}
            </span>
            <button
              disabled={this.current === processes.length - 1}
              onClick={() => this.go(this.current + 1)}
            >
              下一环节 →
            </button>
          </nav>
        </div>
        {relatedView && (
          <div
            class="overlay related-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="临时回看与操作"
          >
            <div class="dialog related-dialog">
              <header class="related-header">
                <div>
                  <p>当前环节保持在“{p.title}”</p>
                  <h2>临时操作 · {relatedView.mode.label}</h2>
                </div>
                <button onClick={() => this.closeRelated()}>
                  {this.related.length > 1
                    ? "返回上一临时面板"
                    : `返回${p.title}`}{" "}
                  ×
                </button>
              </header>
              <nav class="process-tabs" aria-label="临时面板功能">
                {relatedView.process.modes.map((x) => (
                  <button
                    aria-pressed={
                      x.id === relatedView.mode.id ? "true" : "false"
                    }
                    onClick={() => {
                      this.related = [...this.related.slice(0, -1), x.id];
                      this.sync();
                    }}
                  >
                    {x.label}
                  </button>
                ))}
              </nav>
              <process-workspace topic-id={relatedView.mode.id} />
            </div>
          </div>
        )}
        {this.overview && (
          <div
            class="overlay"
            role="dialog"
            aria-modal="true"
            aria-label="课程地图"
          >
            <div class="dialog">
              <button onClick={() => (this.overview = false)}>关闭</button>
              <h2>从一个处理环节进入</h2>
              <div class="map-grid">
                {processes.map((x, i) => (
                  <button onClick={() => this.go(x.id)}>
                    <b>
                      {i + 1} · {x.title}
                    </b>
                    <small>{x.modes.map((m) => m.label).join(" / ")}</small>
                    <small>教案 {x.section}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {this.settings && (
          <div
            class="overlay"
            role="dialog"
            aria-modal="true"
            aria-label="模型与导入设置"
          >
            <div class="dialog settings">
              <button onClick={() => (this.settings = false)}>关闭</button>
              <h2>模型接入与导入器</h2>
              {field(
                "OpenAI 兼容接口地址",
                model.endpoint,
                (v) => (model.endpoint = v),
              )}
              {field("模型名", model.name, (v) => (model.name = v))}
              <label class="field">
                <span>API key（仅本窗口内存，关闭窗口后清除）</span>
                <input
                  type="password"
                  value={model.key}
                  onInput={(e: any) => (model.key = e.target.value)}
                />
              </label>
              {field(
                "通用导入器地址",
                this.importerUrl,
                (v) => (this.importerUrl = v),
              )}
              <p>
                整理、笔记与备份不需要模型。点击阅读助手的请求按钮后，才发送明确选中的正文范围。
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
}
