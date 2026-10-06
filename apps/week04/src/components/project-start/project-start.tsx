import { Component, h, Listen, State } from "@stencil/core";
import {
  state,
  source,
  task,
  update,
  loadTeacher,
  install,
  emptyProject,
  ensureTask,
} from "../../lib/project";
import { field, card, materialList, recent } from "../../lib/ui";
@Component({ tag: "project-start", shadow: false })
export class ProjectStart {
  @State() revision = 0;
  @State() error = "";
  @Listen("project-change", { target: "window" }) changed() {
    this.revision++;
  }
  private open(id: string) {
    window.dispatchEvent(new CustomEvent("navigate-page", { detail: id }));
  }
  render() {
    const s = source(),
      t = task();
    return (
      <div class="project-start">
        <section class="start-question">
          <h2>从一个研究问题开始</h2>
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
          <button onClick={() => install(emptyProject())}>新建空白项目</button>
          <p role="status">{this.error}</p>
          <p>先登记材料身份，再选择阅读任务。上方功能都在本环节内切换。</p>
        </section>
        <section>
          <h2>选择一份材料，留下下一步</h2>
          {materialList()}
          <button onClick={() => this.open("P03")}>登记当前材料身份</button>
          <button disabled={!s} onClick={() => ensureTask()}>
            加入阅读队列
          </button>
          {t &&
            card(
              "当前材料的阅读任务",
              <div>
                <p>
                  {s?.title} · {t.status}
                </p>
                {field(
                  "下一步具体动作",
                  t.next,
                  (v) => update("记录接续动作", t.id, () => (t.next = v)),
                  true,
                )}
                <button onClick={() => this.open("P10")}>
                  在此安排阅读任务
                </button>
              </div>,
            )}
        </section>
        <section class="start-results">
          <h2>查看这次研究留下什么</h2>
          {card(
            "当前项目",
            <p>
              {state.project.sources.length}项材料 ·{" "}
              {state.project.tasks.length}项阅读任务 ·{" "}
              {state.project.notes.length}条笔记 · {state.project.claims.length}
              个问题
            </p>,
          )}
          <button onClick={() => this.open("P20")}>在此写来源笔记</button>
          <button onClick={() => this.open("P26")}>在此查看问题与依据</button>
          {recent()}
          <p>临时面板关闭后回到这里；材料、任务和解释共用同一份项目。</p>
        </section>
      </div>
    );
  }
}
