import { Component, h, State, Listen } from "@stencil/core";
import {
  init,
  state,
  update,
  install,
  loadTeacher,
  emptyProject,
  listProjects,
  switchProject,
} from "../../lib/project";
import { model } from "../../lib/model";
import { flow, field, card, recent } from "../../lib/ui";
import pages from "../../assets/data/pages.json";
const CHANNEL = "pku-aihis-week04-20261005";
@Component({ tag: "course-app", shadow: false })
export class CourseApp {
  @State() ready = false;
  @State() error = "";
  @State() current = 0;
  @State() overview = false;
  @State() settings = false;
  @State() revision = 0;
  @State() importerUrl = "http://127.0.0.1:5174/";
  @State() workbench = false;
  @State() savedProjects: any[] = [];
  private channel: BroadcastChannel;
  private importer: Window;
  private importerOrigin = "";
  async componentWillLoad() {
    if (new URLSearchParams(location.search).has("presenter")) return;
    try {
      await init();
      this.ready = true;
      this.savedProjects = (await listProjects(state.db)) as any[];
      this.workbench = new URLSearchParams(location.search).has("workbench");
      this.go(location.hash.slice(1) || "P01");
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
    this.go(e.detail);
  }
  @Listen("hashchange", { target: "window" }) hash() {
    this.go(location.hash.slice(1));
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
        this.error = "材料已追加到共同项目；可在材料库、队列和笔记页继续。";
        this.importer.postMessage(
          { type: "PKU_IMPORT_ACCEPTED" },
          this.importerOrigin,
        );
      } catch (error) {
        this.error = `导入失败：${error.message}`;
      }
  }
  private go(id: string | number) {
    // 已撤下的入口接续到下一页，其余稳定编号保持原有对应。
    if (id === "P39") id = "P40";
    const i = typeof id === "number" ? id : pages.findIndex((p) => p.id === id);
    if (i < 0 || i >= pages.length) return;
    this.current = i;
    this.overview = false;
    history.replaceState(null, "", "#" + pages[i].id);
    this.sync();
  }
  private sync() {
    this.channel?.postMessage({
      type: "STATE",
      index: this.current,
      ...pages[this.current],
      next: pages[this.current + 1],
      total: pages.length,
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
    } catch (e) {
      this.error = "导入器地址无效。";
    }
  }
  @Listen("keydown", { target: "window" }) key(e: KeyboardEvent) {
    if (
      e.isComposing ||
      this.settings ||
      document.querySelector(".reader.expanded") ||
      e
        .composedPath()
        .some((x: any) =>
          x.matches?.(
            "input,textarea,select,button,a[href],summary,[contenteditable=true]",
          ),
        )
    )
      return;
    if (e.key === "Escape") {
      this.overview = !this.overview;
      return;
    }
    if (this.overview) return;
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
    if (e.key === "End") this.go(pages.length - 1);
    if (e.key.toLowerCase() === "p") this.presenter();
  }
  private presenter() {
    const u = new URL(location.href);
    u.searchParams.delete("workbench");
    u.searchParams.set("presenter", "1");
    window.open(u.href, "week04-presenter", "width=1150,height=800");
    setTimeout(() => this.sync(), 800);
  }
  private opening() {
    const id = pages[this.current].id;
    return flow(
      id === "P01"
        ? "一次阅读之后，怎样留下可以继续的研究记录？"
        : "从同一问题出发，观察材料、阅读、笔记和论证之间的接续。",
      [
        {
          title: "研究问题",
          body: (
            <div>
              {field("项目题名", state.project.title, (v) =>
                update(
                  "修改项目题名",
                  state.project.id,
                  () => (state.project.title = v),
                ),
              )}
              {field(
                "本次研究问题",
                state.project.question,
                (v) =>
                  update(
                    "登记研究问题",
                    state.project.id,
                    () => (state.project.question = v),
                  ),
                true,
              )}
              <button
                onClick={async () => {
                  try {
                    await loadTeacher();
                    this.error = "";
                  } catch (e) {
                    this.error = e.message;
                  }
                }}
              >
                载入教师本机“德教”示例
              </button>
              <button onClick={() => install(emptyProject())}>
                新建空白项目
              </button>
            </div>
          ),
        },
        {
          title: "材料怎样进入",
          body: (
            <div>
              {card(
                "材料库",
                <p>
                  当前 {state.project.sources.length} 项材料，
                  {state.project.segments.length} 个处理片段。
                </p>,
              )}
              <button onClick={() => this.go("P03")}>登记材料身份</button>
              <button onClick={() => this.openImport()}>
                导入自己的 PDF／Word／图像
              </button>
            </div>
          ),
        },
        {
          title: "阅读留下什么",
          body: (
            <div>
              {card(
                "阅读任务",
                <p>
                  {state.project.tasks.length}{" "}
                  项任务；已读范围、理解与下一步各自保存。
                </p>,
              )}
              <button onClick={() => this.go("P10")}>进入阅读队列</button>
              <button onClick={() => this.go("P20")}>进入来源笔记</button>
            </div>
          ),
        },
        {
          title: "问题如何接续",
          body: (
            <div>
              {card(
                "当前研究产物",
                <p>
                  {state.project.notes.length} 条笔记 ·{" "}
                  {state.project.claims.length} 个问题索引。
                </p>,
              )}
              <button onClick={() => this.go("P26")}>进入问题与证据</button>
              {recent()}
            </div>
          ),
        },
      ],
      "教师示例与自己的空白项目都使用同一套记录；重要改动前先导出备份。",
    );
  }
  render() {
    if (new URLSearchParams(location.search).has("presenter"))
      return <deck-presenter />;
    if (!this.ready)
      return <p role="status">{this.error || "正在打开课程项目…"}</p>;
    const p = pages[this.current],
      id = p.id;
    let body: any;
    if (["P01", "P02"].includes(id)) body = this.opening();
    else if (Number(id.slice(1)) <= 13) body = <material-flow page-id={id} />;
    else if (Number(id.slice(1)) <= 19) body = <reading-flow page-id={id} />;
    else if (Number(id.slice(1)) <= 28 || ["P36", "P37", "P40"].includes(id))
      body = <note-flow page-id={id} />;
    else body = <system-flow page-id={id} />;
    return (
      <div class={{ "deck-shell": true, workbench: this.workbench }}>
        <header class="deck-top">
          <a href="../">PKU / AI × HISTORY</a>
          <span>
            {this.workbench ? "德教研究工作台" : "第四周 · 文献与个人知识系统"}
          </span>
          <button onClick={() => (this.overview = !this.overview)}>
            {this.workbench ? "全部研究入口" : "课程地图"}
          </button>
          <button onClick={() => this.openImport()}>导入材料</button>
          <button onClick={() => this.go("P35")}>保存与恢复</button>
          <button onClick={() => (this.settings = true)}>模型与导入设置</button>
          <a
            href={`?${this.workbench ? "" : "workbench=1"}#${id}`}
            target="_blank"
          >
            {this.workbench ? "打开课件" : "独立知识工作台"} ↗
          </a>
          <button onClick={() => this.presenter()}>教师视图 ↗</button>
        </header>
        {this.workbench && (
          <nav class="workspace-tabs">
            {[
              ["材料库", "P03"],
              ["阅读队列", "P10"],
              ["阅读助手", "P16"],
              ["个人笔记", "P20"],
              ["问题索引", "P26"],
              ["证据矩阵", "P28"],
              ["校订与保存", "P33"],
            ].map(([label, page]) => (
              <button onClick={() => this.go(page)}>{label}</button>
            ))}
          </nav>
        )}
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
        <main>
          <deck-slide
            slide-id={p.id}
            header-title={p.title}
            kicker={`${p.id} / ${p.section} · ${p.track}`}
            notes={p.notes}
          >
            {body}
            <div slot="footer">{p.action}</div>
          </deck-slide>
        </main>
        <nav class="deck-nav">
          <button
            disabled={this.current === 0}
            onClick={() => this.go(this.current - 1)}
          >
            ← 上一页
          </button>
          <span>
            {p.id} · {this.current + 1} / {pages.length}
          </span>
          <button
            disabled={this.current === pages.length - 1}
            onClick={() => this.go(this.current + 1)}
          >
            下一页 →
          </button>
        </nav>
        {this.overview && (
          <div class="overlay" role="dialog" aria-label="课程地图">
            <div class="dialog">
              <button onClick={() => (this.overview = false)}>关闭</button>
              <h2>从研究动作进入</h2>
              <div class="map-grid">
                {pages.map((x) => (
                  <button onClick={() => this.go(x.id)}>
                    <b>
                      {x.id} · {x.title}
                    </b>
                    <small>
                      {x.section} · {x.track}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {this.settings && (
          <div class="overlay" role="dialog" aria-label="模型与导入设置">
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
              <p>导入器属于独立分支；本机预览启动后可从此打开。</p>
            </div>
          </div>
        )}
      </div>
    );
  }
}
