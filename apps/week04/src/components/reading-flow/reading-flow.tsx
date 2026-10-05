import { Component, h, Prop, State, Listen } from "@stencil/core";
import {
  state,
  source,
  segment,
  task,
  note,
  update,
  uid,
  now,
  addNote,
} from "../../lib/project";
import { readWithModel, model } from "../../lib/model";
import {
  flow,
  field,
  select,
  check,
  chooser,
  segmentChooser,
  evidence,
  card,
  sourceTrail,
  recent,
  location,
} from "../../lib/ui";
@Component({ tag: "reading-flow", shadow: false })
export class ReadingFlow {
  @Prop() pageId = "P14";
  @State() revision = 0;
  @State() type = "抽取";
  @State() chosen: string[] = null;
  @State() answer = "";
  @State() message = "";
  @State() busy = false;
  @State() hidden = false;
  @State() lastSource = "";
  private abort: AbortController;
  @Listen("project-change", { target: "window" }) changed() {
    this.revision++;
    if (this.lastSource !== state.sourceId) {
      this.chosen = null;
      this.answer = "";
      this.lastSource = state.sourceId;
    }
  }
  disconnectedCallback() {
    this.abort?.abort();
  }
  private inputs() {
    const candidates = state.project.segments.filter(
      (x: any) => x.sourceId === state.sourceId && !x.derived,
    );
    return this.chosen !== null
      ? candidates.filter((x: any) => this.chosen.includes(x.id))
      : candidates.slice(0, 1);
  }
  private async run() {
    this.busy = true;
    this.message = "正在请求所配置的模型；所选正文将发送到该接口。";
    this.abort = new AbortController();
    const snapshot = this.inputs().map((x: any) => ({
      id: x.id,
      sourceId: x.sourceId,
      revision: x.revision || 1,
      text: x.text,
      location: location(x),
    }));
    const runSourceId = state.sourceId,
      runProjectId = state.project.id,
      runType = this.type,
      runModel = model.name,
      runEndpoint = model.endpoint;
    try {
      if (!snapshot.length) throw Error("当前没有可发送的正文。");
      const input = snapshot
        .map((x: any) => `[${x.id}] ${x.location}\n${x.text}`)
        .join("\n\n");
      this.answer = await readWithModel(input, runType, this.abort.signal);
      if (state.project.id !== runProjectId)
        throw Error("项目已切换，本轮结果未写入另一个项目。");
      const n = {
        id: uid("note"),
        sourceId: runSourceId,
        title: `${runType}：模型候选`,
        kind: "模型候选",
        body: this.answer,
        generatedText: this.answer,
        quote: "",
        decision: "待核",
        reason: "",
        inputSnapshot: snapshot,
        model: runModel,
        endpoint: runEndpoint,
        time: now(),
        stale: snapshot.some((r) => {
          const current = state.project.segments.find((x) => x.id === r.id);
          return !current || (current.revision || 1) !== r.revision;
        }),
      };
      await update("保存本轮模型阅读候选", n.id, () => {
        state.project.notes.push(n);
        if (state.sourceId === runSourceId) state.noteId = n.id;
      });
      this.message = "本轮实时生成已保存为待核候选。";
    } catch (e) {
      this.message =
        e.name === "AbortError"
          ? "本轮请求已取消，未保存结果。"
          : `请求失败：${e.message}`;
    } finally {
      this.busy = false;
    }
  }
  private editTask(key: string, value: string) {
    const t = task();
    if (t) update(`更新阅读记录：${key}`, t.id, () => (t[key] = value));
  }
  render() {
    const s = source(),
      seg = segment(),
      t = task(),
      n = note(),
      id = this.pageId,
      inputs = this.inputs();
    let question = "本次阅读要完成什么任务？",
      first: any = (
        <div>
          {chooser()}
          {segmentChooser()}
          {evidence()}
        </div>
      ),
      action: any,
      result: any,
      last: any = sourceTrail();
    const needs: Record<string, string> = {
      筛选: "题录／摘要可用于判断是否值得取得全文；不能据此概括全篇论证。",
      抽取: "所选原文；产物应保留原话、材料编号和定位。",
      释义: "原话与前后语境；产物是解释候选。",
      概括: "足以覆盖目标论证的正文范围；先说明仍未覆盖什么。",
      比较: "至少两处可比较依据；同词不同语境仍需判断。",
      验证: "待核判断、原文及反例范围；定位成功不等于论证成立。",
    };
    const controls = (
      <div>
        {select(
          "本轮阅读任务",
          this.type,
          Object.keys(needs),
          (v) => (this.type = v),
        )}
        <p>{needs[this.type]}</p>
        {state.project.segments
          .filter((x: any) => x.sourceId === state.sourceId && !x.derived)
          .map((x: any) =>
            check(
              `${location(x)} · ${x.id}`,
              inputs.some((a: any) => a.id === x.id),
              (v) => {
                const set = new Set(inputs.map((a: any) => a.id));
                if (v) set.add(x.id);
                else set.delete(x.id);
                this.chosen = [...set] as string[];
              },
            ),
          )}
        <button
          disabled={this.busy || !inputs.length}
          onClick={() => this.run()}
        >
          将所选范围交给模型
        </button>
        {this.busy && (
          <button onClick={() => this.abort?.abort()}>取消请求</button>
        )}
        <p role="status">{this.message}</p>
      </div>
    );
    const answer = (
      <div>
        <span class="badge">
          {n?.kind === "模型候选" ? "保存的模型候选" : "人工记录"}
        </span>
        {field(
          "本次产物（可人工填写）",
          this.answer || n?.body,
          (v) => (this.answer = v),
          true,
        )}
        <button
          onClick={() => {
            const a = addNote("人工阅读记录");
            update("保存人工阅读产物", a.id, () => (a.body = this.answer));
          }}
        >
          保存人工产物
        </button>
        <p>模型候选、人写笔记与原作者表述分别保存。</p>
      </div>
    );
    if (id === "P14") {
      action = controls;
      result = card(
        "需要的输入与允许的产物",
        <div>
          <p>{needs[this.type]}</p>
          <p>当前选择 {inputs.length} 个片段，不自动等于全篇。</p>
          {answer}
        </div>,
      );
    } else if (id === "P15") {
      question = "本轮真正送入模型的内容，覆盖了文件的哪一部分？";
      action = controls;
      result = (
        <div>
          <h3>实际输入预览</h3>
          {inputs.map((x: any) =>
            card(`[${x.id}] ${location(x)}`, <pre>{x.text}</pre>),
          )}
          <p>
            {inputs.reduce((n: number, x: any) => n + x.text.length, 0)}{" "}
            个字符；当前未自动截断。
          </p>
        </div>
      );
      last = (
        <div>
          {field(
            "本次尚未覆盖什么",
            t?.uncovered,
            (v) => this.editTask("uncovered", v),
            true,
          )}
          <p>附件总页数、已解析页数和本轮选页是三个不同范围。</p>
          {sourceTrail()}
        </div>
      );
    } else if (id === "P16") {
      question = "阅读助手给出的判断，可以回到哪段原文？";
      action = controls;
      result = answer;
      last = (
        <div>
          {sourceTrail()}
          {n?.inputSnapshot?.map((x: any) =>
            card(
              `本轮快照 · ${x.id}`,
              <div>
                <p>
                  {x.location} · 修订 {x.revision}
                </p>
                <pre>{x.text}</pre>
              </div>,
            ),
          )}
          <p>模型写出的引文仍需和左侧原文核对；没有匹配时保留待核。</p>
        </div>
      );
    } else if (id === "P17") {
      question = "核验后的结果，怎样进入自己的来源笔记？";
      action = (
        <div>
          {n?.kind === "模型候选" && (
            <button
              onClick={() => {
                const own = {
                  ...structuredClone(n),
                  id: uid("note"),
                  kind: "来源笔记",
                  title: "人工核验：" + n.title,
                  parentNoteId: n.id,
                  createdAt: now(),
                };
                update("从候选另建人工来源笔记", own.id, () => {
                  state.project.notes.push(own);
                  state.noteId = own.id;
                });
              }}
            >
              保留候选，另建人工来源笔记
            </button>
          )}
          {n ? (
            card(n.title, <p>{n.body}</p>)
          ) : (
            <button onClick={() => addNote()}>新建来源笔记</button>
          )}
          {select(
            "核验决定",
            n?.decision,
            ["待核", "采纳", "收窄", "纠错", "暂不能判断"],
            (v) => {
              if (n) update("登记核验决定", n.id, () => (n.decision = v));
            },
          )}
          {field(
            "核验理由与采用范围",
            n?.reason,
            (v) => {
              if (n) update("补充核验理由", n.id, () => (n.reason = v));
            },
            true,
          )}
        </div>
      );
      result = (
        <div>
          {field(
            "自己的释义",
            n?.body,
            (v) => {
              if (n) update("编辑来源笔记", n.id, () => (n.body = v));
            },
            true,
          )}
          {field(
            "原作者表述（保留出处）",
            n?.quote || seg?.text,
            (v) => {
              if (n) update("登记原话", n.id, () => (n.quote = v));
            },
            true,
          )}
          {field(
            "仍不成立／未覆盖的范围",
            n?.context,
            (v) => {
              if (n) update("补充笔记语境", n.id, () => (n.context = v));
            },
            true,
          )}
          <p>
            决定：{n?.decision || "待核"}；
            {n?.reason ? "已写理由" : "尚未写理由"}
          </p>
        </div>
      );
    } else if (id === "P18") {
      question = "暂时没有读完，可以留下怎样的接续入口？";
      action = (
        <div>
          {field(
            "本次已理解",
            t?.understanding,
            (v) => this.editTask("understanding", v),
            true,
          )}
          {field("待回读位置", t?.readRange, (v) =>
            this.editTask("readRange", v),
          )}
          {field(
            "当前阻碍／缺失材料",
            t?.blocker,
            (v) => this.editTask("blocker", v),
            true,
          )}
        </div>
      );
      result = (
        <div>
          {field("下一步", t?.next, (v) => this.editTask("next", v), true)}
          <button disabled={!t} onClick={() => this.editTask("status", "待核")}>
            暂停并进入待核队列
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate-page", { detail: "P11" }),
              )
            }
          >
            查看队列中的接续记录
          </button>
        </div>
      );
      last = (
        <div>
          {recent(t?.id)}
          {sourceTrail()}
        </div>
      );
    } else {
      question = "收起摘要以后，能否自己解释作者的问题、依据与限制？";
      first = (
        <div>
          {chooser()}
          <button onClick={() => (this.hidden = !this.hidden)}>
            {this.hidden ? "重新打开原文" : "收起原文，先自主重述"}
          </button>
          {!this.hidden && evidence()}
        </div>
      );
      action = (
        <div>
          {field(
            "阅读前的问题",
            t?.before,
            (v) => this.editTask("before", v),
            true,
          )}
          {field(
            "用自己的话重述",
            t?.understanding,
            (v) => this.editTask("understanding", v),
            true,
          )}
        </div>
      );
      result = (
        <div>
          {field(
            "仍解释不清的地方",
            t?.blocker,
            (v) => this.editTask("blocker", v),
            true,
          )}
          <button onClick={() => (this.hidden = false)}>
            打开原文，再检查重述
          </button>
          <p>这里保留重述和修改记录，不用模型相似度打理解分。</p>
        </div>
      );
      last = (
        <div>
          {recent(t?.id)}
          {sourceTrail()}
        </div>
      );
    }
    return flow(
      question,
      [
        { title: "材料与位置", body: first },
        { title: "确定本轮任务", body: action },
        { title: "形成阅读产物", body: result },
        { title: "核对与接续", body: last },
      ],
      "限定一个真实阅读范围；未读部分保持可见。",
    );
  }
}
