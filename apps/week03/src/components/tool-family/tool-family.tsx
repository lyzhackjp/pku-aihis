import { Component, Fragment, h, Prop, State } from "@stencil/core";
import {
  bridgeEndpoint,
  getModelConfig,
  openModelSettings,
} from "../../lib/model-client";
import { sourceLocation, sourceWebURL } from "../../lib/provenance";

const families = {
  D14: {
    name: "知识库产品",
    ids: ["D14"],
    question: "想把自己的材料接入问答，从哪里开始？",
    idea: "把导入材料、检索片段和生成回答放在一个工作区。",
    route: ["导入资料", "检索片段", "回答与引用"],
    observe: "看回答有没有依据，再打开它用到的片段；回答“材料不足”也值得观察。",
    task: "课后导入第二类资料，提出同一个问题，比较候选和回答是否改变，并回查一条引用。",
    bridge: "上一页已拆开RAG各环节；这里看它们如何组成一个可使用的产品。",
  },
  D15: {
    name: "搜索引擎",
    ids: ["D15", "D16", "D17"],
    question: "资料很多时，怎样先找出值得读的几段？",
    idea: "组织检索索引，把一个查询变成带出处的候选名单。",
    route: ["组织索引", "提交查询", "阅读候选"],
    observe:
      "保持“宗教”这个查询，切换工具看前三条候选；比较命中的材料，不横比不同引擎的原始分数。",
    task: "课后任选一个工具，加入另一类材料，换一个关键词；记录一条有用命中和一次漏检。",
    bridge:
      "本课举例：Elasticsearch的关键词检索、OpenSearch的神经稀疏检索、Tantivy的应用内全文检索。",
  },
  D18: {
    name: "向量数据库",
    ids: ["D18", "D19", "D20"],
    question: "表达方式不同，还能找到意思接近的段落吗？",
    idea: "保存兼容向量及出处，按向量关系找候选，再回到原文。",
    route: ["向量＋出处入库", "查询向量近邻", "回读原文"],
    observe:
      "看不同工具返回的相近段落；注意“距离越小”和“相似度越大”的方向差别。",
    task: "课后任选一个工具，使用同一模型编码两类材料；比较词面命中与向量近邻，再检查一条误命中。",
    bridge:
      "向量由嵌入模型产生。数据库负责保存和查找；相似片段不自动成为答案或史学证据。",
  },
};
const roles = {
  D14: "AnythingLLM把工作区、检索和模型问答组织起来。",
  D15: "本例用关键词与BM25找候选。",
  D16: "本例使用D05真实模型输出的神经稀疏权重。",
  D17: "可以嵌入自己程序的全文检索库。",
  D18: "本例返回余弦距离，越小越近。",
  D19: "本例返回余弦相似度，越大越近。",
  D20: "本例虽然字段名叫distance，实际返回余弦相似度，越大越近。",
};
@Component({ tag: "tool-family", styleUrl: "tool-family.css", shadow: false })
export class ToolFamily {
  @Prop() demoId: string;
  @State() tools: any = null;
  @State() selected = "";
  @State() show = false;
  @State() output: any = null;
  @State() selectedRow = -1;
  @State() busy = false;
  @State() error = "";
  @State() query = "";
  private docs: any[] = [];
  private queryOptions: string[] = [];
  private controller: AbortController;
  async componentWillLoad() {
    try {
      const [tools, corpus] = await Promise.all([
        fetch("assets/data/tools.json"),
        fetch("assets/data/corpus.json"),
      ]);
      if (!tools.ok || !corpus.ok) throw Error("示例数据载入失败");
      this.tools = await tools.json();
      const data = await corpus.json();
      this.docs = data.records;
      this.queryOptions = data.queries.map((q) => q.text);
      this.choose(families[this.demoId].ids[0]);
    } catch (e) {
      this.error = String(e);
    }
  }
  disconnectedCallback() {
    this.controller?.abort();
  }
  private choose(id: string) {
    this.selected = id;
    this.output = null;
    this.selectedRow = -1;
    this.error = "";
    this.query =
      this.tools[id].default_query || this.tools[id].result?.query || "宗教";
  }
  private rows(result: any) {
    return (result?.results || result?.sources || []).map((r: any) => {
      const id = r.id || r.text?.match(/片段编号:\s*([^\s]+)/)?.[1];
      const d = this.docs.find((d) => d.id === id);
      return {
        id,
        title: d?.title || r.title || id || "来源片段",
        text: d?.text || r.text || "",
        locator: d
          ? sourceLocation(d)
          : r.pdf_page != null
            ? `PDF 第 ${r.pdf_page} 页`
            : "定位见原始记录",
        score: r.score,
        status: d?.status,
        image: d?.image,
        sourceURL: sourceWebURL(d || r),
      };
    });
  }
  private async run() {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    this.output = null;
    this.show = false;
    this.selectedRow = -1;
    this.controller = new AbortController();
    const timer = setTimeout(() => this.controller.abort(), 180000);
    try {
      const r = await fetch(
        bridgeEndpoint(
          getModelConfig().bridge,
          "/api/tool/" + this.tools[this.selected].slug,
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: this.query }),
          signal: this.controller.signal,
        },
      );
      const data = await r.json();
      if (!r.ok || data.error)
        throw Error(data.error || `服务返回 ${r.status}`);
      this.output = data;
      this.show = true;
    } catch (e) {
      this.error = `本次重跑未完成：${String(e)}。请检查课堂服务，或点击“查看保存示例”。`;
    } finally {
      clearTimeout(timer);
      this.busy = false;
    }
  }
  render() {
    if (!this.tools)
      return <p role="status">{this.error || "载入课堂示例…"}</p>;
    const f = families[this.demoId],
      t = this.tools[this.selected],
      result = this.output || t.result,
      rows = this.rows(result),
      chosen = rows[this.selectedRow];
    return (
      <div class="family-shell">
        <p class="family-question">{f.question}</p>
        <div class="family-columns">
          <section class="family-col">
            <h2>
              <small>01</small> 这一类解决什么
            </h2>
            <p class="family-idea">{f.idea}</p>
            <div class="family-route" aria-label="处理顺序">
              {f.route.map((step, i) => (
                <span>
                  <b>{step}</b>
                  {i < 2 && <i aria-hidden="true"> → </i>}
                </span>
              ))}
            </div>
            <p>{f.bridge}</p>
            <div class="family-observe">
              <b>课堂只观察一件事</b>
              <p>{f.observe}</p>
            </div>
            <p class="family-note">
              按本课用途归类，三类可以互相配合；这不是互斥的软件能力清单。
            </p>
          </section>
          <section class="family-col family-example">
            <h2>
              <small>02</small> 看一次实际例子
            </h2>
            <label>
              代表工具{" "}
              <select
                aria-label="代表工具"
                disabled={this.busy}
                onChange={(e: any) => this.choose(e.target.value)}
              >
                {f.ids.map((id) => (
                  <option value={id} selected={this.selected === id}>
                    {this.tools[id].name}
                  </option>
                ))}
              </select>
            </label>
            <p class="family-note">{roles[this.selected]}</p>
            <p class="family-query">
              示例问题：{t.result?.query || t.default_query || "宗教"}
            </p>
            <button
              class="family-primary"
              disabled={this.busy}
              onClick={() => {
                const showSaved = !!this.output || !this.show;
                this.output = null;
                this.show = showSaved;
                this.selectedRow = -1;
                this.error = "";
              }}
            >
              {this.show && !this.output ? "收起保存示例" : "查看保存示例"}
            </button>
            {this.busy && <p role="status">正在调用本机应用…</p>}
            {this.error && (
              <p class="status-error" role="alert">
                {this.error}
              </p>
            )}
            {this.show && (
              <div class="family-result">
                <p class="mode">
                  {this.output ? "本次实际返回" : "保存的本机实跑结果"} ·{" "}
                  {t.name} {result.version || ""}
                </p>
                <p class="family-note">
                  实际问题：{result.query || "见记录"}
                  {result.run_at ? ` · 记录时间 ${result.run_at}` : ""}
                </p>
                {result.model && (
                  <p class="family-note">生成模型：{result.model}</p>
                )}
                {(result.embedding_model || result.embedding?.model) && (
                  <p class="family-note">
                    嵌入模型：{result.embedding_model || result.embedding.model}
                  </p>
                )}
                {result.answer && (
                  <div class="family-answer">
                    <h3>模型回答</h3>
                    <p>{result.answer}</p>
                  </div>
                )}

                {rows.length > 0 && (
                  <>
                    <p class="family-note">
                      {result.answer ? "回答使用的片段" : "候选片段"}：展示前{" "}
                      {Math.min(3, rows.length)} 条，点击读原文。
                    </p>
                    <div class="family-hits">
                      {rows.slice(0, 3).map((r, i) => (
                        <button
                          class="family-hit"
                          aria-pressed={this.selectedRow === i}
                          onClick={() => (this.selectedRow = i)}
                        >
                          <b>
                            {i + 1}. {r.title}
                          </b>
                          <span>
                            {r.id || "来源见记录"} · {r.locator}
                          </span>
                          {!result.answer && Number.isFinite(r.score) && (
                            <span>分值 {r.score.toFixed(4)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {chosen && (
                  <article class="family-source">
                    <b>{chosen.title}</b>
                    <p>
                      {chosen.id} · {chosen.locator}
                    </p>
                    {chosen.image && (
                      <a href={chosen.image} target="_blank" rel="noreferrer">
                        查看原页图像 ↗
                      </a>
                    )}
                    {chosen.sourceURL && (
                      <a
                        href={chosen.sourceURL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        来源页面 ↗
                      </a>
                    )}
                    {chosen.status && (
                      <p class="family-note">{chosen.status}</p>
                    )}
                    <p class="paper-text">{chosen.text}</p>
                  </article>
                )}
                {!result.answer && !rows.length && (
                  <p>本次记录没有可展示的回答或候选；查看完整记录确认原因。</p>
                )}
                <p class="family-note">
                  {this.output
                    ? "本次返回来自所连接的应用库。"
                    : "保存示例来自应用原有的27条课堂库。"}
                  在顶部追加语料，不会自动更新本机应用库。新语料检索请用D07—D13。
                </p>
                <details>
                  <summary>版本与完整记录</summary>
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            )}
          </section>
          <section class="family-col">
            <h2>
              <small>03</small> 课后怎样探索
            </h2>
            <p class="family-task">{f.task}</p>
            <div class="family-resources">
              {f.ids.map((id) => (
                <div>
                  <b>{this.tools[id].name}</b>
                  <a
                    href={`assets/guides/${this.tools[id].slug}.md`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    安装与操作指南 ↗
                  </a>
                  <a href={this.tools[id].url} target="_blank" rel="noreferrer">
                    原代码库 ↗
                  </a>
                </div>
              ))}
            </div>
            <details class="family-local">
              <summary>已安装：在本机重跑</summary>
              <p class="family-note">
                先启动完整课堂。这里使用该应用已配置的模型和资料库；模型设置中的本机地址应指向可用课堂服务。
              </p>
              {this.demoId === "D18" ? (
                <label>
                  本机示例问题
                  <select
                    aria-label="本机应用问题"
                    disabled={this.busy}
                    onChange={(e: any) => (this.query = e.target.value)}
                  >
                    {this.queryOptions.map((q) => (
                      <option value={q} selected={this.query === q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  <span class="family-note">
                    本机轻量示例使用已编码的问题；新的问题可先在D08运行嵌入与检索。
                  </span>
                </label>
              ) : (
                <label>
                  检索问题
                  <textarea
                    aria-label="本机应用问题"
                    value={this.query}
                    disabled={this.busy}
                    onInput={(e: any) => (this.query = e.target.value)}
                  />
                </label>
              )}
              <div class="lab-toolbar">
                <button disabled={this.busy} onClick={() => this.run()}>
                  本地重跑
                </button>
                <button onClick={() => openModelSettings()}>连接设置</button>
              </div>
              {t.application_url && (
                <a href={t.application_url} target="_blank" rel="noreferrer">
                  打开本机应用 ↗
                </a>
              )}
            </details>
            {t.screenshot && (
              <details>
                <summary>查看实际应用截图</summary>
                <img
                  class="family-screenshot"
                  src={t.screenshot}
                  alt="AnythingLLM本机问答实跑截图"
                />
                {t.review_notes?.map((note) => (
                  <p class="family-note">{note}</p>
                ))}
              </details>
            )}
            <p class="family-note">
              安装参数、接口和库内实现留在指南中。课堂先抓住用途，再用原文判断检索与回答是否有帮助。
            </p>
          </section>
        </div>
      </div>
    );
  }
}
