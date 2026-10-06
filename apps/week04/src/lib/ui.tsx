import { h } from "@stencil/core";
import { state, source, chooseSource, segment } from "./project";
export const field = (
  label: string,
  value: any,
  save: (value: string) => void,
  multiline = false,
) => (
  <label class="field">
    <span>{label}</span>
    {multiline ? (
      <textarea
        rows={4}
        value={value || ""}
        onChange={(e: any) => save(e.target.value)}
      />
    ) : (
      <input value={value || ""} onChange={(e: any) => save(e.target.value)} />
    )}
  </label>
);
export const select = (
  label: string,
  value: any,
  options: string[],
  save: (value: string) => void,
) => (
  <label class="field">
    <span>{label}</span>
    <select onChange={(e: any) => save(e.target.value)}>
      {options.map((x) => (
        <option value={x} selected={x === (value || options[0])}>
          {x}
        </option>
      ))}
    </select>
  </label>
);
export const check = (
  label: string,
  value: boolean,
  save: (value: boolean) => void,
) => (
  <label class="check">
    <input
      type="checkbox"
      checked={value}
      onChange={(e: any) => save(e.target.checked)}
    />
    {label}
  </label>
);
export function chooser() {
  return (
    <label class="field">
      <span>当前材料</span>
      <select onChange={(e: any) => chooseSource(e.target.value)}>
        {state.project.sources.map((x: any) => (
          <option value={x.id} selected={x.id === state.sourceId}>
            {x.kind} · {x.title}
          </option>
        ))}
      </select>
    </label>
  );
}
export function segmentChooser() {
  return (
    <label class="field">
      <span>已处理范围</span>
      <select
        onChange={(e: any) => {
          state.segmentId = e.target.value;
          window.dispatchEvent(new CustomEvent("project-change"));
        }}
      >
        {state.project.segments
          .filter((x: any) => x.sourceId === state.sourceId)
          .map((x: any) => (
            <option value={x.id} selected={x.id === segment()?.id}>
              {x.pdfPage ? `PDF ${x.pdfPage}` : x.locator || "未定位"} ·{" "}
              {x.derived ? "派生文本" : x.method}
            </option>
          ))}
      </select>
    </label>
  );
}
export const location = (s: any) =>
  s?.pdfPage
    ? `PDF物理页 ${s.pdfPage}｜印刷页 ${s.printedPage || "未登记"}`
    : s?.locator || "未登记定位";
export const evidence = () => {
  const s = segment();
  return (
    <div class="evidence">
      <span class="badge">
        {s?.derived ? "派生文本" : s?.verification || "未核正文"}
      </span>
      <p>{location(s)}</p>
      {s?.imageUrl && (
        <img class="source-image" src={s.imageUrl} alt="所选证据的原页" />
      )}
      <blockquote>
        {s?.text || "尚无正文；先取得附件或通过通用导入器处理材料。"}
      </blockquote>
      <p>{s?.coverage || ""}</p>
    </div>
  );
};
export const card = (title: string, body: any) => (
  <article class="card">
    <h3>{title}</h3>
    {body}
  </article>
);
export function flow(
  question: string,
  columns: { title: string; body: any; why?: string }[],
  tryText: string,
  layout = "workspace",
) {
  return (
    <div class={`flow-shell flow-layout-${layout}`}>
      <p class="flow-question">{question}</p>
      <div class="flow-grid">
        {columns.slice(0, 3).map((c, i) => (
          <section class="flow-col">
            <header>{c.title}</header>
            {c.why && <p class="flow-why">{c.why}</p>}
            {c.body}
          </section>
        ))}
      </div>
      {columns[3] && (
        <details class="flow-provenance">
          <summary>{columns[3].title} · 展开查看</summary>
          {columns[3].body}
        </details>
      )}
      <p class="flow-try">动手观察：{tryText}</p>
    </div>
  );
}
export function recent(target = "") {
  return (
    <ol class="history">
      {state.project.events
        .filter((x: any) => !target || x.target === target)
        .slice(-6)
        .reverse()
        .map((x: any) => (
          <li>
            <time>{x.time.slice(11, 19)}</time> {x.action}
            <small>{x.detail}</small>
          </li>
        ))}
    </ol>
  );
}
export function materialList(filter = (x: any) => true) {
  return (
    <div class="material-list">
      {state.project.sources.filter(filter).map((s: any) => (
        <button
          class={{ "material-row": true, selected: s.id === state.sourceId }}
          onClick={() => chooseSource(s.id)}
        >
          <b>{s.title}</b>
          <small>
            {s.kind} · {s.date || "年代待核"} ·{" "}
            {s.attachments.length ? "有附件" : "仅题录"}
          </small>
        </button>
      ))}
    </div>
  );
}
export function sourceTrail() {
  const s = source(),
    seg = segment();
  return card(
    "回到依据",
    <div>
      <p>{s?.title || "未选材料"}</p>
      <p>{location(seg)}</p>
      <p>
        文本修订 {seg?.revision || 1} · {seg?.method || "尚无正文"}
      </p>
      {s?.catalogUrl && (
        <a href={s.catalogUrl} target="_blank" rel="noopener">
          题录来源 ↗
        </a>
      )}
      <p class="muted">原文、个人解释和研究主张保留不同身份。</p>
    </div>,
  );
}
