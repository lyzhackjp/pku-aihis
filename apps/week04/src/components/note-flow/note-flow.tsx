import { Component, h, Prop, State, Listen } from "@stencil/core";
import {
  state,
  source,
  segment,
  note,
  update,
  uid,
  now,
  addNote,
  backlinks,
  search,
  download,
  vaultBackup,
} from "../../lib/project";
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
@Component({ tag: "note-flow", shadow: false })
export class NoteFlow {
  @Prop() pageId = "P20";
  @State() revision = 0;
  @State() target = "";
  @State() linkType = "问题联系";
  @State() term = "徳教";
  @State() includeDerived = false;
  @State() claimId = "";
  @State() showGraph = false;
  @Listen("project-change", { target: "window" }) changed() {
    this.revision++;
  }
  private edit(key: string, value: any) {
    const n = note();
    if (n) update(`修改笔记：${key}`, n.id, () => (n[key] = value));
  }
  private newClaim() {
    const c = {
      id: uid("claim"),
      title: "待形成的研究主张",
      body: "",
      scope: "",
      evidence: [],
      counter: [],
      gaps: "",
      stale: false,
    };
    update("新建问题索引", c.id, () => {
      state.project.claims.push(c);
      this.claimId = c.id;
    });
  }
  private noteList() {
    return (
      <div>
        {state.project.notes.map((n: any) => (
          <button
            class={{ "material-row": true, selected: state.noteId === n.id }}
            onClick={() => {
              state.noteId = n.id;
              if (n.sourceId) state.sourceId = n.sourceId;
              if (n.segmentId) state.segmentId = n.segmentId;
              window.dispatchEvent(new CustomEvent("project-change"));
            }}
          >
            <b>{n.title}</b>
            <small>
              {n.kind} · {n.stale ? "依据已修改，待复核" : n.decision || "待核"}
            </small>
          </button>
        ))}
        <button onClick={() => addNote()}>新建来源笔记</button>
      </div>
    );
  }
  private editor() {
    const n = note();
    return n ? (
      <div>
        {field("笔记题名", n.title, (v) => this.edit("title", v))}
        {select(
          "内容职责",
          n.kind,
          [
            "摘录",
            "释义",
            "来源笔记",
            "问题笔记",
            "项目提纲",
            "模型候选",
            "教师研究草稿",
          ],
          (v) => this.edit("kind", v),
        )}
        {field(
          "个人笔记（Markdown 文字）",
          n.body,
          (v) => this.edit("body", v),
          true,
        )}
        {field(
          "语境与限定条件",
          n.context,
          (v) => this.edit("context", v),
          true,
        )}
        <p>Markdown 作为文字保存；不会执行其中的 HTML。</p>
      </div>
    ) : (
      <button onClick={() => addNote()}>先建立一条笔记</button>
    );
  }
  private claimEditor() {
    const c =
      state.project.claims.find((x: any) => x.id === this.claimId) ||
      state.project.claims[0];
    return c ? (
      <div>
        {select(
          "当前研究问题",
          c.id,
          state.project.claims.map((x: any) => x.id),
          (v) => (this.claimId = v),
        )}
        {field(
          "问题／主张",
          c.title,
          (v) => update("修改研究主张", c.id, () => (c.title = v)),
          true,
        )}
        {field(
          "适用范围",
          c.scope,
          (v) => update("限定主张范围", c.id, () => (c.scope = v)),
          true,
        )}
        {field(
          "论证草稿",
          c.body,
          (v) => update("整理研究论证", c.id, () => (c.body = v)),
          true,
        )}
        {field(
          "仍缺什么依据",
          c.gaps,
          (v) => update("记录论证缺口", c.id, () => (c.gaps = v)),
          true,
        )}
        <button onClick={() => this.newClaim()}>另建一个问题</button>
      </div>
    ) : (
      <button onClick={() => this.newClaim()}>建立问题索引</button>
    );
  }
  private matrix() {
    return (
      <table class="flow-table">
        <thead>
          <tr>
            <th>实际片段／定位</th>
            {state.project.claims.map((c: any) => (
              <th>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.project.segments
            .filter((s: any) => !s.derived)
            .map((s: any) => (
              <tr>
                <td>
                  <button
                    onClick={() => {
                      state.sourceId = s.sourceId;
                      state.segmentId = s.id;
                      window.dispatchEvent(
                        new CustomEvent("navigate-page", { detail: "P05" }),
                      );
                    }}
                  >
                    {
                      state.project.sources.find(
                        (x: any) => x.id === s.sourceId,
                      )?.title
                    }
                    <br />
                    {location(s)}
                  </button>
                </td>
                {state.project.claims.map((c: any) => (
                  <td>
                    {c.evidence?.includes(s.id)
                      ? "支持"
                      : c.counter?.includes(s.id)
                        ? "反例／限制"
                        : "未登记关系"}
                    {c.stale && <small>依据变动，待复核</small>}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    );
  }
  render() {
    const id = this.pageId,
      n = note(),
      s = segment(),
      c =
        state.project.claims.find((x: any) => x.id === this.claimId) ||
        state.project.claims[0];
    let question = "笔记怎样保留出处，并进入自己的研究问题？",
      first: any = (
        <div>
          {chooser()}
          {segmentChooser()}
          {evidence()}
        </div>
      ),
      action: any = this.editor(),
      result: any = this.noteList(),
      last: any = sourceTrail();
    if (id === "P20") {
      first = this.noteList();
      last = (
        <div>
          {chooser()}
          {segmentChooser()}
          {evidence()}
          {sourceTrail()}
        </div>
      );
      question = "同一段文字，进入摘录、释义和问题笔记后各承担什么职责？";
      result = (
        <div>
          {n &&
            card(
              "原作者表述",
              <blockquote>{n.quote || s?.text || "未登记原话"}</blockquote>,
            )}
          {n && card("我的解释", <p>{n.body || "待写"}</p>)}
          <button onClick={() => addNote("问题笔记")}>
            从同一依据另建问题笔记
          </button>
        </div>
      );
    } else if (id === "P21") {
      question = "拆短之后，论述的条件和语境还能恢复吗？";
      first = this.noteList();
      result = (
        <div>
          <button
            disabled={!n}
            onClick={() => {
              if (!n) return;
              const child = {
                ...structuredClone(n),
                id: uid("note"),
                title: n.title + "（分笔记）",
                parentId: n.id,
                createdAt: now(),
              };
              update("拆分笔记，保留母记录", child.id, () => {
                state.project.notes.push(child);
                state.noteId = child.id;
              });
            }}
          >
            创建保留出处与语境的分笔记
          </button>
          {n?.parentId && (
            <p>
              母笔记：
              {state.project.notes.find((x: any) => x.id === n.parentId)?.title}
            </p>
          )}
          <p>编辑分笔记的论点；源笔记仍在库内。字数减少不作为质量评分。</p>
        </div>
      );
    } else if (["P22", "P26", "P40"].includes(id)) {
      question =
        id === "P40"
          ? "换一个研究问题，怎样调用过去的依据而不复写原笔记？"
          : "怎样把支持、反例和缺口汇入一个问题？";
      first = this.noteList();
      action = this.claimEditor();
      result = c ? (
        <div>
          <h3>选择实际依据</h3>
          {state.project.segments
            .filter((x: any) => !x.derived)
            .map((x: any) => (
              <article class="card">
                <p>
                  {
                    state.project.sources.find((a: any) => a.id === x.sourceId)
                      ?.title
                  }{" "}
                  · {location(x)}
                </p>
                {check("支持此主张", c.evidence.includes(x.id), (v) =>
                  update(
                    "登记支持关系",
                    c.id,
                    () =>
                      (c.evidence = v
                        ? [...new Set([...c.evidence, x.id])]
                        : c.evidence.filter((a: string) => a !== x.id)),
                  ),
                )}
                {check("反例或限定", c.counter.includes(x.id), (v) =>
                  update(
                    "登记反例关系",
                    c.id,
                    () =>
                      (c.counter = v
                        ? [...new Set([...c.counter, x.id])]
                        : c.counter.filter((a: string) => a !== x.id)),
                  ),
                )}
              </article>
            ))}
        </div>
      ) : (
        <p>先建立一个问题。</p>
      );
      last = (
        <div>
          {c &&
            card(
              "问题索引的当前状态",
              <ul>
                <li>{c.evidence.length} 个支持片段</li>
                <li>{c.counter.length} 个反例／限制</li>
                <li>{c.gaps || "尚未登记缺口"}</li>
                <li>
                  {c.stale
                    ? "依据发生变化，需要重新检查"
                    : "依据尚未在本项目内改动"}
                </li>
              </ul>,
            )}
          {sourceTrail()}
        </div>
      );
    } else if (id === "P23") {
      question = "模型摘要存回材料库后，回找会命中原文还是摘要？";
      first = this.noteList();
      action = (
        <div>
          {this.editor()}
          <button
            disabled={!n}
            onClick={() => {
              if (!n) return;
              const d = {
                id: uid("segment"),
                sourceId: n.sourceId || state.sourceId,
                text: n.body,
                derived: true,
                parentNoteId: n.id,
                inputSnapshot: structuredClone(n.inputSnapshot || []),
                method: n.kind === "模型候选" ? "模型派生" : "人工派生",
                verification: "待核",
                revision: 1,
                coverage: "依据限于母笔记保存的输入快照",
              };
              update("保存派生检索副本", d.id, () =>
                state.project.segments.push(d),
              );
            }}
          >
            另存为有母记录的派生副本
          </button>
        </div>
      );
      result = (
        <div>
          {field("回找词", this.term, (v) => (this.term = v))}
          {check(
            "包括派生文本（默认排除）",
            this.includeDerived,
            (v) => (this.includeDerived = v),
          )}
          {search(state.project, this.term, this.includeDerived).map((x: any) =>
            card(
              x.derived ? "派生副本" : "原文片段",
              <div>
                <p>{x.text}</p>
                <small>{x.parentNoteId || x.id}</small>
              </div>,
            ),
          )}
        </div>
      );
      last = (
        <div>
          <p>派生副本不会改写原文；其母记录和模型输入范围仍可回查。</p>
          {sourceTrail()}
        </div>
      );
    } else if (id === "P24" || id === "P25") {
      question =
        id === "P24"
          ? "原文引证、我的问题联系和版本关系分别说明什么？"
          : "一条内部链接，怎样生成可回查的反向链接？";
      first = this.noteList();
      action = (
        <div>
          {this.editor()}
          {select(
            "目标笔记",
            this.target ||
              state.project.notes.find((x: any) => x.id !== n?.id)?.id ||
              "",
            state.project.notes
              .filter((x: any) => x.id !== n?.id)
              .map((x: any) => x.id),
            (v) => (this.target = v),
          )}
          {select(
            "关系类型",
            this.linkType,
            ["问题联系", "引文关系", "版本关系"],
            (v) => (this.linkType = v),
          )}
          {field(
            "连线理由与出处",
            n?.linkReason,
            (v) => this.edit("linkReason", v),
            true,
          )}
          <button
            disabled={!n || state.project.notes.length < 2}
            onClick={() => {
              const to =
                this.target ||
                state.project.notes.find((x: any) => x.id !== n.id)?.id;
              if (to)
                update("建立有类型的内部链接", n.id, () =>
                  state.project.links.push({
                    id: uid("link"),
                    from: n.id,
                    to,
                    type: this.linkType,
                    reason: n.linkReason || "",
                  }),
                );
            }}
          >
            保存链接
          </button>
        </div>
      );
      result = (
        <div>
          <h3>进入当前笔记的反向链接</h3>
          {n &&
            backlinks(state.project, n.id).map((x: any) =>
              card(
                x.note?.title || x.from,
                <p>
                  {x.type} · {x.reason || "理由待补"}
                </p>,
              ),
            )}
          <h3>当前笔记指向</h3>
          {state.project.links
            .filter((x: any) => x.from === n?.id)
            .map((x: any) =>
              card(
                state.project.notes.find((a: any) => a.id === x.to)?.title ||
                  x.to,
                <p>
                  {x.type} · {x.reason || "理由待补"}
                </p>,
              ),
            )}
        </div>
      );
      last = (
        <div>
          {field("寻找未链接的文字提及", this.term, (v) => (this.term = v))}
          {state.project.notes
            .filter(
              (x: any) =>
                x.id !== n?.id &&
                x.body?.includes(this.term) &&
                !state.project.links.some(
                  (a: any) => a.from === x.id && a.to === n?.id,
                ),
            )
            .map((x: any) =>
              card(
                "文字提及，尚非链接",
                <p>
                  {x.title}: {x.body}
                </p>,
              ),
            )}
          <p>同词出现不自动证明引用或影响关系。</p>
        </div>
      );
    } else if (id === "P27") {
      question = "三篇文章是否提供了三份独立依据？";
      first = this.noteList();
      action = (
        <div>
          {chooser()}
          {field(
            "依赖的原始来源组（人工登记）",
            source()?.dependencyGroup,
            (v) =>
              update(
                "登记依据依赖组",
                state.sourceId,
                () => (source().dependencyGroup = v),
              ),
          )}
          {field(
            "转引层级与关系出处",
            source()?.dependencyReason,
            (v) =>
              update(
                "说明转引依据",
                state.sourceId,
                () => (source().dependencyReason = v),
              ),
            true,
          )}
        </div>
      );
      const groups: Record<string, any[]> = Object.create(null);
      for (const x of state.project.sources) {
        const k = x.dependencyGroup || `未核-${x.id}`;
        (groups[k] ||= []).push(x);
      }
      result = (
        <div>
          {Object.entries(groups).map(([key, rows]: [string, any[]]) =>
            card(
              key,
              <div>
                {rows.map((x) => (
                  <p>{x.title}</p>
                ))}
              </div>,
            ),
          )}
          <p>这些组由研究者核对登记；未登记的材料不自动视为独立支持。</p>
        </div>
      );
    } else if (id === "P28") {
      question = "证据矩阵能否变成持续维护的研究入口？";
      first = this.claimEditor();
      action = this.noteList();
      result = this.matrix();
      last = (
        <div>
          {sourceTrail()}
          {recent(c?.id)}
        </div>
      );
    } else if (id === "P36") {
      question = "同一条笔记，怎样成为属性表中的一行？";
      first = this.noteList();
      action = this.editor();
      result = (
        <div>
          <table class="flow-table">
            <thead>
              <tr>
                <th>题名</th>
                <th>职责</th>
                <th>核验</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {state.project.notes.map((x: any) => (
                <tr>
                  <td>{x.title}</td>
                  <td>{x.kind}</td>
                  <td>{x.decision}</td>
                  <td>
                    {
                      state.project.sources.find(
                        (a: any) => a.id === x.sourceId,
                      )?.title
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={async () =>
              download(await vaultBackup(), "个人知识系统_Obsidian笔记库.zip")
            }
          >
            导出可打开的 Markdown 笔记库 ZIP
          </button>
          <p>
            导出后介绍 Obsidian 属性、Bases 或 Dataview；网页没有运行 Obsidian
            本体。
          </p>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate-page", { detail: "P35" }),
              )
            }
          >
            在此恢复／追加，检验个人解释仍在
          </button>
        </div>
      );
      last = sourceTrail();
    } else {
      question = "重新取得外部题录时，自己的阅读理解能否保留？";
      first = this.noteList();
      action = this.editor();
      result = (
        <div>
          <p>
            个人笔记通过内部编号与题录相连。通用导入器追加时保留已有同编号记录，原件指纹另外核验。
          </p>
          <p>
            修改个人理解，然后在顶部“恢复／追加备份”中选择追加，检验内容仍在。
          </p>
        </div>
      );
      last = (
        <div>
          {recent(n?.id)}
          {sourceTrail()}
        </div>
      );
    }
    return flow(
      question,
      [
        { title: "依据／已有笔记", body: first },
        { title: "加工与联系", body: action },
        { title: "看见组织结果", body: result },
        { title: "保留出处与限制", body: last },
      ],
      "先形成一条可回查的笔记，再观察它怎样进入问题与链接。",
      id === "P28" || id === "P36" ? "table" : "workspace",
    );
  }
}
