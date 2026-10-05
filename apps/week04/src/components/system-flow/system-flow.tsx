import { Component, h, Prop, State, Listen } from "@stencil/core";
import {
  state,
  source,
  segment,
  task,
  update,
  uid,
  now,
  editSegment,
  search,
  download,
  backup,
  restore,
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
  materialList,
} from "../../lib/ui";
@Component({ tag: "system-flow", shadow: false })
export class SystemFlow {
  @Prop() pageId = "P29";
  @State() revision = 0;
  @State() term = "徳教";
  @State() rule = "NFKC";
  @State() rowUnit = "材料";
  @State() result = "";
  @State() message = "";
  @State() library = "";
  @State() libraryType = "groups";
  @State() zoteroKey = "";
  @State() remote: any[] = [];
  @State() busy = false;
  @State() append = false;
  @Listen("project-change", { target: "window" }) changed() {
    this.revision++;
  }
  private async export() {
    this.busy = true;
    try {
      const r = await backup();
      download(r.blob, "研究项目_含原件.zip");
      this.message = r.missing.length
        ? `备份完成，但缺 ${r.missing.length} 个原件：${r.missing.join("，")}`
        : "完整备份已生成，请另存并试着恢复。";
    } catch (e) {
      this.message = `备份失败：${e.message}`;
    } finally {
      this.busy = false;
    }
  }
  private async zotero() {
    this.busy = true;
    try {
      if (!/^\d+$/.test(this.library))
        throw Error("填写 Zotero 库的数字编号。");
      const r = await fetch(
        `https://api.zotero.org/${this.libraryType}/${this.library}/items/top?format=json&limit=25`,
        {
          headers: {
            "Zotero-API-Version": "3",
            ...(this.zoteroKey ? { "Zotero-API-Key": this.zoteroKey } : {}),
          },
        },
      );
      if (!r.ok)
        throw Error(
          `HTTP ${r.status}${r.status === 429 ? "，服务要求稍后重试" : ""}`,
        );
      this.remote = await r.json();
      this.message = `实时取得本页 ${this.remote.length} 条题录；最多 25 条，不等于全库。`;
    } catch (e) {
      this.message = `Zotero 查询失败：${e.message}`;
    } finally {
      this.busy = false;
    }
  }
  render() {
    const id = this.pageId,
      s = source(),
      seg = segment();
    let question = "系统怎样在持续修改之后保持可用？",
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
    if (id === "P29") {
      question = "表格中的一行代表材料、片段还是研究者的判断？";
      action = (
        <div>
          {select(
            "当前行单位",
            this.rowUnit,
            ["材料", "片段", "笔记"],
            (v) => (this.rowUnit = v),
          )}
          {field("筛选实际记录", this.term, (v) => (this.term = v))}
          <p>切换视图改变行的单位，不改变原件。</p>
        </div>
      );
      const rows =
        this.rowUnit === "材料"
          ? state.project.sources
          : this.rowUnit === "笔记"
            ? state.project.notes
            : state.project.segments;
      result = (
        <table class="flow-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>实际内容</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter(
                (x: any) =>
                  !this.term ||
                  `${x.title || ""}${x.text || ""}${x.body || ""}`.includes(
                    this.term,
                  ),
              )
              .map((x: any) => (
                <tr>
                  <td>{x.id}</td>
                  <td>{x.title || x.text || x.body}</td>
                </tr>
              ))}
          </tbody>
        </table>
      );
    } else if (id === "P30") {
      question = "相近写法能否直接合并成同一责任者或概念？";
      action = (
        <div>
          {field("查找题名／责任者", this.term, (v) => (this.term = v))}
          {field("当前记录的规范显示名", s?.displayName, (v) =>
            update("人工登记规范名", s.id, () => (s.displayName = v)),
          )}
          {field(
            "合并／不合并理由",
            s?.normalizationReason,
            (v) =>
              update("解释规范名判断", s.id, () => (s.normalizationReason = v)),
            true,
          )}
        </div>
      );
      result = materialList((x: any) =>
        `${x.title}${x.author || ""}`
          .normalize("NFKC")
          .includes(this.term.normalize("NFKC")),
      );
      last = (
        <div>
          <p>
            查找只是候选。记录规范名保留原题名；“徳教”宗教团体名称与明治教育思想用语需根据语境区分。
          </p>
          {sourceTrail()}
        </div>
      );
    } else if (id === "P31") {
      question = "统一检索写法时，能否继续看到原貌？";
      action = (
        <div>
          {select(
            "处理副本的规则",
            this.rule,
            ["NFKC", "NFC", "徳→德、敎→教（本例人工规则）"],
            (v) => (this.rule = v),
          )}
          <button
            disabled={!seg}
            onClick={() => {
              this.result = this.rule.startsWith("徳")
                ? seg.text.replaceAll("徳", "德").replaceAll("敎", "教")
                : seg.text.normalize(this.rule);
            }}
          >
            生成检索副本
          </button>
          <button
            disabled={!seg || !this.result}
            onClick={() =>
              update("保存规范化检索副本", seg.id, () => {
                seg.normalized = this.result;
                seg.normalizationRule = this.rule;
                seg.normalizationRevision = seg.revision || 1;
              })
            }
          >
            保存副本，原文保留
          </button>
        </div>
      );
      result = (
        <div>
          <h3>规范化副本</h3>
          <pre>{this.result || seg?.normalized || "尚未生成"}</pre>
          <p>规则：{seg?.normalizationRule || "未保存"}</p>
        </div>
      );
    } else if (id === "P32") {
      question = "一份 PDF 里面的篇章，怎样成为各自可查的研究单位？";
      action = (
        <div>
          {field("新单位题名", this.term, (v) => (this.term = v))}
          <button
            disabled={!seg}
            onClick={() => {
              const n = {
                ...structuredClone(seg),
                id: uid("segment"),
                unitTitle: this.term,
                parentId: seg.id,
                coverage: "从已选片段建立的研究单位；未自动分割整卷",
              };
              update("建立有母记录的研究单位", n.id, () =>
                state.project.segments.push(n),
              );
            }}
          >
            从所选范围建立研究单位
          </button>
          <p>划定范围仍需实际阅读；一份文件可以对应多个篇章记录。</p>
        </div>
      );
      result = (
        <div>
          {state.project.segments
            .filter((x: any) => x.sourceId === s?.id)
            .map((x: any) =>
              card(
                x.unitTitle || location(x),
                <p>{x.coverage || x.text.slice(0, 100)}</p>,
              ),
            )}
        </div>
      );
    } else if (id === "P33") {
      question = "校订原文之后，哪些笔记和研究主张需要重看？";
      action = (
        <div>
          {field(
            "校订文字",
            this.result || seg?.text,
            (v) => (this.result = v),
            true,
          )}
          <button
            disabled={!seg || !this.result}
            onClick={() =>
              update("校订所选正文", seg.id, () =>
                editSegment(state.project, seg.id, this.result),
              )
            }
          >
            保存新修订并标记依赖
          </button>
        </div>
      );
      result = (
        <div>
          {state.project.notes
            .filter((x: any) => x.segmentId === seg?.id)
            .map((x: any) =>
              card(
                x.title,
                <p>{x.stale ? "待复核：所依正文已变动" : "当前依据未变动"}</p>,
              ),
            )}
          {state.project.claims
            .filter(
              (x: any) =>
                x.evidence?.includes(seg?.id) || x.counter?.includes(seg?.id),
            )
            .map((x: any) =>
              card(x.title, <p>{x.stale ? "待复核" : "未标记变动"}</p>),
            )}
        </div>
      );
      last = (
        <div>
          {seg?.history?.map((x: any) =>
            card(`旧修订 ${x.revision}`, <pre>{x.text}</pre>),
          )}
          {sourceTrail()}
        </div>
      );
    } else if (id === "P34") {
      question = "移出一个视图，是否也删除了原件和既有解释？";
      action = (
        <div>
          <button
            disabled={!s}
            onClick={() =>
              update("移出当前收藏，保留记录", s.id, () => (s.collections = []))
            }
          >
            移出收藏
          </button>
          {s &&
            check("仍纳入回找范围", s.included !== false, (v) =>
              update("调整检索范围", s.id, () => (s.included = v)),
            )}
          <p>
            保留材料和原件的操作可以在这里观察；永久删除需单独确认其依赖，本演示先保留记录。
          </p>
        </div>
      );
      result = (
        <div>
          <p>收藏：{(s?.collections || []).join("、") || "无"}</p>
          <p>回找：{s?.included === false ? "排除" : "纳入"}</p>
          <p>原件登记：{s?.attachments.length || 0} 个</p>
          <p>
            相关笔记：
            {
              state.project.notes.filter((x: any) => x.sourceId === s?.id)
                .length
            }{" "}
            条
          </p>
        </div>
      );
    } else if (id === "P35" || id === "P42") {
      question =
        id === "P42"
          ? "怎样把本次研究保存成下次可以继续的起点？"
          : "备份里有笔记，也真的有原件吗？";
      first = card(
        "当前项目的真实内容",
        <ul>
          <li>材料 {state.project.sources.length}</li>
          <li>
            附件登记{" "}
            {state.project.sources.reduce(
              (n: number, x: any) => n + x.attachments.length,
              0,
            )}
          </li>
          <li>正文片段 {state.project.segments.length}</li>
          <li>笔记 {state.project.notes.length}</li>
          <li>问题 {state.project.claims.length}</li>
          <li>修改记录 {state.project.events.length}</li>
        </ul>,
      );
      action = (
        <div>
          <button disabled={this.busy} onClick={() => this.export()}>
            导出含原件的完整 ZIP
          </button>
          <button
            onClick={() =>
              download(
                new Blob([JSON.stringify(state.project, null, 2)], {
                  type: "application/json",
                }),
                "研究记录_不含原件.json",
              )
            }
          >
            只导出记录 JSON
          </button>
          <p>清除浏览器数据会丢失本机库；下载并试恢复后才算验证了保存。</p>
        </div>
      );
      result = (
        <div>
          {check(
            "追加到当前项目（不覆盖既有记录）",
            this.append,
            (v) => (this.append = v),
          )}
          <label class="field">
            <span>上传 ZIP／JSON 备份</span>
            <input
              type="file"
              accept=".zip,.json"
              onChange={async (e: any) => {
                const f = e.target.files[0];
                if (!f) return;
                try {
                  const r = await restore(f, this.append);
                  this.message = `恢复完成；随包原件 ${r.files.length} 个，未随包原件 ${r.missing.length} 个。`;
                } catch (error) {
                  this.message = `恢复失败：${error.message}`;
                }
              }}
            />
          </label>
          <p role="status">{this.message}</p>
        </div>
      );
      last = (
        <div>
          {recent()}
          <p>完整包检验附件指纹；JSON 只带记录，不承诺携带原件。</p>
        </div>
      );
    } else if (id === "P38") {
      question = "Zotero 连接器实际省去了哪一步？";
      first = (
        <div>
          <p>本页通过官方 Web API 实时读取题录，与本机记录作比较。</p>
          <p>
            数据同步免费；附件云存储免费 300MB，更多容量另收费。API
            接入不需要先购买储存套餐。
          </p>
          <a
            href="https://www.zotero.org/support/dev/web_api/v3/basics"
            target="_blank"
            rel="noopener"
          >
            Zotero API 官方说明 ↗
          </a>
        </div>
      );
      action = (
        <div>
          {select(
            "库类型",
            this.libraryType,
            ["groups", "users"],
            (v) => (this.libraryType = v),
          )}
          {field("库的数字编号", this.library, (v) => (this.library = v))}
          <label class="field">
            <span>私有库只读 key（仅本窗口内存）</span>
            <input
              type="password"
              value={this.zoteroKey}
              onInput={(e: any) => (this.zoteroKey = e.target.value)}
            />
          </label>
          <button disabled={this.busy} onClick={() => this.zotero()}>
            查询 25 条题录
          </button>
          <p role="status">{this.message}</p>
        </div>
      );
      result = (
        <div>
          {this.remote.map((x: any) =>
            card(
              x.data.title || x.key,
              <div>
                <p>
                  {x.data.date || "年代未载"} · {x.data.itemType}
                </p>
                <button
                  onClick={() => {
                    const s = {
                      id: `zotero-${this.libraryType}-${this.library}-${x.key}`,
                      title: x.data.title || x.key,
                      date: x.data.date || "",
                      author: (x.data.creators || [])
                        .map(
                          (a: any) =>
                            a.name ||
                            `${a.firstName || ""} ${a.lastName || ""}`,
                        )
                        .join("; "),
                      kind: "二手文献",
                      attachments: [],
                      tags: (x.data.tags || []).map((a: any) => a.tag),
                      collections: [],
                      included: true,
                      acquisition: "Zotero Web API v3",
                      externalVersion: x.version,
                      catalogUrl: x.links?.alternate?.href,
                    };
                    if (state.project.sources.some((a: any) => a.id === s.id)) {
                      this.message = "已在本库；保留已有题录和个人笔记。";
                      return;
                    }
                    update("从 Zotero 取得题录", s.id, () =>
                      state.project.sources.push(s),
                    );
                  }}
                >
                  追加题录；不自动取得全文
                </button>
              </div>,
            ),
          )}
        </div>
      );
      last = (
        <div>
          <p>
            此实现没有运行 Zotero 整个网页库，也没有修改你的远端库。题录、PDF
            附件和阅读进度仍需分别接续。
          </p>
          {sourceTrail()}
        </div>
      );
    } else {
      question = "新增一个工具，究竟解决了什么重复劳动？";
      first = card(
        "本项目已完成的动作",
        <div>
          {recent()}
          <p>工具的作用应体现在可接续记录上。</p>
        </div>,
      );
      action = (
        <div>
          {field(
            "拟增加的工具与具体重复劳动",
            this.result,
            (v) => (this.result = v),
            true,
          )}
          <button
            onClick={() =>
              update(
                "记录工具选择理由",
                state.project.id,
                () => (state.project.toolDecision = this.result),
              )
            }
          >
            保存选择理由
          </button>
        </div>
      );
      result = (
        <div>
          {card(
            "第一组：浏览器核心",
            <p>
              本工作台＋PDF.js＋Word
              导入＋阅读队列＋笔记与备份。无需模型即可完成整理。
            </p>,
          )}
          {card(
            "第二组：选定能力比较",
            <p>
              原件阅读比较 PDF.js、浏览器原生阅读器与 Zotero Reader；导入器提供
              Tesseract、NDLOCR-Lite 和可选 Scribe.js 比较。
            </p>,
          )}
          {card(
            "第三组：原软件连接",
            <p>
              Zotero 实时题录读取、Markdown
              导出连接笔记软件；完整平台部署需另有实例与权限。
            </p>,
          )}
        </div>
      );
      last = (
        <div>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("navigate-page", { detail: "P35" }),
              )
            }
          >
            检验保存与恢复
          </button>
          <p>效果以实际输入与可回查结果判断，不把工具数量当作能力。</p>
        </div>
      );
    }
    return flow(
      question,
      [
        { title: "当前记录", body: first },
        { title: "执行一项改变", body: action },
        { title: "观察实际影响", body: result },
        { title: "保留与恢复", body: last },
      ],
      "保存后重新打开项目，检验能否从已有记录继续。",
    );
  }
}
