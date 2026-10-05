import { Component, h, Prop, State, Listen } from "@stencil/core";
import {
  state,
  source,
  segment,
  task,
  update,
  uid,
  now,
  queue,
  search,
  chooseSource,
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
  recent,
  materialList,
  sourceTrail,
  location,
} from "../../lib/ui";
@Component({ tag: "material-flow", shadow: false })
export class MaterialFlow {
  @Prop() pageId = "P03";
  @State() revision = 0;
  @State() filter = "全部";
  @State() term = "徳教";
  @State() relation = "暂不能判定";
  @State() other = "";
  @Listen("project-change", { target: "window" }) changed() {
    this.revision++;
  }
  private edit(key: string, value: any) {
    update(`修改材料：${key}`, state.sourceId, () => (source()[key] = value));
  }
  private newSource() {
    const s = {
      id: uid("source"),
      title: "新材料（待补题录）",
      author: "",
      date: "",
      kind: "二手文献",
      attachments: [],
      tags: [],
      collections: [],
      included: true,
      status: "待核",
      acquisition: "",
    };
    update("新增材料题录", s.id, () => {
      state.project.sources.push(s);
      state.sourceId = s.id;
    });
  }
  private newTask() {
    if (task()) return;
    const t = {
      id: uid("task"),
      sourceId: state.sourceId,
      status: "待读",
      priority: 2,
      type: "筛选",
      range: "",
      readRange: "",
      next: "核对题录并选择阅读范围",
      blocker: "",
      understanding: "",
      updatedAt: now(),
    };
    update("建立阅读任务", t.id, () => state.project.tasks.push(t));
  }
  render() {
    const s = source(),
      seg = segment(),
      t = task(),
      id = this.pageId;
    if (!s)
      return (
        <div>
          <p>项目还没有材料。</p>
          <button onClick={() => this.newSource()}>新建题录</button>
        </div>
      );
    let question = "怎样让取得的材料成为可以继续使用的记录？",
      action: any,
      result: any,
      first: any = chooser(),
      last: any = sourceTrail(),
      names = ["选择材料", "登记与处理", "观察结果", "回到依据"];
    if (id === "P03") {
      question = "取得题录之后，是否已经取得并读过正文？";
      first = (
        <div>
          {materialList()}
          <button onClick={() => this.newSource()}>手工新建题录</button>
          <p>从知网等数据库导出 RIS / BibTeX，再经通用导入器进入本库。</p>
        </div>
      );
      action = (
        <div>
          {field("题名", s.title, (v) => this.edit("title", v))}
          {field("责任者（未知留空）", s.author, (v) => this.edit("author", v))}
          {field("出版年代", s.date, (v) => this.edit("date", v))}
          {select(
            "材料角色",
            s.kind,
            ["史料", "二手文献", "教师研究草稿"],
            (v) => this.edit("kind", v),
          )}
          {field("取得渠道", s.acquisition, (v) => this.edit("acquisition", v))}
        </div>
      );
      result = (
        <div>
          {card(
            "三个状态",
            <ul>
              <li>题录：{s.title ? "已登记" : "缺失"}</li>
              <li>附件：{s.attachments.length} 份</li>
              <li>已读范围：{t?.readRange || "尚未登记"}</li>
            </ul>,
          )}
          <button onClick={() => this.newTask()}>加入阅读队列</button>
          {recent(s.id)}
        </div>
      );
    } else if (id === "P04") {
      question = "相同题名能证明这是同一版本吗？";
      first = (
        <div>
          {chooser()}
          <pre>
            {JSON.stringify(
              {
                title: s.title,
                author: s.author,
                date: s.date,
                edition: s.edition,
                files: s.attachments.map((a: any) => ({
                  name: a.name,
                  sha256: a.sha256,
                })),
              },
              null,
              2,
            )}
          </pre>
        </div>
      );
      action = (
        <div>
          {select(
            "比较对象",
            this.other ||
              state.project.sources.find((x: any) => x.id !== s.id)?.id ||
              "",
            state.project.sources
              .filter((x: any) => x.id !== s.id)
              .map((x: any) => x.id),
            (v) => (this.other = v),
          )}
          {select(
            "版本关系",
            this.relation,
            ["暂不能判定", "同作品不同版本", "同版本不同副本", "独立材料"],
            (v) => (this.relation = v),
          )}
          {field(
            "判断理由",
            s.versionReason,
            (v) => this.edit("versionReason", v),
            true,
          )}
          <button
            disabled={state.project.sources.length < 2}
            onClick={() =>
              update("登记版本关系", s.id, () =>
                state.project.links.push({
                  id: uid("link"),
                  from: s.id,
                  to:
                    this.other ||
                    state.project.sources.find((x: any) => x.id !== s.id)?.id,
                  type: "版本关系",
                  label: this.relation,
                  reason: s.versionReason || "",
                }),
              )
            }
          >
            保存关系，保留两条记录
          </button>
        </div>
      );
      const other = state.project.sources.find(
        (x: any) =>
          x.id ===
          (this.other ||
            state.project.sources.find((x: any) => x.id !== s.id)?.id),
      );
      result = (
        <div>
          {card(
            other?.title || "另选一份材料",
            <p>
              {other?.author || "责任者未载"} · {other?.date || "年代待核"} ·{" "}
              {other?.edition || "版本信息待补"}
            </p>,
          )}
          {state.project.links
            .filter((x: any) => x.type === "版本关系")
            .map((x: any) =>
              card(
                x.label,
                <p>
                  {x.from} → {x.to} · {x.reason || "尚缺判断理由"}
                </p>,
              ),
            )}
          <p>内容指纹相同只能说明文件字节相同。</p>
        </div>
      );
    } else if (id === "P05") {
      question = "从摘录返回的 PDF 页序，和书上页码是否一致？";
      first = (
        <div>
          {chooser()}
          {segmentChooser()}
          {evidence()}
        </div>
      );
      action = seg ? (
        <div>
          {field("PDF 物理页序", seg.pdfPage, (v) => {
            const n = Number(v);
            if (Number.isInteger(n) && n > 0)
              update("登记物理页序", seg.id, () => (seg.pdfPage = n));
          })}
          {field("印刷页码／档号", seg.printedPage, (v) =>
            update("登记印刷定位", seg.id, () => (seg.printedPage = v)),
          )}
          {field("Word 段落定位", seg.locator, (v) =>
            update("登记段落定位", seg.id, () => (seg.locator = v)),
          )}
        </div>
      ) : (
        <p>需要先取得并解析正文。</p>
      );
      result = (
        <div>
          <p>{location(seg)}</p>
          <source-reader
            attachment-id={seg?.attachmentId || s.attachments[0]?.id || ""}
            page={seg?.pdfPage || 1}
          />
        </div>
      );
    } else if (id === "P06") {
      question = "扫描日期应该填到出版年代吗？";
      action = (
        <div>
          {field("出版年代", s.date, (v) => this.edit("date", v))}
          {field("扫描／取得日期", s.acquiredAt, (v) =>
            this.edit("acquiredAt", v),
          )}
          {field("版本／刊载来源", s.edition, (v) => this.edit("edition", v))}
          {field("取得渠道", s.acquisition, (v) => this.edit("acquisition", v))}
          {select(
            "空值性质",
            s.missing,
            ["未知", "未载", "难辨", "不适用"],
            (v) => this.edit("missing", v),
          )}
        </div>
      );
      result = (
        <pre>
          {JSON.stringify(
            {
              publicationDate: s.date,
              acquiredAt: s.acquiredAt,
              edition: s.edition,
              acquisition: s.acquisition,
              missing: s.missing,
            },
            null,
            2,
          )}
        </pre>
      );
    } else if (id === "P07") {
      question = "本次材料库的边界，会怎样限制“没有找到”的含义？";
      action = (
        <div>
          {field(
            "研究问题",
            state.project.question,
            (v) =>
              update(
                "修改研究问题",
                state.project.id,
                () => (state.project.question = v),
              ),
            true,
          )}
          {field(
            "时间、语言、纳入原则与已知缺口",
            state.project.scope,
            (v) =>
              update(
                "修改材料覆盖说明",
                state.project.id,
                () => (state.project.scope = v),
              ),
            true,
          )}
          {check("纳入当前研究范围", s.included !== false, (v) =>
            this.edit("included", v),
          )}
        </div>
      );
      result = card(
        "实际登记范围",
        <ul>
          <li>本库登记 {state.project.sources.length} 项</li>
          <li>
            有附件{" "}
            {
              state.project.sources.filter((x: any) => x.attachments.length)
                .length
            }{" "}
            项
          </li>
          <li>
            有处理正文{" "}
            {
              new Set(
                state.project.segments
                  .filter((x: any) => !x.derived)
                  .map((x: any) => x.sourceId),
              ).size
            }{" "}
            项
          </li>
          <li>
            纳入检索{" "}
            {
              state.project.sources.filter((x: any) => x.included !== false)
                .length
            }{" "}
            项
          </li>
        </ul>,
      );
      last = (
        <div>
          <p>{state.project.scope || "尚未写覆盖说明。"}</p>
          <p>这里的分母是当前本库登记量；不代表所有可能史料。</p>
          {recent(state.project.id)}
        </div>
      );
    } else if (id === "P08") {
      question = "收藏、主题与处理状态怎样各自帮助回找？";
      action = (
        <div>
          {field(
            "收藏（逗号分隔，可有多个）",
            (s.collections || []).join("，"),
            (v) =>
              this.edit(
                "collections",
                v
                  .split(/[,，]/)
                  .map((x) => x.trim())
                  .filter(Boolean),
              ),
          )}
          {field("主题标签", (s.tags || []).join("，"), (v) =>
            this.edit(
              "tags",
              v
                .split(/[,，]/)
                .map((x) => x.trim())
                .filter(Boolean),
            ),
          )}
          {select(
            "处理状态",
            s.status,
            ["待核", "待取得", "待读", "已摘录", "已核对"],
            (v) => this.edit("status", v),
          )}
          {field("筛选主题／收藏", this.term, (v) => (this.term = v))}
        </div>
      );
      result = materialList((x: any) =>
        [...(x.tags || []), ...(x.collections || [])].some((a: string) =>
          a.includes(this.term),
        ),
      );
    } else if (id === "P09") {
      question = "一件史料的多张照片怎样保留次序？";
      action = (
        <div>
          {field("档号／材料件号", s.archiveId, (v) =>
            this.edit("archiveId", v),
          )}
          {select("完整性", s.completeness, ["未知", "完整", "已知缺页"], (v) =>
            this.edit("completeness", v),
          )}
          {s.attachments.map((a: any, i: number) => (
            <div class="card">
              <b>
                {i + 1} · {a.name}
              </b>
              <button
                disabled={i === 0}
                onClick={() =>
                  update("调整附件页序", s.id, () => {
                    [s.attachments[i - 1], s.attachments[i]] = [
                      s.attachments[i],
                      s.attachments[i - 1],
                    ];
                  })
                }
              >
                上移
              </button>
            </div>
          ))}
        </div>
      );
      result = (
        <div>
          <p>
            1 件材料 · {s.attachments.length} 个文件 · 完整性：
            {s.completeness || "未知"}
          </p>
          {s.attachments
            .filter((a: any) => a.type?.startsWith("image/"))
            .map((a: any) => (
              <source-reader attachment-id={a.id} />
            ))}
          <p>对应 Tropy 的材料对象与照片组织；此处使用课程项目格式。</p>
        </div>
      );
    } else if (id === "P10" || id === "P11") {
      question =
        id === "P10"
          ? "“以后再读”能否变成随字段变化的队列？"
          : "暂停阅读后，能否从原位置接续？";
      first = (
        <div>
          {select(
            "条件视图",
            this.filter,
            ["全部", "缺全文", "可开始", "待核", "已完成"],
            (v) => (this.filter = v),
          )}
          {queue(state.project, this.filter).map((x: any) => (
            <button
              class="material-row"
              onClick={() => chooseSource(x.sourceId)}
            >
              <b>
                {
                  state.project.sources.find((a: any) => a.id === x.sourceId)
                    ?.title
                }
              </b>
              <small>
                {x.status} · 优先级 {x.priority} · {x.next}
              </small>
            </button>
          ))}
        </div>
      );
      action = t ? (
        <div>
          {chooser()}
          {select(
            "阅读状态",
            t.status,
            ["待读", "进行中", "待核", "完成"],
            (v) => update("更新阅读状态", t.id, () => (t.status = v)),
          )}
          {field("优先级 1–5", t.priority, (v) =>
            update(
              "人工调整优先级",
              t.id,
              () => (t.priority = Math.max(1, Math.min(5, Number(v) || 1))),
            ),
          )}
          {field("计划阅读范围", t.range, (v) =>
            update("计划阅读范围", t.id, () => (t.range = v)),
          )}
          {field("实际已读范围", t.readRange, (v) =>
            update("记录已读范围", t.id, () => (t.readRange = v)),
          )}
        </div>
      ) : (
        <button onClick={() => this.newTask()}>为当前材料建立任务</button>
      );
      result = t ? (
        <div>
          {field(
            "下一步具体动作",
            t.next,
            (v) => update("记录接续动作", t.id, () => (t.next = v)),
            true,
          )}
          {field(
            "当前阻碍",
            t.blocker,
            (v) => update("记录阅读阻碍", t.id, () => (t.blocker = v)),
            true,
          )}
          {field(
            "自己的理解",
            t.understanding,
            (v) => update("记录理解", t.id, () => (t.understanding = v)),
            true,
          )}
          <p>此队列由实际字段实时筛选；没有自动“读懂率”。</p>
        </div>
      ) : (
        <p>尚无阅读任务。</p>
      );
      last = (
        <div>
          {evidence()}
          {recent(t?.id)}
          {t && (
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("navigate-page", { detail: "P05" }),
                )
              }
            >
              从所选定位继续阅读
            </button>
          )}
        </div>
      );
    } else if (id === "P12") {
      question = "回找如何接上原文阅读、来源笔记和问题索引？";
      first = (
        <div>
          {chooser()}
          {card(
            "条目与附件",
            <p>
              {s.title} · {s.attachments.length} 个附件
            </p>,
          )}
        </div>
      );
      action = (
        <div>
          {field("回找原文", this.term, (v) => (this.term = v))}
          {search(state.project, this.term).map((x: any) => (
            <button
              class="material-row"
              onClick={() => {
                chooseSource(x.sourceId);
                state.segmentId = x.id;
                this.changed();
              }}
            >
              {location(x)} · {x.text.slice(0, 100)}
            </button>
          ))}
          <p>此处实际运行关键词回找；RAG 原理沿用第三周。</p>
        </div>
      );
      result = (
        <div>
          {evidence()}
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate-page", { detail: "P20" }),
              )
            }
          >
            进入来源笔记
          </button>
        </div>
      );
      last = (
        <div>
          {state.project.notes
            .filter((x: any) => x.sourceId === s.id)
            .map((x: any) => card(x.title, <p>{x.body || "待写个人理解"}</p>))}
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate-page", { detail: "P26" }),
              )
            }
          >
            进入问题索引
          </button>
        </div>
      );
    } else {
      question = "哪些材料实际进入了本次回找范围？";
      action = (
        <div>
          {check("当前材料纳入检索", s.included !== false, (v) =>
            this.edit("included", v),
          )}
          {field(
            "纳入／排除理由",
            s.inclusionReason,
            (v) => this.edit("inclusionReason", v),
            true,
          )}
          {field("查询原文", this.term, (v) => (this.term = v))}
        </div>
      );
      result = (
        <div>
          {search(state.project, this.term).map((x: any) =>
            card(location(x), <p>{x.text}</p>),
          )}
          <p>
            命中 {search(state.project, this.term).length}{" "}
            个实际片段；语义向量未配置时不显示虚构相似度。
          </p>
        </div>
      );
      last = (
        <div>
          {state.project.sources.map((x: any) => (
            <p>
              {x.included === false ? "排除" : "纳入"} · {x.title} ·{" "}
              {state.project.segments.some(
                (a: any) => a.sourceId === x.id && !a.derived,
              )
                ? "有处理正文"
                : "正文未就绪"}
            </p>
          ))}
        </div>
      );
    }
    return flow(
      question,
      [
        { title: names[0], body: first },
        { title: names[1], body: action },
        { title: names[2], body: result },
        { title: names[3], body: last },
      ],
      "改动一项记录，再到后续页面观察同一项目的变化。",
    );
  }
}
