import { Component, h, State } from "@stencil/core";
import { resolveView, viewData } from "../../lib/navigation.mjs";
@Component({
  tag: "deck-presenter",
  styleUrl: "deck-presenter.css",
  shadow: false,
})
export class DeckPresenter {
  @State() data: any = {};
  @State() pages: any[] = [];
  private topics: any[] = [];
  private remembered: Record<string, string> = {};
  @State() seconds = 0;
  @State() running = false;
  @State() notes = "";
  private channel: BroadcastChannel;
  private timer: any;
  async componentDidLoad() {
    this.pages = await (await fetch("assets/data/processes.json")).json();
    this.topics = await (await fetch("assets/data/pages.json")).json();
    const view =
      resolveView(this.pages, location.hash.slice(1) || "W01") ||
      resolveView(this.pages, "W01");
    this.update(viewData(view, this.topics));
    this.channel = new BroadcastChannel("pku-aihis-week04-20261005");
    this.channel.onmessage = (e) => {
      if (e.data.type === "STATE") this.update(e.data);
    };
    this.channel.postMessage({ type: "REQUEST" });
    this.timer = setInterval(() => {
      if (this.running) this.seconds++;
    }, 1000);
  }
  disconnectedCallback() {
    clearInterval(this.timer);
    this.channel?.close();
  }
  update(p: any) {
    this.data = p;
    this.remembered[p.id] = p.mode?.id;
    history.replaceState(null, "", "#" + (p.route || p.id));
    this.notes =
      sessionStorage.getItem("week04-notes-" + p.route) ||
      p.notes ||
      `目的：${p.title}\n操作：${p.action || ""}\n观察：${p.evidence || ""}`;
  }
  private navigate(target: string) {
    const view = resolveView(this.pages, target, this.remembered);
    if (!view) return;
    this.channel.postMessage({
      type: "NAV",
      id: `${view.process.id}/${view.mode.id}`,
    });
    this.update(viewData(view, this.topics));
  }
  move(delta: number) {
    const i = this.pages.findIndex((p) => p.id === this.data.id) + delta;
    if (i >= 0 && i < this.pages.length) this.navigate(this.pages[i].id);
  }
  render() {
    return (
      <main class="presenter">
        <header>
          <span>第四周 / 教师视图</span>
          <a
            target="week04-audience"
            href={"./#" + (this.data.route || "W01/P01")}
          >
            打开／恢复观众窗口 ↗
          </a>
        </header>
        <p class="eyebrow">
          当前环节 {this.data.id} · {this.data.mode?.label}
        </p>
        <h1>{this.data.title}</h1>
        <nav class="process-tabs" aria-label="教师页内功能">
          {this.data.modes?.map((m) => (
            <button
              aria-pressed={m.id === this.data.mode?.id ? "true" : "false"}
              onClick={() => this.navigate(`${this.data.id}/${m.id}`)}
            >
              {m.label}
            </button>
          ))}
        </nav>
        {this.data.related && (
          <p>观众正在临时回看：{this.data.related}；关闭后接续当前环节。</p>
        )}
        <div class="presenter-grid">
          <section>
            <h2>讲解备注</h2>
            <textarea
              aria-label="讲解备注"
              value={this.notes}
              onInput={(e: any) => {
                this.notes = e.target.value;
                sessionStorage.setItem(
                  "week04-notes-" + this.data.route,
                  this.notes,
                );
              }}
            />
            <p>备注仅存当前浏览器会话；不修改教案。</p>
          </section>
          <section>
            <p class="timer">
              {Math.floor(this.seconds / 60)
                .toString()
                .padStart(2, "0")}
              :{(this.seconds % 60).toString().padStart(2, "0")}
            </p>
            <button onClick={() => (this.running = !this.running)}>
              {this.running ? "暂停" : "开始"}计时
            </button>{" "}
            <button onClick={() => (this.seconds = 0)}>重置</button>
            <h2>下一环节</h2>
            <p>
              {this.data.next?.title ||
                this.pages[
                  this.pages.findIndex((p) => p.id === this.data.id) + 1
                ]?.title ||
                "课程结束"}
            </p>
            <button onClick={() => this.move(-1)}>← 上一环节</button>{" "}
            <button onClick={() => this.move(1)}>下一环节 →</button>
            <p>双屏状态通过当前课程专用频道同步。</p>
          </section>
        </div>
      </main>
    );
  }
}
