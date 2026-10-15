(() => {
  "use strict";
  const D = window.Deck, E = D.esc, M = window.LabMath;
  window.W5ServicesReady = import("./services.mjs");
  let S;
  const input = (k, v, l) => `<label class="field">${E(l)}<input data-k="${k}" value="${E(v ?? "")}" ${["a", "b"].includes(k) ? 'maxlength="30"' : ""}></label>`;
  const area = (k, v, l, n = 4) => `<label class="field">${E(l)}<textarea data-k="${k}" rows="${n}">${E(v ?? "")}</textarea></label>`;
  const slider = (k, v, l, min, max, step = 1) => `<label class="field">${E(l)}：${E(v)}<input data-k="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
  const tabs = (k, v, items) => `<nav class="revision-tabs" role="tablist">${items.map(([id, label]) => `<button data-set="${k}" data-v="${E(id)}" role="tab" aria-selected="${String(String(id) === String(v))}" class="${String(id) === String(v) ? "on" : ""}">${E(label)}</button>`).join("")}</nav>`;
  const number = (x) => Number(x).toFixed(3);
  const table = (heads, rows) => `<div class="table-scroll"><table class="kv"><thead><tr>${heads.map((h) => `<th>${E(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${v ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const quote = (r) => `<article class="source-excerpt"><small>${E(r.id)} · ${E(r.author)} · ${E(r.locator)}</small><p>${E(r.text)}</p><p class="caption">${E(r.verification || "待核")} ${r.translation ? E(r.translation) : ""}</p><button data-reader="${E(r.id)}">原页／版本／正文</button></article>`;
  const JSONblock = (x) => `<pre class="trace">${E(JSON.stringify(x, null, 2))}</pre>`;
  const STORE = "rev2/";
  const LECTURE_GRADES = { 0: { cite: "S6", weight: 1 }, 1: { cite: "A2", weight: 0.5 }, 2: { cite: "", weight: 0 } };
  const TASK_PROMPTS = {
    筛选: "判断所给每个片段是否与问题相关。逐段输出：[片段ID] 相关／不相关／不确定，并用一句话说明理由。不要回答问题本身。",
    抽取: "从所给原文中逐字抽出能回答问题的句子，每条前标[片段ID]，只抄原文，不改写、不补充。",
    释义: "对问题涉及的原文逐句作现代汉语释义。每句先引原文并标[片段ID]，再给释义；不确定的字词注明。",
    概括: "依据所给原文概括作者的观点，每句末标[片段ID]；区分原文明说、释义与你的推断，推断须注明“推断”。",
    比较: "比较不同作者在所给原文中的说法，每个判断标[片段ID]；指出各自讨论的对象与范围是否相同，不把一人之说扩大为共同主张。",
    验证: "检查下面“自己的回答”中每一句是否得到所给原文支持，逐句判为完全支持／部分支持／不支持，并给出[片段ID]与理由。",
  };
  // D03 题录字段：键、标签、提示、属于“定位三问”的哪一问（1 是谁，2 在哪，3 读到哪）。
  const BIB_FIELDS = [["author", "责任者", "如：章學誠", 1], ["title", "题名", "篇名或书名", 1], ["container", "所载书名／丛书", "如：文史通義 卷三 內篇三", 1], ["edition", "所用版本", "出版者、年份、版次印次", 2], ["basis", "底本", "影印或排印所据的本子", 2], ["origin", "初刊／首次发表", "年份与刊物", 2], ["access", "获取方式", "教师PDF、维基文库、青空文库……", 2], ["page", "印刷页", "书上的页码，如 63", 3], ["pdfPage", "PDF页序", "文件里的第几页，如 78", 3], ["status", "核读状态", "已核／局部核对／待核", 3], ["note", "备注", "查不到的写“待查”", 3]];
  const D24_STAGES = [["材料身份", "D03"], ["范围与切分", "D04"], ["检索", "D10"], ["图与关系", "D19"], ["机器与人工比较", "D22"], ["逐句核读", "D16"], ["备份与接续", ""]];
  const D24_HINTS = ["从十条史料、十条研究文献与课程材料中选定本轮范围；区分史料、二手文献与教师稿，点题名查看第四周正文块。", "第四周文本块较长，按句号等分隔递归细分为检索单元，原块编号不变；调单元上限，看单元数与长度。", "先用 BM25 在全部单元上找得全，再只对前 N 个单元现场嵌入、按余弦排得准；页面写明实际编码了哪些单元。", "只在检索保留的单元上建共现图；改写称呼与概念，注意徳教／德敎等异体。", "接续第四周的阅读轮次：先写自己的判断，再把保留单元交给模型，比较两者。", "把回答拆成句子，逐句选引文、定三级支持，引文可回到第四周原页。", "完整备份含导入原件、正文、检索与核读记录，可在第六周继续。"];
  const CH = () => window.W5_CHAPTERS || {};
  const pageLinks = (links) => links?.length ? `<p class="w5-links">${links.map(([id, label]) => D.pageLink(id, id + " " + label + " →")).join("")}</p>` : "";
  // 本页默认值：只在该页第一次打开时使用；之后以浏览器里保存的设置为准。
  const PAGE_DEFAULTS = {
    D04: { record: "__whole", method: "recursive", size: 120, overlap: 20 },
    D06: { scope: 10, view: "run" },
    D08: { source: "shide", record: "S4", context: "neighbors" },
    D09: { record: "__whole", size: 120, query: "章學誠對著史者提出了什麼要求？這一要求針對的是什麼？", used: ["S3b", "S4", "S6"] },
    D11: { unit: "char", norm: "", query: "史德与心术", passage: "能具史識者。必知史德。德者何。謂著書者之心術也。" },
    D12: { a: "森鴎外", b: "森鷗外" },
    D13: { query: "章學誠怎样看待史家的立场？", budget: 3 },
    D14: { pair: "shide", dupThreshold: 0.9 },
    D15: { query: "史德與心術", budget: 3 },
    D16: { grades: LECTURE_GRADES, answer: "章學誠要求著史者“盡其天而不益以人”。\n阿克顿认为史料批判是史学的全部工作。\n三人都主张叙述必须服从史料。", source: "all" },
    D19: { source: "all" },
    D21: { query: "史德是什麼？", rhoPaper: 0.5 },
    D22: { source: "all", query: "这几位作者怎样看待史料对叙述者的约束？", budget: 6 },
    D24: { source: "all", through: 0, topN: 40, budget: 10 },
  };
  class RevisionLab extends HTMLElement {
    connectedCallback() {
      if (this.started) {
        window.addEventListener("week05-corpus-change", this.refresh);
        if (this.beforeBackup) window.addEventListener("week05-before-backup", this.beforeBackup);
        if (this.ready) this.render();
        return;
      }
      this.started = true;
      this.id = this.getAttribute("page-id");
      this.page = D.pageById(this.id);
      this.s = Object.assign({ source: "shide", record: "", step: 0, tab: "0", method: "fixed", size: 160, overlap: 20, theta: 0.4, threshold: "absolute", semantic: "breakpoint", k: 3, lambda: 0.2, eps: 0.4, minPoints: 2, scope: 8, query: "史德與心術", a: "森鴎外", b: "森鷗外", edit: 0, editMode: "fill", permutations: 128, budget: 3, representation: "bm25", terms: "史德\n史識\n心術\n劉氏\n劉氏子元\n史料\n自然\n栗山大膳\n日蓮上人\n山椒大夫\nauthor\ncriticism\nhistory", aliases: "森鷗外=>森鴎外\nActon=>Lord Acton\n劉氏子元=>劉知幾", entityRule: "exact", zoom: 1, strategy: "GraphRAG", view: "run", context: "metadata", hypothesis: "", claim: "章學誠、阿克顿與森鴎外都認為歷史敘述必須完全服從史料。", answer: "", task: "比较", report: "", through: 0, antIter: 10, ants: 8, rho: 0.3, cloud: false, grades: {}, used: [], sub: 0, unit: "char", norm: "", topN: 40, rhoPaper: 0.5, pair: "shide", dupThreshold: 0.9 }, structuredClone(PAGE_DEFAULTS[this.id] || {}));
      this.defaults = structuredClone(this.s);
      Object.assign(this.s, D.store.get(STORE + this.id, {}));
      if (!["absolute", "percentile", "std", "iqr"].includes(this.s.threshold)) this.s.threshold = "absolute";
      this.busy = false;
      this.result = null;
      this.vectors = null;
      this.selectedNode = "";
      this.message = "";
      this.addEventListener("input", (e) => {
        if (e.target.closest("revision-lab") !== this) return;
        let k = e.target.dataset.k;
        if (!k) return;
        const previous = this.s[k];
        this.s[k] = e.target.type === "range" ? Number(e.target.value) : e.target.type === "checkbox" ? e.target.checked : e.target.value;
        if (previous !== this.s[k]) this.changed(k);
        this.save();
      });
      this.addEventListener("change", (e) => {
        if (e.target.closest("revision-lab") !== this) return;
        let k = e.target.dataset.k;
        if (k && e.target.tagName === "SELECT") {
          this.s[k] = e.target.value;
          if (k === "source") {
            this.s.record = PAGE_DEFAULTS[this.id]?.record === "__whole" ? "__whole" : "";
            this.s.passage = "";
            this.result = null;
            this.vectors = null;
            this.changed(k);
          }
          this.save();
        }
        if (e.target.dataset.import) this.import(e.target.files?.[0]);
        if (e.target.dataset.restore) this.restore(e.target.files?.[0]);
      });
      this.addEventListener("click", (e) => {
        if (e.target.closest("revision-lab") !== this) return;
        let b = e.target.closest("[data-set],[data-do],[data-rail],[data-reader],[data-node],[data-stage],[data-sub],[data-flow],[data-d24src],[data-d24unit]");
        if (!b) return;
        if (b.dataset.set) {
          if (b.dataset.set.startsWith("grade")) {
            let i = b.dataset.set.slice(5);
            this.s.grades[i] = { ...this.s.grades[i] || {}, weight: Number(b.dataset.v) };
          } else {
            this.s[b.dataset.set] = b.dataset.v;
            if (b.dataset.set === "editMode") this.s.edit = 0;
            if (b.dataset.set === "through") this.s.d24tab = "work";
            if (b.dataset.set === "method") this.s.chunkFocus = -1;
            if (b.dataset.set === "unit") this.s.step = 0;
            if (b.dataset.set === "norm") this.s.step = 1;
            if (b.dataset.set === "hypIndex" && this.s.hyps) this.s.hypothesis = this.s.hyps[+b.dataset.v].text;
            if (b.dataset.set === "strategy") this.result = null;
          }
          this.save();
        }
        if (b.dataset.d24src || b.dataset.d24unit) {
          if (b.dataset.d24unit) {
            const u = this.d24Units().find((x) => x.id === b.dataset.d24unit);
            this.s.d24unit = b.dataset.d24unit;
            this.s.d24src = u?.source;
          } else {
            this.s.d24src = b.dataset.d24src;
            this.s.d24unit = "";
          }
          this.s.d24tab = "reader";
          this.save();
          return;
        }
        if (b.dataset.stage) {
          this.s.tab = b.dataset.stage;
          this.s.sub = 0;
          this.result = null;
          this.save();
          return;
        }
        if (b.dataset.sub) {
          this.s.sub = +b.dataset.sub;
          this.save();
          return;
        }
        if (b.dataset.flow) {
          this.s.flowNode = +b.dataset.flow;
          this.save();
          this.querySelector(".md-glow")?.scrollIntoView({ block: "nearest" });
          return;
        }
        if (b.dataset.rail) {
          this.s.step = +b.dataset.rail;
          this.save();
        }
        if (b.dataset.reader) this.read(b.dataset.reader);
        if (b.dataset.node) {
          this.selectedNode = b.dataset.node;
          this.render();
        }
        if (b.dataset.do) {
          this.lastPreset = b.dataset.v;
          this.action(b.dataset.do);
        }
      });
      this.addEventListener("focusin", (e) => {
        if (e.target.closest("revision-lab") !== this) return;
        const c = e.target.closest(".flow-col");
        if (c) {
          let i = [...this.querySelectorAll(".flow-col")].indexOf(c);
          if (i >= 0 && i !== +this.s.step) {
            this.s.step = i;
            this.querySelectorAll(".flow-rail [data-rail]").forEach((x, z) => x.classList.toggle("active", z === i));
          }
        }
      });
      this.addEventListener("week05-through-update", (e) => {
        if (this.id !== "D24") return;
        e.stopPropagation();
        this.s.chain ??= {};
        this.s.chain[e.detail.id] = { state: e.detail.state, result: e.detail.result };
        D.store.set(STORE + this.id, this.s);
      });
      this.refresh = (e) => {
        this.unitCache = null;
        if (e.detail?.restored) {
          this.s = Object.assign(structuredClone(this.defaults), D.store.get(STORE + this.id, {}), { cloud: false });
          this.loadWork();
        } else if (this.id === "D24") this.invalidateD24(true);
        else if (this.id === "D22") this.result = null;
        this.save();
      };
      this.beforeBackup = () => this.persistWork();
      window.addEventListener("week05-corpus-change", this.refresh);
      window.addEventListener("week05-before-backup", this.beforeBackup);
      window.W5ServicesReady.then((x) => {
        S = x;
        this.s.cloud = false;
        this.loadWork();
        this.ready = true;
        this.render();
      }).catch((e) => {
        this.innerHTML = "<p>" + E(e.message) + "</p>";
      });
    }
    disconnectedCallback() {
      clearInterval(this.timer);
      window.removeEventListener("week05-corpus-change", this.refresh);
      window.removeEventListener("week05-before-backup", this.beforeBackup);
    }
    save() {
      this.sanitizeGrades();
      D.store.set(STORE + this.id, this.s);
      this.persistWork();
      if (this.fromThrough) this.dispatchEvent(new CustomEvent("week05-through-update", { bubbles: true, detail: { id: this.id, state: structuredClone(this.s), result: this.result } }));
      this.render();
    }
    persistWork() {
      if (!S || !["D22", "D24", "D18", "D20"].includes(this.id)) return;
      return S.corpus.saveWorkspace(this.id, { result: this.result, d24res: this.d24res, d24answer: this.d24answer, graphRuns: this.graphRuns }).catch(e => {
        this.message = "工作记录未保存：" + e.message;
      });
    }
    loadWork() {
      const saved = S.corpus.workspace(this.id), w = saved || {};
      this.result = w.result || null;
      this.graphRuns = w.graphRuns || {};
      this.d24res = w.d24res || null;
      this.d24answer = w.d24answer || null;
      if (this.id === "D24") {
        if (!saved) this.recoverLegacyD24();
        if (this.d24res && this.d24res.stamp !== this.d24Stamp()) this.invalidateD24(true);
      }
      this.sanitizeGrades();
    }
    changed(k) {
      if (this.id === "D24") {
        if (["allowTeacher", "source", "unitSize", "query", "topN"].includes(k)) this.invalidateD24(true);
        else if (["budget", "question", "manual"].includes(k)) this.invalidateD24(false);
        else if (k === "d24answer") this.s.d24grades = {};
      }
      if (this.id === "D16" && k === "answer") this.s.grades = {};
      if (this.id === "D08" && ["source", "record", "query", "nb"].includes(k)) this.result = null;
    }
    invalidateD24(retrieval) {
      if (retrieval) { this.d24res = null; this.unitCache = null; }
      this.d24answer = null;
      this.result = null;
      delete this.s.d24answer;
      this.s.d24grades = {};
      this.s.cloud = false;
    }
    d24Stamp() {
      return JSON.stringify([S.corpus.revision(), this.d24Scope().map(m => m.id), +(this.s.unitSize || 300), this.s.query, +(this.s.topN || 40)]);
    }
    sanitizeGrades() {
      if (!S || this.id !== "D16") return;
      const valid = new Set(this.records().map(r => r.id));
      for (const [i, g] of Object.entries(this.s.grades || {})) if (g.cite && !valid.has(g.cite)) this.s.grades[i] = { cite: "", weight: 0 };
    }
    recoverLegacyD24() {
      // Old backups saved the actual API input, but not the dense scores. Recover
      // only its exact matching input units; never invent missing cosine values.
      const operation = [...S.corpus.runs()].reverse().find(r => r.page === "D24" && r.operation === "d24-read");
      const run = S.corpus.runs().find(r => r.id === operation?.result?.d24run);
      if (!run?.sourceIds?.length) return;
      const units = this.d24Units(), input = run.input?.find(m => m.role === "user")?.content || "";
      const kept = run.sourceIds.map(id => units.find(u => u.id === id));
      if (kept.some(u => !u)) return;
      for (let i = 0; i < kept.length; i++) {
        const u = kept[i], header = `[${u.id}] ${u.author} ${u.title} ${u.locator}\n`, start = input.indexOf(header);
        const next = kept[i + 1], end = next ? input.indexOf(`\n\n[${next.id}] `, start + header.length) : input.length;
        if (start < 0 || end < 0 || input.slice(start + header.length, end) !== u.text) return;
      }
      const t0 = performance.now(), bm25 = S.sparse(this.s.query, units);
      this.d24res = { stamp: this.d24Stamp(), total: units.length, query: this.s.query, bm25, bm25Seconds: (performance.now() - t0) / 1000, restoredKept: kept, legacy: true };
      this.d24answer = structuredClone(run);
      this.message = "旧版备份已接回实际发送的原文与模型候选；未保存的向量分数需重新计算。";
    }
    sources() {
      let ss = S.corpus.sources();
      return this.id === "D24" || this.fromThrough ? ss.filter((s) => s.private) : ss;
    }
    records() {
      let rs = this.throughScope?.length && ["D22", "D16"].includes(this.id) ? S.corpus.records().filter((r) => this.throughScope.includes(r.id)) : S.corpus.records();
      if (this.id === "D24" || this.fromThrough) rs = rs.filter((r) => r.private);
      return this.s.source === "all" ? rs : rs.filter((r) => r.source === this.s.source);
    }
    selected() {
      let rs = this.records();
      if (this.s.record === "__whole" && rs.length) return this.whole(rs);
      return rs.find((r) => r.id === this.s.record) || rs[0];
    }
    // “整份材料”：把当前材料的各段按原顺序合并；每段的身份保留在 parts 里，段与段之间以空行分隔。
    whole(rs = this.records()) {
      const first = rs[0], last = rs.at(-1);
      return { ...first, id: (this.s.source === "all" ? "全部" : first.source) + "·整份", text: rs.map((r) => r.text).join("\n\n"), locator: rs.length > 1 ? `${first.locator} 至 ${last.locator}（${rs.length}段合并）` : first.locator, verification: [...new Set(rs.map((r) => r.verification || "待核"))].join("；"), parts: rs };
    }
    selection() {
      const ss = this.sources(), rs = this.records();
      return `<div class="selection-bar" role="group" aria-label="材料与片段"><label><span>材料</span><select data-k="source"><option value="all" ${this.s.source === "all" ? "selected" : ""}>本页可用全部材料</option>${ss.map((m) => `<option value="${E(m.id)}" ${m.id === this.s.source ? "selected" : ""}>${E(m.author || "待查")} · ${E(m.title)}</option>`).join("")}</select></label><label><span>片段</span><select data-k="record"><option value="__whole" ${this.s.record === "__whole" ? "selected" : ""}>整份材料（${rs.length}段合并）</option>${rs.map((r) => `<option value="${E(r.id)}" ${r.id === this.s.record ? "selected" : ""}>${E(r.id + " " + r.locator)}</option>`).join("")}</select></label><small>共${rs.length}段</small><span class="sel-tools"><label class="mini-btn" title="选择本机 project.json、通用项目 ZIP 或第四周完整课程备份 ZIP">导入本机材料<input class="visually-hidden" data-import="1" type="file" accept=".json,.zip"></label><button class="mini-btn" data-do="importer" title="在新窗口打开通用导入页">通用导入页 ↗</button></span></div>`;
    }
    flow(cols) {
      let html = D.flowShell({ ...this.page, steps: cols.map((c) => c[0]) }, cols.map(([title, body, why]) => ({ title, body, why })), { active: +this.s.step });
      return html.replace(/<span class="([^"]*)">(\d+) · ([\s\S]*?)<\/span>/g, (m, c, n, t) => `<button data-rail="${+n - 1}" class="${c}" aria-pressed="${+n - 1 === +this.s.step}">${n} · ${t}</button>`);
    }
    chapter(compact = false) {
      const C = CH()[this.id];
      if (!C) return "";
      const tab = Math.min(+this.s.tab || 0, C.stages.length - 1), st = C.stages[tab], sub = st.subs[+this.s.sub] || st.subs[0];
      const q = (t) => /^[“"]/.test(t) ? E(t) : `<q>${E(t)}</q>`;
      const paper = (p) => p ? `<div class="w5-paper"><p class="en">“${E(p.en)}”</p><p class="zh">${E(p.zh)}</p><cite>${E(p.cite)}</cite></div>` : "";
      return `<div class="w5-chapter${compact ? " compact" : ""}">${compact ? "" : `<p class="w5-lead">${E(C.lead)}</p>`}<div class="w5-rail" role="tablist" aria-label="阶段">${C.stages.map((x, i) => `<button data-stage="${i}" role="tab" aria-selected="${i === tab}" class="w5-node${i === tab ? " is-active" : ""}"><span class="w5-dot"></span><small>${E(x.tag)}</small><b>${E(x.name)}</b>${compact ? "" : `<span>${E(x.short)}</span>`}</button>`).join("")}</div><section class="w5-stage"><div class="w5-stage-quotes${st.paper ? "" : " single"}">${st.paper ? `<div class="w5-src"><h4>论文／综述</h4>${paper(st.paper)}${st.paper.note ? `<p class="w5-note"><b>注</b>${E(st.paper.note)}</p>` : ""}</div>` : ""}<div class="w5-src lecture"><h4>讲义</h4><blockquote class="w5-quote">${q(st.quote)}<cite>${E(st.cite)}</cite></blockquote></div></div>${st.subs.length > 1 ? `<nav class="w5-subs" aria-label="小阶段">${st.subs.map((x, j) => `<button data-sub="${j}" class="${x === sub ? "on" : ""}" aria-pressed="${x === sub}">${E(x.name)}</button>`).join("")}</nav>` : ""}<article class="w5-card"><h3>${E(sub.name)}</h3><dl>${sub.paper ? `<dt>原文</dt><dd>${paper(sub.paper)}</dd><dt>注释</dt><dd class="w5-note">${E(sub.paper.note || "")}</dd>` : ""}<dt>讲义</dt><dd>${q(sub.quote)}<cite>${E(sub.cite)}</cite></dd><dt>本讲例子</dt><dd>${E(sub.example)}</dd><dt>说明</dt><dd>${E(sub.explain)}</dd></dl>${pageLinks(sub.links)}</article></section></div>`;
    }
    sentenceInput() {
      return this.s.passage || this.records().filter(r => !r.verification?.includes("待逐字")).map(r => r.text).join("\n\n");
    }
    sentenceRows() {
      return S.A.sentences(this.sentenceInput()).slice(0, this.s.scope);
    }
    knownVectors(sentences) {
      if (this.vectors && JSON.stringify(this.vectors.texts) === JSON.stringify(sentences.map((s) => s.text))) return this.vectors.vectors;
      let known = new Map(S.prepared.results.flatMap((r) => r.sentences.map((s, i) => [s.text, r.vectors[i]])));
      return sentences.every((s) => known.has(s.text)) ? sentences.map((s) => known.get(s.text)) : null;
    }
    contextPlan() {
      const s = this.s, selected = this.selected(), target = selected?.parts && new Set(selected.parts.map(r => r.source)).size > 1 ? null : selected;
      const rs = this.records().filter(r => r.source === target?.source), i = rs.findIndex((x) => x.id === target?.id), k = s.context === "metadata" || s.context === "api" ? 0 : +(s.nb ?? 1);
      const before = i < 0 ? [] : rs.slice(Math.max(0, i - k), i), after = i < 0 ? [] : rs.slice(i + 1, i + 1 + k), source = this.sources().find((m) => m.id === target?.source) || {};
      const fields = s.metaFields || ["author", "title", "edition", "locator"], value = { author: target?.author, title: target?.title, edition: source.edition, locator: target?.locator };
      const composed = s.context === "metadata" ? fields.map((f) => value[f]).filter(Boolean).join("；") + "\n" + (target?.text || "") : s.context === "neighbors" ? [...before, target, ...after].filter(Boolean).map((x) => x.text).join("\n") : null;
      // 上下文化检索原法把全文与片段一起交给模型；全文过长时只取目标前后若干段（上限约 6000 字），并在页面上写明。
      let whole = rs.filter((x) => x.source === target?.source);
      const limit = 6000, total = whole.reduce((n, x) => n + [...x.text].length, 0);
      if (total > limit && i >= 0) {
        let lo = i, hi = i, chars = [...whole[i].text].length;
        while (chars < limit && (lo > 0 || hi < whole.length - 1)) {
          if (hi < whole.length - 1) { hi++; chars += [...whole[hi].text].length; }
          if (lo > 0 && chars < limit) { lo--; chars += [...whole[lo].text].length; }
        }
        whole = whole.slice(lo, hi + 1);
      }
      const wholeChars = whole.reduce((n, x) => n + [...x.text].length, 0), windowed = wholeChars < total;
      const prompt = "下面是整份材料，各段以[片段ID]开头。之后会给出其中一个需要放进全文语境的片段。请用一两句简短的中文说明：这一片段在全文中处于什么位置、承接什么、在讲什么，以便改进检索。只输出这一两句说明，不复述原文，不评价。目标片段：" + (target?.id || "");
      return { target, before, after, window: [...before, target, ...after].filter(Boolean), fields, composed, whole, wholeChars, totalChars: total, windowed, prompt };
    }
    cslOf(b) {
      const c = { type: b.type || "chapter", title: b.title || undefined, author: b.author ? [{ literal: b.author }] : undefined, "container-title": b.container || undefined, publisher: b.edition || undefined, "original-date": b.origin ? { literal: b.origin } : undefined, page: b.page || undefined, note: [b.basis && "底本：" + b.basis, b.access && "获取：" + b.access, b.pdfPage && "PDF页序：" + b.pdfPage, b.status && "核读：" + b.status, b.note].filter(Boolean).join("；") || undefined };
      return JSON.parse(JSON.stringify(c));
    }
    // ---------- D24 德教贯穿：同一导入包，七个阶段 ----------
    d24Scope() {
      const ss = this.sources(), s = this.s;
      if (Array.isArray(s.d24scope)) return ss.filter((m) => s.d24scope.includes(m.id) && (s.allowTeacher || m.kind !== "教师研究产物"));
      return ss.filter((m) => m.kind === "史料");
    }
    d24Units() {
      const s = this.s, scope = this.d24Scope(), size = +(s.unitSize || 300), key = scope.map((m) => m.id).join(",") + "|" + size + "|" + S.corpus.revision();
      if (this.unitCache?.key === key) return this.unitCache.units;
      const units = [];
      for (const m of scope) for (const r of S.corpus.records().filter((x) => x.source === m.id)) {
        const cs = M.chunks(r.text, "recursive", size, 0, ["\n\n", "\n", "。", " ", ""]);
        cs.forEach((c, k) => units.push({ ...r, id: cs.length > 1 ? r.id + "~" + (k + 1) : r.id, parentId: r.id, text: c.text, locator: r.locator + (cs.length > 1 ? `；切分字符[${c.start},${c.end})` : ""), kind: m.kind }));
      }
      this.unitCache = { key, units };
      return units;
    }
    d24() {
      const s = this.s, ss = this.sources(), stage = Math.min(+s.through || 0, 6), tab = s.d24tab || "work", kinds = {};
      ss.forEach((m) => (kinds[m.kind || "课程材料"] = (kinds[m.kind || "课程材料"] || 0) + 1));
      const runs4 = S.corpus.projects().flatMap((p) => p.events || []).filter((e) => e.week04Run);
      const body = tab === "reader" ? this.d24Reader() : tab === "record" ? this.d24Record() : [() => this.d24Identity(), () => this.d24Units_(), () => this.d24Retrieve(), () => this.d24Graph(), () => this.d24Compare(runs4), () => this.d24Verify(), () => this.d24Backup()][stage]();
      const r = this.d24res, kept = this.d24Kept(), graded = Object.values(s.d24grades || {}).filter((g) => g && g.weight != null).length;
      const progress = [["本轮范围", this.d24Scope().length + " 份"], ["检索单元", this.d24Units().length + " 个"], ["BM25", r?.bm25 ? r.bm25.length + " 个命中" : "未做"], ["现场嵌入", r?.dense ? r.dense.length + " 个单元" : "未做"], ["保留单元", kept.length + " 个"], ["模型候选", this.d24answer ? "已生成" : "无"], ["已定级句子", graded + " 句"]];
      const reader = this.d24ReaderTarget();
      return `<div class="d24w"><section class="d24w-main"><nav class="d24w-tabs" role="tablist"><button data-set="d24tab" data-v="work" class="${tab === "work" ? "on" : ""}" role="tab" aria-selected="${tab === "work"}">工作区：${stage + 1} ${E(D24_STAGES[stage][0])}</button><button data-set="d24tab" data-v="reader" class="${tab === "reader" ? "on" : ""}" role="tab" aria-selected="${tab === "reader"}">原件与正文${reader ? "：" + E(reader.title.slice(0, 14)) : ""}</button><button data-set="d24tab" data-v="record" class="${tab === "record" ? "on" : ""}" role="tab" aria-selected="${tab === "record"}">本轮判断记录 ↓</button></nav><div class="d24w-body">${body}</div><footer class="d24w-foot">D24 · 第五周德教贯穿：同一导入包接续第四周的题录、正文块与阅读记录；材料只在本机浏览器。</footer></section><aside class="d24w-side"><h3>德教研究：用同一库走完检索与核读</h3><label class="d24w-q"><span>问题起点</span><textarea data-k="question" rows="3" placeholder="不同材料怎样使用“德教／徳教／德敎”？哪些用法可比较，哪些尚缺依据？">${E(s.question ?? "")}</textarea></label><div class="d24w-stages">${D24_STAGES.map((x, i) => `<button data-set="through" data-v="${i}" class="${i === stage ? "on" : ""}" aria-pressed="${i === stage}"><b>${i + 1}</b>${E(x[0])}</button>`).join("")}</div><p class="d24w-hint">${E(D24_HINTS[stage])}</p><section class="d24w-sum"><h4>已导入材料</h4><p class="kind-chips">${Object.entries(kinds).map(([k, v]) => `<span class="kind-${E(k)}">${E(k)} <b>${v}</b></span>`).join("")}</p><p class="caption">${S.corpus.records().filter((x) => x.private).length} 个正文块 · 第四周阅读 ${runs4.length} 轮</p></section><section class="d24w-sum"><h4>本轮进度</h4><dl class="d24w-progress">${progress.map(([k, v]) => `<dt>${E(k)}</dt><dd>${E(v)}</dd>`).join("")}</dl></section><div class="d24w-export"><button class="mini-btn" data-do="export">导出本轮判断</button><button class="mini-btn" data-do="backup">完整备份</button></div></aside></div>`;
    }
    d24ReaderTarget() {
      const id = this.s.d24src;
      return id ? this.sources().find((m) => m.id === id) : null;
    }
    d24Reader() {
      const m = this.d24ReaderTarget();
      if (!m) return `<p class="note-box">在“材料身份”表中点一条题名，或在检索结果中点一个单元，这里显示它的题录字段与第四周正文块。</p>`;
      const recs = S.corpus.records().filter((r) => r.source === m.id), focus = this.s.d24unit;
      return `<div class="d24-reader"><header><h3>${E(m.title)}</h3><p>${E(m.author || "待查")} · ${E(m.edition || "待查")} · ${E(m.kind || "课程材料")}</p></header>${table(["字段", "值"], [["题录来源", E(m.acquisition || "")], ["第四周题录", E(m.week04?.itemId || "—")], ["原件", m.attachments?.length ? m.attachments.map((a) => E(a.name) + "（" + (a.pages || "?") + "页）").join("；") : "无（工作稿附注）"], ["正文块", recs.length + " 个"]])}<ol class="d24-blocks">${recs.map((r) => `<li class="${focus && focus.startsWith(r.id) ? "focus" : ""}"><small>${E(r.id)} · ${E(r.locator)} · ${E(r.verification || "")}</small><p>${E(r.text.slice(0, 420))}${r.text.length > 420 ? "…" : ""}</p><button class="mini-btn" data-reader="${E(r.id)}">打开原页</button></li>`).join("")}</ol></div>`;
    }
    d24Record() {
      const s = this.s, r = this.d24res, kept = this.d24Kept(), lines = (s.d24answer ?? this.d24answer?.output ?? "").split("\n").map((x) => x.trim()).filter(Boolean), x = M.support(lines.map((_, i) => (s.d24grades || {})[i] || { cite: "", weight: 0 }));
      return `<div class="d24-record">${area("report", s.report, "本轮判断：已读范围、判断、缺口与下一步", 6)}${table(["环节", "本轮实际"], [["问题", E(s.question || "（未填）")], ["范围", E(this.d24Scope().map((m) => m.title).join("；"))], ["检索问题", E(r?.query || "—")], ["保留单元", E(kept.map((u) => u.id).join("、") || "—")], ["自己的判断", E(s.manual || "—")], ["模型候选", E(this.d24answer ? (this.d24answer.model || "") + "，" + (this.d24answer.output || "").slice(0, 80) + "…" : "—")], ["逐句核读", lines.length ? `P_w ${x.cited ? number(x.P) : "—"}，R_w ${number(x.R)}（${lines.length}句）` : "—"]])}<p class="caption">“导出本轮判断”保存上表与全部设置；“完整备份”另含导入的原件与正文。</p></div>`;
    }
    d24Identity() {
      const s = this.s, scope = new Set(this.d24Scope().map((m) => m.id)), f = s.d24kind || "全部", q = (s.d24q || "").trim().toLowerCase();
      const n = (m) => S.corpus.records().filter((r) => r.source === m.id).length;
      const rows = this.sources().filter((m) => (f === "全部" || (m.kind || "课程材料") === f) && (!q || [m.title, m.author, m.edition].join(" ").toLowerCase().includes(q)));
      const year = (m) => String(m.date || m.edition || "").match(/(1[89]\d\d|20\d\d)/)?.[1] || "—";
      const order = ["史料", "二手文献", "课程材料", "教师研究产物"];
      rows.sort((a, b) => order.indexOf(a.kind || "课程材料") - order.indexOf(b.kind || "课程材料") || year(a).localeCompare(year(b)));
      return `<div class="lib-toolbar"><nav class="seg-btns">${["全部", "史料", "二手文献", "课程材料", "教师研究产物"].map((k) => `<button data-set="d24kind" data-v="${k}" class="${f === k ? "on" : ""}">${k}</button>`).join("")}</nav><input data-k="d24q" value="${E(s.d24q || "")}" placeholder="筛选题名／作者／出处"><label class="lib-teacher"><input type="checkbox" data-k="allowTeacher" ${s.allowTeacher ? "checked" : ""}>教师研究产物进入检索（默认关闭）</label></div><div class="table-scroll lib-table"><table class="kv"><thead><tr><th>本轮</th><th>性质</th><th>年份</th><th>作者</th><th>题名</th><th>出处／版本</th><th>文本块</th><th>原件</th></tr></thead><tbody>${rows.map((m) => { const teacher = m.kind === "教师研究产物" && !s.allowTeacher; return `<tr class="${scope.has(m.id) ? "in" : ""}${teacher ? " muted" : ""}"><td><input type="checkbox" data-scope="${E(m.id)}" ${scope.has(m.id) ? "checked" : ""} ${teacher ? "disabled title=\"对照，不进检索\"" : ""}></td><td><span class="kind-tag kind-${E(m.kind || "课程材料")}">${E(m.kind || "课程材料")}</span></td><td>${E(year(m))}</td><td>${E(m.author || "待查")}</td><td><button class="link-btn" data-d24src="${E(m.id)}" title="${E(m.title)}">${E(m.title)}</button></td><td>${E(m.edition || "待查")}</td><td>${n(m)}</td><td>${m.attachments?.length ? "PDF" : "—"}</td></tr>`; }).join("")}</tbody></table></div><p class="caption">${rows.length} 条 · 本轮 ${scope.size} 份。勾选进入本轮检索的材料；点题名在“原件与正文”中查看第四周正文块。教师研究产物只作对照，以免模型读了结论再“发现”结论。</p>`;
    }
    d24Units_() {
      const s = this.s, units = this.d24Units(), lens = units.map((u) => [...u.text].length), blocks = new Set(units.map((u) => u.parentId)).size;
      return `<p>第四周的文本块平均较长，超过 MiniLM 的 512 词元窗口；这里在不改原块编号的前提下，把每块按“空行→换行→句号→空格→逐字”递归细分为检索单元，单元编号为“原块~序号”。</p>${slider("unitSize", +(s.unitSize || 300), "检索单元上限（字）", 120, 480, 20)}${table(["项目", "数值"], [["本轮材料", this.d24Scope().length + "份"], ["第四周原块", blocks + "个"], ["检索单元", units.length + "个"], ["单元字数", units.length ? `平均${Math.round(lens.reduce((a, b) => a + b, 0) / units.length)}，最长${Math.max(...lens)}` : "—"]])}<h4>前12个单元</h4>${table(["单元", "定位", "开头"], units.slice(0, 12).map((u) => [E(u.id), E(u.locator), E(u.text.slice(0, 40)) + "…"]))}`;
    }
    d24Retrieve() {
      const s = this.s, r = this.d24res;
      const list = (rows, label, key) => `<div class="rank-col"><h4>${E(label)}</h4><table class="kv rank-table"><thead><tr><th>#</th><th>${key === "cos" ? "余弦" : "BM25"}</th><th>题名 · 定位 · 开头</th></tr></thead><tbody>${rows.slice(0, 15).map((x, i) => `<tr data-d24unit="${E(x.id)}" title="在“原件与正文”中查看"><td>${i + 1}</td><td>${number(x[key])}</td><td><b>${E(x.title)}</b><br><small>${E(x.locator)}</small><br>${E(x.text.slice(0, 60))}…</td></tr>`).join("")}</tbody></table></div>`;
      return `<p>两步：先用 BM25 在本轮全部检索单元上“找得全”，再只对 BM25 前 N 个单元现场做 MiniLM 嵌入，按余弦“排得准”（讲义 2.3）。</p><div class="inline-form">${input("query", s.query, "检索问题")}${slider("topN", +(s.topN || 40), "现场嵌入的单元数 N", 10, 120, 10)}<button data-do="d24-bm25">① BM25 检索全部单元</button><button data-do="d24-dense" ${r?.bm25 ? "" : "disabled"}>② 对前 N 个现场嵌入重排</button></div>${r?.bm25 ? `${r.legacy ? '<p class="caption">旧备份接回的是原次实际输入；以下BM25为恢复时重算，原次向量分数未保存。</p>' : ""}<p class="note-box">BM25：${r.total}个单元，${r.bm25.length}个有得分，用时${number(r.bm25Seconds)}秒。${r.dense ? `嵌入：实际编码 ${r.dense.length} 个单元（来自 ${new Set(r.dense.map((x) => x.source)).size} 份材料：${E([...new Set(r.dense.map((x) => x.title))].join("、"))}），用时 ${number(r.denseSeconds)} 秒。其余 ${r.total - r.dense.length} 个单元没有参与语义排序。` : "尚未嵌入。"}</p><div class="rank-compare">${list(r.bm25, "BM25", "score")}${r.dense ? list(r.dense, "BM25 前N → 余弦重排", "cos") : ""}</div>` : ""}`;
    }
    d24Kept() {
      const r = this.d24res;
      if (!r || r.stamp !== this.d24Stamp()) return [];
      const valid = new Set(this.d24Scope().map(m => m.id));
      return (r.restoredKept || r.dense || r.bm25 || []).filter(u => valid.has(u.source)).slice(0, +(this.s.budget || 6));
    }
    d24Graph() {
      const s = this.s, kept = this.d24Kept();
      if (!kept.length) return `<p class="note-box">先在第3阶段检索；图只建在检索保留的单元上。</p>`;
      const terms = (s.d24terms ?? "德教\n徳教\n天皇\n國體\n教育勅語\n忠孝").split(/[\n,，]/).map((t) => t.trim()).filter(Boolean), g = S.A.graphFrom(kept, terms);
      return `<div class="entity-workspace"><aside>${slider("budget", +(s.budget || 6), "保留单元数", 2, 20)}${area("d24terms", s.d24terms ?? "德教\n徳教\n天皇\n國體\n教育勅語\n忠孝", "在保留单元中查找的称呼与概念（每行一个，可改）", 7)}<p class="caption">共现只说明同一单元里同时出现，不证明关系。默认词项仅为起点，请按材料改写。</p></aside><main>${this.graphSVG(g)}${table(["节点", "出处单元"], g.nodes.map((n) => [E(n.id), E(n.sources.join("、"))]))}</main></div>`;
    }
    d24Compare(runs4) {
      const s = this.s, kept = this.d24Kept(), out = this.d24answer, srcOf = (itemId) => this.sources().find((m) => m.week04?.itemId === itemId);
      return `<p>接续第四周的阅读记录：先看已做过的轮次，再开新一轮——<b>先独立阅读写下判断，再看机器候选</b>。</p>${runs4.length ? table(["第四周轮次", "任务", "所读题录", "时间"], runs4.map((e, i) => [i + 1, E(e.week04Run?.task || e.detail || ""), E(srcOf(e.week04Run?.itemId)?.title || "—"), E((e.time || "").slice(0, 16).replace("T", " "))])) : "<p>导入包里没有第四周阅读轮次。</p>"}<div class="d24-two"><section>${area("manual", s.manual, "新一轮：自己的判断（先写，才能发送）", 6)}${this.cloudChoice()}<button data-do="d24-read" ${kept.length && (s.manual || "").trim() ? "" : "disabled"}>写好自己的判断后，发送给模型</button></section><section><h4>本轮交给模型的 ${kept.length} 个单元</h4>${kept.length ? `<ol class="kept-list">${kept.map((u) => `<li data-d24unit="${E(u.id)}" title="${E(u.id)}"><b>${E(u.title)}</b> <small>${E(u.locator)}</small></li>`).join("")}</ol>` : '<p class="note-box">先在第3阶段检索。</p>'}</section></div>${out ? `<article class="reading-candidate"><h3>模型候选 <small>${E(out.model || "")}</small></h3><pre>${E(out.output)}</pre></article>` : ""}`;
    }
    d24Verify() {
      const s = this.s, kept = this.d24Kept(), text = s.d24answer ?? this.d24answer?.output ?? "", lines = text.split("\n").map((x) => x.trim()).filter(Boolean), grades = s.d24grades || {};
      const rows = lines.map((_, i) => grades[i] || { cite: "", weight: 0 }), x = M.support(rows);
      const all = S.corpus.records();
      return `${area("d24answer", text, "要核读的回答（每行一句；默认取上一阶段的模型候选）", 5)}${lines.map((t, i) => { const g = grades[i] || {}, unit = kept.find((u) => u.id === g.cite), rec = all.find((r) => r.id === (unit?.parentId || g.cite)); return `<article class="grade-line"><p>${E(t)}</p><label>引文<select data-d24cite="${i}"><option value="">无引文</option>${kept.map((u, k) => `<option value="${E(u.id)}" ${g.cite === u.id ? "selected" : ""}>${k + 1}. ${E(u.title.slice(0, 18))} · ${E(u.locator.slice(0, 18))}</option>`).join("")}</select></label>${[[1, "完全支持"], [0.5, "部分支持"], [0, "不支持"]].map(([w, l]) => `<button data-do="d24-grade" data-v="${i}|${w}" class="${g.weight === w ? "on" : ""}">${l}</button>`).join("")}${rec ? `<p class="caption">回到第四周原页：${E(rec.uri || rec.locator)} <button data-reader="${E(rec.id)}">打开原页</button></p>` : ""}</article>`; }).join("")}${table(["比例", "代入", "数值"], [["P_w", `${x.sum}/${x.cited}`, x.cited ? number(x.P) : "—"], ["R_w", `${x.sum}/${x.sentences}`, x.sentences ? number(x.R) : "—"]])}`;
    }
    d24Backup() {
      return `<p>完整备份包含：导入的项目（题录、正文块与第四周定位）、原件 PDF、第五周各页的实际运行记录与页面设置。可在另一台电脑或第六周课件中恢复，继续接着做。</p><button data-do="backup">下载第五周完整备份</button><label class="file-chip">恢复备份<input data-restore="1" type="file" accept=".zip"></label><button data-do="export">只导出本轮判断（JSON）</button><p class="caption">备份只在本机生成与保存；含教师材料，请勿上传公共位置。</p>`;
    }
    plannedRecords() {
      const hits = S.sparse(this.s.query, this.records());
      return (hits.length ? hits : this.records()).slice(0, Math.max(1, +this.s.budget));
    }
    frozen() { return this.result?.session?.records || this.plannedRecords(); }
    loadEtexts() {
      if (this.etextLoading) return;
      this.etextLoading = true;
      const strip = (t) => t.split("\n").filter((l) => l.trim() && !(l.length < 40 && /[页段]/.test(l))).join("\n");
      Promise.all(["shide", "acton", "ogai"].map((k) => fetch(new URL("assets/materials/" + k + ".txt", document.baseURI)).then((r) => r.text()).then((t) => [k, strip(t)]))).then((x) => {
        this.etexts = Object.fromEntries(x);
        this.render();
      }).catch((e) => {
        this.message = "电子文本读取失败：" + e.message;
        this.render();
      });
    }
    // 在电子文本里找与扫描段最相近的连续若干句（字二元组杰卡德最大），作为对照的另一版本。
    bestWindow(text, etext) {
      const ss = S.A.sentences(etext);
      let best = { J: -1 };
      const sep = /[A-Za-z]/.test(etext) ? " " : "";
      for (let i = 0; i < ss.length; i++) for (let k = 1; k <= 40 && i + k <= ss.length; k++) {
        const t = ss.slice(i, i + k).map((x) => x.text).join(sep), J = M.similarity(text, t, 2).J;
        if (J > best.J) best = { J, text: t, from: i + 1, to: i + k };
      }
      return best.text ? best : null;
    }
    semantic(sent, vec, mode) {
      let s = this.s, dist = vec ? S.A.boundaries(vec, s.theta) : null, theta = s.theta, groups = [];
      if (!dist) return { dist, theta, groups };
      if (s.threshold !== "absolute") {
        let ds = dist.map((x) => x.distance).sort((a, b) => a - b), q = (p) => ds[Math.min(ds.length - 1, Math.floor(p * ds.length))] || 0;
        if (s.threshold === "percentile") theta = q(0.8);
        if (s.threshold === "std") {
          let mu = ds.reduce((a, b) => a + b, 0) / ds.length;
          theta = mu + Math.sqrt(ds.reduce((a, b) => a + (b - mu) ** 2, 0) / ds.length);
        }
        if (s.threshold === "iqr") theta = q(0.75) + 1.5 * (q(0.75) - q(0.25));
        dist = S.A.boundaries(vec, theta);
      }
      if (mode === "breakpoint") {
        groups = [[0]];
        dist.forEach((d, i) => {
          if (d.cut) groups.push([]);
          groups.at(-1).push(i + 1);
        });
      }
      if (mode === "single") groups = S.A.clusters(vec, s.k, s.lambda);
      if (mode === "dbscan") groups = S.A.dbscan(vec, s.eps, s.minPoints, s.lambda).groups;
      if (mode === "fixed") groups = sent.reduce((a, _, i) => ((a[Math.floor(i / s.k)] ??= []).push(i), a), []);
      return { dist, theta, groups };
    }
    distanceChart(dist, theta) {
      const W = 520, H = 150, pad = 24, n = dist.length, x = (i) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1), max = Math.max(0.6, ...dist.map((d) => d.distance)), y = (v) => H - pad - (v / max) * (H - 2 * pad);
      return `<svg class="dist-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="相邻句距离折线"><line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#9aa9b8"/>${theta != null ? `<line x1="${pad}" y1="${y(theta)}" x2="${W - pad}" y2="${y(theta)}" stroke="#b0413e" stroke-dasharray="5 4"/><text x="${W - pad}" y="${y(theta) - 4}" text-anchor="end" font-size="11" fill="#b0413e">θ=${number(theta)}</text>` : ""}<polyline fill="none" stroke="#1d5ca9" stroke-width="2" points="${dist.map((d, i) => x(i) + "," + y(d.distance)).join(" ")}"/>${dist.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.distance)}" r="4" fill="${theta != null && d.distance > theta ? "#b0413e" : "#1d5ca9"}"><title>${d.i + 1}→${d.i + 2}：${number(d.distance)}</title></circle><text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#5b6e85">${d.i + 1}|${d.i + 2}</text>`).join("")}</svg>`;
    }
    graphSVG(g) {
      const W = 900, H = 510, n = g.nodes.length, pos = new Map(g.nodes.map((x, i) => [x.id, [W / 2 + Math.cos(2 * Math.PI * i / Math.max(1, n)) * 320, H / 2 + Math.sin(2 * Math.PI * i / Math.max(1, n)) * 195]]));
      return `<div class="graph-surface"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="可放大、节点可回查的当前关系图"><g transform="translate(${W / 2 * (1 - this.s.zoom)},${H / 2 * (1 - this.s.zoom)}) scale(${this.s.zoom})">${g.edges.map((e) => {
        let a = pos.get(e.source), b = pos.get(e.target);
        return a && b ? `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#9aadc0" stroke-width="${Math.min(4, e.weight || 1)}"/>` : "";
      }).join("")}${g.nodes.map((n2) => {
        let [x, y] = pos.get(n2.id);
        return `<g data-node="${E(n2.id)}" tabindex="0" role="button" aria-label="${E(n2.id)}"><circle cx="${x}" cy="${y}" r="29" fill="${this.selectedNode === n2.id ? "#ecce83" : "#eef5fc"}" stroke="#1a5ca9"/><text x="${x}" y="${y + 46}" text-anchor="middle" font-size="13">${E(n2.id)}</text></g>`;
      }).join("")}</g></svg></div>`;
    }
    currentGraph() {
      let records = this.records(), terms = this.s.terms.split(/[\n,，]/).map((t) => t.trim()).filter(Boolean), g = S.A.graphFrom(records, terms);
      const authors = [...new Set(records.map((r) => r.author).filter(Boolean))];
      for (let a of authors) if (!g.nodes.some((n) => n.id === a)) g.nodes.push({ id: a, sources: records.filter((r) => r.author === a).map((r) => r.id), kind: "题录责任者" });
      let aliases = Object.fromEntries(this.s.aliases.split("\n").filter((l) => l.includes("=>")).map((l) => l.split("=>").map((x) => x.trim())));
      const canon = (n) => this.s.entityRule === "alias" ? aliases[n] || n : this.s.entityRule === "edit" ? g.nodes.map((x) => x.id).find((x) => x < n && M.editTable(x, n).at(-1).at(-1) <= 1) || n : n;
      let nodes = new Map();
      for (let n of g.nodes) {
        let id = canon(n.id);
        if (!nodes.has(id)) nodes.set(id, { ...n, id, aliases: [], sources: [] });
        let x = nodes.get(id);
        x.sources = [...new Set([...x.sources, ...n.sources])];
        if (id !== n.id) x.aliases.push(n.id);
      }
      g.nodes = [...nodes.values()];
      g.edges = g.edges.map((e) => ({ ...e, source: canon(e.source), target: canon(e.target) })).filter((e) => e.source !== e.target);
      return g;
    }
    render() {
      if (!this.ready) return;
      this.sanitizeGrades();
      if (this.id === "D24" && this.d24res && this.d24res.stamp !== this.d24Stamp()) this.invalidateD24(true);
      let s = this.s, r = this.selected(), rs = this.records(), html = "", sel = this.selection();
      if (this.id === "D24" && !rs.length) {
        this.innerHTML = `<div class="d24w"><section class="d24w-main"><nav class="d24w-tabs"><button class="on">工作区：先导入德教包</button></nav><div class="d24w-body"><div class="d24-empty"><h2>德教全量：在本机导入</h2><p>课件不预装德教原文、教师稿或研究结果。请选择第四周导出的<b>完整课程备份 ZIP</b>（含 patchouli.zip 与 reading-records.json），或通用项目的 project.json／ZIP。材料只写入本机浏览器，不上传。</p><p><label class="file-chip primary">选择德教包<input class="visually-hidden" data-import="1" type="file" accept=".json,.zip"></label></p><p class="d24-empty-more"><button class="mini-btn" data-do="importer">改用通用导入页 ↗</button><label class="mini-btn">恢复第五周完整备份<input class="visually-hidden" data-restore="1" type="file" accept=".zip"></label></p><p role="status">${E(this.message)}</p></div></div><footer class="d24w-foot">D24 · 第五周德教贯穿；导入后七个阶段依次可用。</footer></section><aside class="d24w-side"><h3>德教研究：用同一库走完检索与核读</h3><p class="d24w-hint">问题起点：不同材料怎样使用“德教／徳教／德敎”？哪些用法可比较，哪些尚缺依据？</p><div class="d24w-stages">${D24_STAGES.map((x, i) => `<button disabled><b>${i + 1}</b>${E(x[0])}</button>`).join("")}</div><p class="d24w-hint">先在左侧导入德教包。</p></aside></div>`;
        return;
      }
      switch (this.id) {
        case "D01":
        case "D02":
          html = this.chapter();
          break;
        case "D03": {
          const F = BIB_FIELDS, cur = s.bib || {}, list = s.bibList || [];
          const field = ([k, l, hint, q]) => `<label class="bib-field q${q}"><span>${E(l)}</span><input data-bib="${k}" value="${E(cur[k] ?? "")}" placeholder="${E(hint)}"></label>`;
          const csl = this.cslOf(cur);
          html = sel + `<div class="bib-lab"><form class="bib-form" onsubmit="return false"><div class="bib-head"><label class="bib-field"><span>条目类型</span><select data-bib="type">${[["book", "图书"], ["chapter", "图书章节／篇"], ["article-journal", "期刊文章"], ["speech", "演讲"], ["webpage", "网页／电子文本"]].map(([k, l]) => `<option value="${k}" ${cur.type === k ? "selected" : ""}>${l}</option>`).join("")}</select></label><button data-do="bib-fill">从所选材料带入已知字段</button><button data-do="bib-clear">清空</button></div><div class="bib-grid">${F.map(field).join("")}</div><div class="bib-actions"><button data-do="bib-save">记入本页题录表</button><button data-do="bib-export">下载 CSL JSON</button><span class="caption">查不到的写“待查”；只存在本机浏览器。</span></div></form><aside class="bib-side"><h3>定位三问</h3><p class="q1"><b>是谁</b>　责任者、题名、条目类型</p><p class="q2"><b>在哪</b>　所用版本、底本、电子文本或扫描来源</p><p class="q3"><b>读到哪</b>　印刷页、PDF 页序、核读状态</p><h4>CSL JSON 预览</h4><pre class="trace">${E(JSON.stringify(csl, null, 2))}</pre></aside></div>${list.length ? `<h3>本页题录表（${list.length}条）</h3>` + table(["题名", "责任者", "所用版本", "印刷页", "PDF页序", "核读", ""], list.map((x, i) => [E(x.title), E(x.author), E(x.edition), E(x.page), E(x.pdfPage), E(x.status), `<button data-do="bib-load" data-v="${i}">载入</button>`])) : ""}`;
          break;
        }
        case "D04": {
          let text = s.passage || r?.text || "";
          const METHODS = [["fixed", "固定长度", "字符数"], ["sentence", "按句", "句末标点"], ["paragraph", "按段", "换行"], ["recursive", "递归", "空行→换行→空格→逐字"]];
          const run = (m) => M.chunks(text, m, s.size, m === "fixed" ? s.overlap : 0);
          const levelName = (c) => ({ "\n\n": "空行（段界）", "\n": "换行", " ": "空格", "字符": "逐字（无可用分隔符）", "完整单位": "整体未超长", "句": "句末标点", "段": "换行（段界）" })[c.level] || c.level;
          const chunks = run(s.method), lens = chunks.map((c) => [...c.text].length);
          const rows = chunks.map((c, i) => [String(i + 1), E(levelName(c)), `[${c.start}, ${c.end})`, String(lens[i]), i && chunks[i - 1].end > c.start ? String(chunks[i - 1].end - c.start) : "0", `<span class="chunk-text">${E(c.text)}</span>`]);
          const focus = +(s.chunkFocus ?? -1);
          const chars = [...text], starts = chunks.map((c) => c.start);
          let rib = "", seg = -1;
          chars.forEach((ch, i) => {
            while (seg + 1 < starts.length && starts[seg + 1] <= i) { seg++; if (i > 0) rib += `<i class="cut" title="切点：字符${i}">✂</i>`; }
            const cls = `seg${seg % 2}${seg === focus ? " focus" : ""}`;
            rib += ch === "\n" ? (chars[i + 1] === "\n" ? "" : `<span class="nl">¶</span>`) : `<span class="${cls}">${E(ch)}</span>`;
          });
          const counts = Object.fromEntries(METHODS.map(([m]) => [m, run(m).length]));
          const rowsH = chunks.map((c, i) => `<tr data-chunk="${i}" class="${i === focus ? "focus" : ""}"><td>${i + 1}</td><td>${E(levelName(c))}</td><td>[${c.start}, ${c.end})</td><td>${lens[i]}</td><td>${i && chunks[i - 1].end > c.start ? chunks[i - 1].end - c.start : 0}</td><td class="chunk-text">${E(c.text)}</td></tr>`).join("");
          const cur = METHODS.find((x) => x[0] === s.method);
          html = sel + `<div class="chunk-lab2"><aside class="chunk-controls">${slider("size", s.size, "块大小上限（字符）", 30, 600, 10)}${slider("overlap", s.overlap, "重叠（只用于固定长度）", 0, 100, 5)}<table class="kv mini"><thead><tr><th>切法</th><th>块数</th></tr></thead><tbody>${METHODS.map(([m, l]) => `<tr class="${m === s.method ? "on" : ""}"><td>${E(l)}</td><td>${counts[m]}</td></tr>`).join("")}</tbody></table><details><summary>修改实际文本</summary>${area("passage", text, "清空则恢复所选材料", 6)}</details><p class="caption">偏移按 Unicode 字符计；按句、按段不受块大小限制。</p></aside><section class="chunk-main"><nav class="chunk-tabs" role="tablist">${METHODS.map(([m, l, basis]) => `<button role="tab" data-set="method" data-v="${m}" aria-selected="${m === s.method}" class="${m === s.method ? "on" : ""}">${E(l)}<small>${counts[m]}块 · ${E(basis)}</small></button>`).join("")}</nav><p class="chunk-sum"><b>${E(cur[1])}</b>：${chunks.length}块，平均${chunks.length ? Math.round(lens.reduce((a2, b2) => a2 + b2, 0) / chunks.length) : 0}字，最长${Math.max(0, ...lens)}字。${E(r?.locator || "")}</p><div class="chunk-two"><section class="ribbon-pane"><h3>切点落在哪里</h3><p class="ribbon">${rib}</p><p class="caption">✂ 为切点，底色交替表示相邻两块；点右表一行，左侧对应块加框。</p></section><section class="table-pane"><h3>结构化片段表</h3><div class="table-scroll"><table class="kv chunk-table2"><thead><tr><th>块</th><th>切法依据</th><th>字符范围</th><th>字数</th><th>重叠</th><th>实际文本</th></tr></thead><tbody>${rowsH}</tbody></table></div></section></div></section></div>`;
          break;
        }
        case "D06": {
          let sent = this.sentenceRows(), vec = this.knownVectors(sent), sem = this.semantic(sent, vec, s.semantic), { dist, theta, groups } = sem;
          const seg = (k, v, items) => `<div class="seg-btns" role="radiogroup">${items.map(([id, l]) => `<button data-set="${k}" data-v="${E(id)}" role="radio" aria-checked="${String(id) === String(v)}" class="${String(id) === String(v) ? "on" : ""}">${E(l)}</button>`).join("")}</div>`;
          const SEM = { breakpoint: "嵌入断点", single: "位置＋语义单链接聚类", dbscan: "DBSCAN", fixed: "固定句数基线" };
          const opts = s.semantic === "breakpoint" ? `<fieldset class="ctl-sub"><legend>阈值怎样定 <small>（嵌入断点的选项）</small></legend>${seg("threshold", s.threshold, [["absolute", "绝对值"], ["percentile", "80%分位"], ["std", "均值＋标准差"], ["iqr", "IQR"]])}${s.threshold === "absolute" ? slider("theta", s.theta, "θ", 0, 1, 0.01) : `<p class="caption">按全部距离自动算出 θ=${number(theta)}</p>`}</fieldset>` : `<fieldset class="ctl-sub"><legend>参数 <small>（${E(SEM[s.semantic])}的选项）</small></legend>${["single", "fixed"].includes(s.semantic) ? slider("k", s.k, s.semantic === "fixed" ? "每块句数" : "簇数", 1, 6) : ""}${["single", "dbscan"].includes(s.semantic) ? slider("lambda", s.lambda, "位置距离权重 λ", 0, 1, 0.05) : ""}${s.semantic === "dbscan" ? slider("eps", s.eps, "邻域 ε", 0.1, 0.9, 0.05) + slider("minPoints", s.minPoints, "最少邻居（含自身）", 1, 5) : ""}</fieldset>`;
          const controls = `<div class="ctl-compact">${slider("scope", s.scope, "实际句数", 3, 16)}<fieldset class="ctl-main"><legend>切分做法</legend>${seg("semantic", s.semantic, Object.entries(SEM))}</fieldset>${opts}<button class="mini-btn" data-do="encode">${vec ? "浏览器内重新编码" : "浏览器内实际编码"}</button></div>`;
          const body = sel + this.flow([["输入与实现", controls], ["每句的实际情况", table(["句", "原文", "字符范围", "向量前4维"], sent.map((t, i) => [i + 1, E(t.text), `[${t.start},${t.end})`, vec ? vec[i].slice(0, 4).map(number).join(",") + " …" : "待编码"]))], ["相邻句距离", dist ? this.distanceChart(dist, s.semantic === "breakpoint" ? theta : null) + table(["句界", "d=1−cos", s.semantic === "breakpoint" ? "切断（θ=" + number(theta) + "）" : "（聚类不按阈值切）"], dist.map((d) => [`${d.i + 1}→${d.i + 2}`, number(d.distance), s.semantic === "breakpoint" ? (d.cut ? "是" : "否") : "—"])) + `<p class="caption">聚类距离：λ|i−j|/n+(1−λ)(1−max(cos,0))。</p>` : `<p class="note-box">当前文本没有预跑向量。点“浏览器内实际编码”，在本机下载并运行 MiniLM 后显示每一句的距离；下载进度也可在顶栏“模型接入”中查看。</p>`], ["实际切分结果", groups.length ? groups.map((g, i) => `<article class="chunk"><small>块${i + 1}：句${g.map((x) => x + 1).join("、")}</small>${E(g.map((x) => sent[x].text).join(""))}</article>`).join("") + `<p class="caption">${E(this.vectors ? "向量为本页刚才在浏览器内实际编码" : "向量为课前实际预计算（同一模型、同一修订）")}；${E(S.embedding.model)}，q8，384维。</p>` : "<p>编码后显示。</p>"]]);
          const overview = () => {
            const text = [...this.sentenceInput()].slice(0, sent.at(-1)?.end || 0).join(""), rowsOut = [];
            for (const [m, l] of [["fixed", "固定长度"], ["sentence", "按句"], ["paragraph", "按段"], ["recursive", "递归"]]) {
              const cs = M.chunks(text, m, s.size || 120, m === "fixed" ? 20 : 0), ls = cs.map((c) => [...c.text].length);
              rowsOut.push([E(l), "结构／长度", cs.length, Math.round(ls.reduce((a2, b2) => a2 + b2, 0) / Math.max(1, cs.length)), cs.slice(1).map((c) => c.start).join("、") || "—"]);
            }
            for (const [m, l] of [["breakpoint", "嵌入断点"], ["single", "单链接聚类"], ["dbscan", "DBSCAN"], ["fixed", "固定句数基线"]]) {
              const g = this.semantic(sent, vec, m).groups;
              if (!vec) { rowsOut.push([E(l), "嵌入", "待编码", "—", "—"]); continue; }
              const starts = g.map((x) => Math.min(...x)).sort((a2, b2) => a2 - b2), ls = g.map((x) => x.reduce((n, i) => n + [...sent[i].text].length, 0));
              const contiguous = g.every((x) => x.length === 1 + Math.max(...x) - Math.min(...x));
              rowsOut.push([E(l), "嵌入" + (contiguous ? "" : "（块内句子不相邻）"), g.length, Math.round(ls.reduce((a2, b2) => a2 + b2, 0) / Math.max(1, g.length)), starts.slice(1).map((i) => sent[i].start).join("、") || "—"]);
            }
            return `<div class="overview-lab"><p>同一份材料（${E(this.records()[0]?.author || "")}，前${sent.length}句，共${[...text].length}字）按八种做法实际切分。切点以字符偏移表示；结构切法块大小上限${s.size || 120}字，固定长度重叠20字；嵌入切法用当前参数（θ=${number(theta)}，k=${s.k}，λ=${s.lambda}，ε=${s.eps}）。</p>${table(["做法", "依据", "块数", "平均块长（字）", "切点位置（字符）"], rowsOut)}<p class="caption">${vec ? "嵌入向量来自" + (this.vectors ? "本页浏览器内实际编码" : "课前本机实际预计算") : "嵌入四行需先编码"}。按句、按段、递归的实际块表见 ${D.pageLink("D04", "D04 →")}；嵌入断点的逐句距离见“史料实际试跑”。</p></div>`;
          };
          const fig = (src, alt, cap) => `<figure><a href="${src}" target="_blank" rel="noopener" title="新窗口打开原图"><img src="${src}" alt="${E(alt)}" loading="eager" onerror="this.closest('figure').classList.add('img-failed')"></a><p class="img-fallback">图片未能加载。<a href="${src}" target="_blank" rel="noopener">直接打开图片</a>，或到 <a href="https://arxiv.org/abs/2410.13070" target="_blank" rel="noopener">arXiv:2410.13070</a> 查看原文。</p><figcaption>${cap}</figcaption></figure>`;
          html = tabs("view", s.view, [["run", "史料实际试跑"], ["overview", "八种做法总览"], ["paper", "论文原图与结果"]]) + (s.view === "paper" ? `<div class="paper-figs big">${fig("assets/revision/figures/chunking-fig1.png", "Qu等论文Figure 1", "Qu、Tu、Bao，“Is Semantic Chunking Worth the Computational Cost?”，arXiv:2410.13070，Figure 1：固定句数、断点式与聚类式三种切法示意（论文原图；点击放大）。")}${fig("assets/revision/figures/chunking-table1.png", "Qu等论文Table 1", "同文 Table 1。讲义 1.2：语义切分明显占优的是人为拼接的数据（如 Miracl，F1@5 由 69.45 升到 81.89）；原本就是长文档时固定切分略好（HotpotQA 90.59 对 87.37）。全部为英文数据，嵌入模型以 stella_en_1.5B_v5 为主。")}<blockquote>“these benefits were highly context-dependent and did not consistently justify the additional computational cost”（这些好处高度依赖具体情境，并不能稳定地抵得上额外的计算成本）。——Qu 等 2024，摘要</blockquote></div>` : s.view === "overview" ? sel + overview() : body);
          break;
        }
        case "D08": {
          const plan = this.contextPlan(), res = this.result?.method === s.context ? this.result : null, node = +(s.flowNode || 0);
          const METHOD = { metadata: "加材料与定位", neighbors: "加相邻原文", api: "模型补写上下文（上下文化检索）", late: "整窗口编码后按片段池化（后期切分）" };
          const opts = s.context === "metadata" ? `<fieldset class="mini-check"><legend>前置哪些字段</legend>${[["author", "作者"], ["title", "题名"], ["edition", "所用版本"], ["locator", "定位"]].map(([k, l]) => `<label><input type="checkbox" data-meta="${k}" ${plan.fields.includes(k) ? "checked" : ""}>${l}</label>`).join("")}</fieldset>` : s.context === "api" ? this.cloudChoice() : slider("nb", s.nb ?? 1, s.context === "late" ? "窗口：前后各取几段" : "前后各补几段", 0, 3);
          const doc = [
            ["输入原文", `<p><b>${E(plan.target?.id)}</b> ${E(plan.target?.author)}《${E(plan.target?.title)}》${E(plan.target?.locator)}</p><blockquote>${E(plan.target?.text)}</blockquote>${plan.before.length + plan.after.length ? `<p>相邻原文：${[...plan.before, ...plan.after].map((x) => E(x.id)).join("、")}（同一材料、显示顺序前后）</p>` : ""}`],
            ["补写／编码", `<p><b>${E(METHOD[s.context])}</b></p>` + (s.context === "metadata" ? `<p>把所选字段按“；”连成一行，放在片段原文之前，再整体编码。</p>` : s.context === "neighbors" ? `<p>把前后相邻的原文按显示顺序接在一起，作为一个更大的检索单位编码；补入部分仍保留各自片段 ID。</p>` : s.context === "api" ? `<p>让所配置的生成模型同时读整份材料和这一片段，写一两句说明，拼在片段之前再编码（据 Anthropic“Introducing Contextual Retrieval”，2024-09-19）。</p><p class="caption">本次发送 ${plan.wholeChars} 字（${plan.whole.length} 段）${plan.windowed ? `；全文 ${plan.totalChars} 字过长，只取目标前后约 6000 字` : "；即整份材料"}。等待时间主要来自：模型读这些字并逐字生成（启用流式，状态栏实时显示）；首次还要下载约 118 MB 的 MiniLM 再编码。同一片段、同一设置再次执行时复用上次补写，不重复调用。</p>${res?.timing ? `<p class="caption">本次用时：${res.timing.cached ? "补写复用上次结果" : `模型 ${number(res.timing.generate || 0)} 秒（首字 ${number(res.timing.firstToken || 0)} 秒）`}；编码 ${number(res.timing.encode || 0)} 秒。</p>` : ""}<pre class="trace">${E(plan.prompt)}</pre>` : `<p>把窗口内各段一次送入 MiniLM，取每个词元带上下文的向量，再只对目标片段的词元求平均（据 Günther 等，arXiv:2409.04701 的思路；MiniLM 窗口仅 512 词元，不是论文长上下文模型的复现）。</p>`) + (res?.late ? table(["段", "词元范围"], res.late.ranges.map((x, i) => [E(plan.window[i]?.id), `[${x.start},${x.end})`])) : "")],
            ["片段与表示", res?.example ? `<p>已跑好的补写（未在本页编码）：</p><blockquote>${E(res.composed)}</blockquote><p class="caption">要比较向量与余弦，请配置模型后点“执行当前方法”。</p>` : res ? `<p>实际进入编码的文本：</p><blockquote>${E(res.composed || plan.target?.text)}</blockquote>${table(["表示", "向量前5维"], [["原片段单独编码", res.plain.slice(0, 5).map(number).join(",") + " …"], [E(METHOD[s.context]), res.ctx.slice(0, 5).map(number).join(",") + " …"]])}` : `<p>拟编码文本（执行后显示实际向量）：</p><blockquote>${E(plan.composed ?? plan.target?.text)}</blockquote>`],
            ["查询与原页", `${input("query", s.query, "检索问题")}${res && !res.example ? table(["比较", "余弦"], [["问题 · 原片段", number(res.cosPlain)], ["问题 · " + E(METHOD[s.context]), number(res.cosCtx)]]) + `<p class="caption">两项都是本次在浏览器内实际计算；余弦只表示向量更近，不表示依据更可靠。</p>` : "<p>执行后在这里对照：同一问题与“原片段”“加上下文后”的余弦。</p>"}<p>引用仍回到原片段：${E(plan.target?.locator)}；核读状态：${E(plan.target?.verification || "待核")}。</p>${plan.target ? `<button data-reader="${E(plan.target.id)}">打开原页</button>` : ""}`],
          ];
          html = sel + `<div class="context-lab"><div class="context-controls">${tabs("context", s.context, Object.entries(METHOD).map(([k, v]) => [k, v]))}${opts}<button data-do="context">执行当前方法</button>${s.context === "api" ? '<button data-do="load-context-example">载入已跑好的补写</button>' : ""}<button data-do="play-process">${this.timer ? "停止" : "动态走处理过程"}</button><button data-do="export">保存本次处理记录</button></div><article class="md-doc" aria-label="处理记录">${doc.map(([h, body], i) => `<section class="${i === node ? "md-glow" : ""}"><h2>## ${i + 1} ${E(h)}</h2>${body}</section>`).join("")}</article><aside class="md-diagram"><p class="caption">点击节点，定位处理记录中的对应部分</p>${doc.map(([h], i) => `<button data-flow="${i}" class="flow-node${i === node ? " on" : ""}" aria-pressed="${i === node}"><small>0${i + 1}</small>${E(h)}</button>${i < doc.length - 1 ? '<span class="flow-arrow">↓</span>' : ""}`).join("")}${res?.example ? '<p class="caption">当前为 2026-10-13 已跑好的真实补写记录。</p>' : ""}</aside></div>`;
          break;
        }
        case "D09": {
          const PRESET = { shide: "章學誠對著史者提出了什麼要求？這一要求針對的是什麼？", acton: "阿克顿认为批评者遇到一条有意思的陈述，要做哪几步检查？", ogai: "森鴎外不愿随意改动史料，这一表态针对的是什么？" };
          const all = this.records(), needed = all.filter((x) => s.used.includes(x.id));
          let pos = 0;
          const spans = all.map((x) => { const st = pos; pos += [...x.text].length + 2; return { id: x.id, start: st, end: st + [...x.text].length }; });
          const text = all.map((x) => x.text).join("\n\n");
          const layout = (m) => {
            const cs = M.chunks(text, m, s.size || 120, 0);
            const rows = cs.map((c, i) => {
              const parts = spans.filter((sp) => s.used.includes(sp.id) && sp.start < c.end && sp.end > c.start).map((sp) => sp.start >= c.start && sp.end <= c.end ? E(sp.id) : `<span class="split">${E(sp.id)}（被拆开）</span>`);
              return parts.length ? [i + 1, `[${c.start},${c.end})`, parts.join("、")] : null;
            }).filter(Boolean);
            const split = spans.filter((sp) => s.used.includes(sp.id) && !cs.some((c) => sp.start >= c.start && sp.end <= c.end)).length;
            return { cs, rows, split };
          };
          const fixed = layout("fixed"), para = layout("paragraph");
          const verdict = (x, l) => needed.length ? `<p class="verdict"><b>${l}</b>：全文切成${x.cs.length}块；所选${needed.length}个必要片段落在${x.rows.length}块中${x.split ? `，其中${x.split}个被拆到两块以上` : ""}。${x.rows.length > 1 ? "没有一块能单独支持回答。" : "一块即可覆盖。"}</p>` : "";
          html = sel + this.flow([["具体问题", `${PRESET[s.source] ? `<button data-do="preset-question">用本材料的预设问题</button>` : ""}${area("query", s.query, "需查依据的问题", 3)}<p class="caption">在下面勾选回答所必需的最少片段。</p>${all.map((x) => `<label class="evidence-choice"><input data-use="${E(x.id)}" type="checkbox" ${s.used.includes(x.id) ? "checked" : ""}><b>${E(x.id)}</b> ${E(x.text.slice(0, 40))}…</label>`).join("")}`], ["必要片段原文", needed.map(quote).join("") || "<p>勾选必要片段后，在这里并列实际原文。</p>"], ["两种切分下落在哪几块", slider("size", s.size || 120, "固定长度块大小（字符）", 40, 400, 10) + verdict(fixed, "固定长度") + (fixed.rows.length ? table(["块", "字符范围", "含必要片段"], fixed.rows) : "") + verdict(para, "按自然段") + (para.rows.length ? table(["块", "字符范围", "含必要片段"], para.rows) : "") + `<p class="caption">整份材料各段以空行相接后切分；“按自然段”以所用版本的显示分段为界。</p>`], ["能支持到哪里", area("report", s.report, "分别写出：对象、定义、要求，以及尚缺的语境", 7) + "<p>丢掉其中任何一段，回答会怎样改变？支持程度由人工核读；同一出处不算多个独立支持。</p>"]]);
          break;
        }
        case "D10": {
          const res = this.result?.rows ? this.result : null;
          html = `<div class="chapter-split">${this.chapter(true)}<section class="live-panel"><h3>实际计算：同一查询，换一种表示</h3>${sel}${tabs("representation", s.representation, [["bow", "词袋"], ["tfidf", "TF-IDF"], ["bm25", "BM25"], ["dense", "多语句向量"]])}<div class="inline-form">${input("query", s.query, "查询")}<button data-do="representation">实际计算并排序</button></div>${res ? `<p class="caption">${E(res.mode)}；${res.rows.length}段参与排序${res.seconds ? "；用时" + number(res.seconds) + "秒" : ""}。</p>` + table(["名次", "片段", "得分", s.representation === "dense" ? "原文开头" : "贡献词"], res.rows.slice(0, 10).map((r2, i) => [i + 1, E(r2.id), number(r2.score), E(r2.terms ? r2.terms.filter((x) => x.count).map((x) => `${x.term}:${number(x.value)}`).join("；") : r2.text.slice(0, 30) + "…")])) : '<p class="note-box">选择一种表示后点“实际计算”。词袋、TF-IDF、BM25 在浏览器内即时计算；多语句向量首次需下载 MiniLM 模型。</p>'}</section></div>`;
          break;
        }
        case "D11": {
          let text = s.passage || r?.text || "", q = s.query, normalize = window.OpenCC.Converter({ from: "t", to: "cn" }), a = s.norm ? normalize(q) : q, b = s.norm ? normalize(text) : text, result = M.similarity(a, b, s.unit === "bigram" ? 2 : 1);
          html = sel + this.flow([["拆成集合", `<div class="preset-row"><button data-do="preset-jaccard" data-v="simp">讲义原例：简体查询</button><button data-do="preset-jaccard" data-v="trad">讲义原例：繁体查询</button></div>` + area("passage", text, "实际史料片段（可改）", 4) + input("query", q, "查询") + tabs("unit", s.unit, [["char", "单字"], ["bigram", "字二元组"]])], ["规范值与原值", tabs("norm", s.norm, [["", "保留原值"], ["1", "OpenCC t2s"]]) + table(["原值", "比较值"], [[E(q), E(a)], [E(text.slice(0, 70)), E(b.slice(0, 70))]])], ["实际交并集", table(["集合", "元素"], [["A", E(result.A.join(" "))], ["B", E(result.B.join(" "))], ["交集", E(result.inter.join(" "))], ["并集", E(result.union.join(" "))]])], ["公式与计算", table(["系数", "代入", "数值"], [["J", `${result.i}/${result.u}`, number(result.J)], ["Dice", `${2 * result.i}/${result.a + result.b}`, number(result.D)], ["O", `${result.i}/${Math.min(result.a, result.b)}`, number(result.O)]]) + `<p>所有片段可换成新导入史料。规范值用于比较，引用保留原值。</p>`]]);
          break;
        }
        case "D12": {
          let x = S.A.editSteps(s.a, s.b), limit = Math.min(+s.edit, x.steps.length), path = x.path.slice(0, Math.min(+s.edit, x.path.length)), current = s.editMode === "path" ? path.at(-1) : x.steps[limit - 1], effect = S.A.applyEdits(s.a, path);
          const onPath = new Set(path.map((p2) => p2.i + "," + p2.j)), cur = s.editMode === "fill" ? current : null;
          const role = (i, j) => !cur ? "" : i === cur.i && j === cur.j ? "edit-current" : i === cur.i - 1 && j === cur.j ? "src-del" : i === cur.i && j === cur.j - 1 ? "src-ins" : i === cur.i - 1 && j === cur.j - 1 ? "src-sub" : "";
          const cell = (v, i, j) => i && j && (i - 1) * x.B.length + j > limit && s.editMode === "fill" ? '<span class="uncomputed">·</span>' : `<span class="${role(i, j)}${s.editMode === "path" && onPath.has(i + "," + j) ? " on-path" : ""}">${v}</span>`;
          const PRESETS = [["森鴎外", "森鷗外", "日文新旧字体"], ["心术", "心術", "简繁"], ["Acton", "Lord Acton", "称号"], ["劉氏子元", "劉知幾", "字与名"]];
          html = `<div class="edit-toolbar"><div class="preset-row">${PRESETS.map(([a2, b2, l]) => `<button data-do="preset-edit" data-v="${E(a2 + "|" + b2)}" class="${s.a === a2 && s.b === b2 ? "on" : ""}">${E(a2)} → ${E(b2)}<small>${E(l)}</small></button>`).join("")}</div>${input("a", s.a, "源字符串")}${input("b", s.b, "目标字符串")}${tabs("editMode", s.editMode, [["fill", "动态填表"], ["path", "执行最短编辑路径"]])}${slider("edit", s.edit, "进度", 0, s.editMode === "fill" ? x.steps.length : x.path.length)}<button data-do="edit-next">下一步</button><button data-do="edit-play">${this.timer ? "暂停" : "播放"}</button></div><div class="edit-workspace"><div>${table(["", "∅", ...x.B], x.d.map((row, i) => [E(x.A[i - 1] || "∅"), ...row.map((v, j) => cell(v, i, j))]))}${cur ? '<p class="caption"><span class="src-del">上</span> 删除来源　<span class="src-ins">左</span> 插入来源　<span class="src-sub">左上</span> 改写来源　<span class="edit-current">当前格</span></p>' : ""}</div><aside><h3>当前编辑与公式</h3>${s.editMode === "fill" && cur ? `<p>比较 a<sub>${cur.i}</sub>=${E(cur.a)} 与 b<sub>${cur.j}</sub>=${E(cur.b)}：${cur.a === cur.b ? "相同，改写不计" : "不同，改写记 1"}</p>${table(["来源格", "操作", "值"], [[`<span class="src-del">d(${cur.i - 1},${cur.j})</span>`, "删去 " + E(cur.a), `${cur.options[0] - 1} + 1 = ${cur.options[0]}`], [`<span class="src-ins">d(${cur.i},${cur.j - 1})</span>`, "插入 " + E(cur.b), `${cur.options[1] - 1} + 1 = ${cur.options[1]}`], [`<span class="src-sub">d(${cur.i - 1},${cur.j - 1})</span>`, cur.a === cur.b ? "保持" : "改写 " + E(cur.a) + "→" + E(cur.b), `${cur.options[2] - (cur.a === cur.b ? 0 : 1)} + ${cur.a === cur.b ? 0 : 1} = ${cur.options[2]}`]])}<p class="formula">d(${cur.i},${cur.j}) = min(${cur.options.join(", ")}) = ${cur.value}</p><p>对应前缀：${E(x.A.slice(0, cur.i).join(""))} → ${E(x.B.slice(0, cur.j).join(""))}</p>` : s.editMode === "path" ? `<p class="edit-effect">${E(effect.text || "∅")}</p><p>已执行${path.filter((p2) => p2.operation !== "保持").length}次编辑；表中蓝框为已走过的路径。</p>` + table(["步骤", "操作", "原字", "目标字"], path.map((p2, i) => [i + 1, p2.operation, E(p2.from || "∅"), E(p2.to || "∅")])) : `<p>起点：d(i,0)=i，d(0,j)=j。按“下一步”从左上角逐格计算到右下角。</p><p class="formula">d(i,j)=min{ d(i−1,j)+1, d(i,j−1)+1, d(i−1,j−1)+[aᵢ≠bⱼ] }</p>`}<p>全程最小编辑次数 = <b>${x.d.at(-1).at(-1)}</b></p></aside></div>`;
          break;
        }
        case "D13": {
          const hyps = s.hyps || [], res = this.result?.base ? this.result : null;
          const list = (rows, other, label) => `<div class="rank-col"><h4>${E(label)}</h4>${rows.map((r2, i) => `<p class="${other.has(r2.id) ? "" : "only"}"><b>${i + 1}. ${E(r2.id)}</b> ${number(r2.score)}${other.has(r2.id) ? "" : " <em>仅此侧</em>"}<br><small>${E(r2.text.slice(0, 46))}…</small></p>`).join("")}</div>`;
          html = sel + this.flow([["研究问题", area("query", s.query, "原查询（现代汉语提问）", 3) + `<p class="caption">HyDE 只把问题交给生成模型，让它写“像是答案”的文字；不把库内原文交给它。</p><button data-do="hyde-generate">用 API 生成候选（四种文体各两条）</button><button data-do="load-hyde-example">载入已跑好的三语候选</button>`], ["选择或自行输入", (hyps.length ? `<div class="hyp-list">${hyps.map((h, i) => `<button data-set="hypIndex" data-v="${i}" class="${+s.hypIndex === i ? "on" : ""}"><small>${E(h.language || "候选")}${h.angle ? " · " + E(h.angle) : ""}</small>${E(h.text.slice(0, 34))}…</button>`).join("")}</div>` : "") + area("hypothesis", s.hypothesis, "假想文档（可直接打字或修改）", 7) + `<p class="caption">假想文档只作检索线索，用完即弃，不能进入引文位置。</p>`], ["原查询与 HyDE 的检索结果", slider("budget", s.budget, "各取前几段", 1, 8) + `<button data-do="hyde-retrieve">编码并在真实片段上检索</button>` + (res ? `<div class="rank-compare">${list(res.base, new Set(res.hyde.map((x) => x.id)), "原查询直接编码")}${list(res.hyde, new Set(res.base.map((x) => x.id)), "假想文档编码")}</div><p class="caption">${E(res.mode)}；两列都只列库内原文。</p>` : "<p>编码后左右对照：原查询与假想文档各自取回哪几段，哪些只出现在一侧。</p>")], ["依据与运行记录", (res?.hyde?.[0] ? quote(res.hyde[0]) : "") + (this.result?.run ? JSONblock({ model: this.result.run.model, input: this.result.run.input, sourceIds: this.result.run.sourceIds }) : "<p>生成与编码记录分开保存；最后引用必须回到库内真实史料。</p>")]]);
          break;
        }
        case "D14": {
          const PAIRS = { shide: ["S1", "维基文库电子文本（录入者标点）"], acton: ["A2", "Project Gutenberg #25720（据同一1911年重印本录入）"], ogai: ["M1", "青空文库（底本：第三书馆《ザ・鴎外》1985年初版、1992年第二刷）"] };
          const all = S.corpus.records(), etext = this.etexts?.[s.pair];
          let a, b, bLabel, bVersion;
          if (s.pair === "custom") {
            const rs2 = this.records();
            a = rs2.find((x) => x.id === s.docA) || rs2[0];
            b = rs2.find((x) => x.id === s.docB) || rs2[1] || a;
            bLabel = b?.id;
            bVersion = this.sources().find((m) => m.id === b?.source)?.edition;
          } else {
            a = all.find((x) => x.id === PAIRS[s.pair][0]);
            if (!etext) this.loadEtexts();
            const win = etext ? this.bestWindow(a.text, etext) : null;
            b = win ? { id: s.pair + "-etext", text: win.text, locator: "电子文本第" + win.from + "—" + win.to + "句（自动对齐）", verification: "公开电子文本；分段与标点按该本", source: s.pair } : null;
            bLabel = PAIRS[s.pair][1];
            bVersion = PAIRS[s.pair][1];
          }
          const h = a && b ? M.minhash(a.text, b.text, s.permutations) : null, th = +(s.dupThreshold ?? 0.9);
          const strip = (t) => [...t.replace(/[\p{P}\p{Z}\s\[\]0-9]/gu, "")].slice(0, 220).join("");
          const diff = a && b ? S.A.editSteps(strip(a.text), strip(b.text)).path.filter((x) => x.operation !== "保持") : [];
          html = `<nav class="revision-tabs">${[["shide", "《史德》：影印本 ↔ 维基文库"], ["acton", "阿克顿：1911重印本 ↔ Gutenberg"], ["ogai", "森鴎外：筑摩1964 ↔ 青空文库"], ["custom", "自选两段"]].map(([k, l]) => `<button data-set="pair" data-v="${k}" class="${s.pair === k ? "on" : ""}">${E(l)}</button>`).join("")}</nav>` + (s.pair === "custom" ? sel : "") + this.flow([["两个版本的文本", s.pair === "custom" ? `<label>候选A<select data-k="docA">${this.records().map((r2) => `<option value="${r2.id}" ${a?.id === r2.id ? "selected" : ""}>${E(r2.id + " " + r2.text.slice(0, 24))}</option>`).join("")}</select></label><label>候选B<select data-k="docB">${this.records().map((r2) => `<option value="${r2.id}" ${b?.id === r2.id ? "selected" : ""}>${E(r2.id + " " + r2.text.slice(0, 24))}</option>`).join("")}</select></label>` + (a ? quote(a) + quote(b) : "") : (a ? quote(a) : "") + (b ? `<article class="source-excerpt"><small>${E(bLabel)} · ${E(b.locator)}</small><p>${E(b.text)}</p></article>` : "<p>正在读取电子文本…</p>")], ["MinHash 实际计算", h ? slider("permutations", s.permutations, "随机排列次数", 16, 256, 16) + table(["排列", "A最小", "B最小", "相同"], h.pairs.slice(0, 10).map((x, i) => [i + 1, E(x.a), E(x.b), x.hit ? "是" : "否"])) + `<p>字二元组精确 J = <b>${number(h.exact)}</b>；最小哈希估计 = ${h.hits}/${h.count} = ${number(h.estimate)}</p>` : ""], ["两本差在哪里", diff.length ? `<p>去掉标点、空白与页码标记后，前220字内的逐字差异（编辑距离路径）：共${diff.length}处</p>` + table(["操作", "A", "B"], diff.slice(0, 24).map((x) => [x.operation, E(x.from || "∅"), E(x.to || "∅")])) : "<p>两段去标点后逐字相同。</p>"], ["去重之前先看版本", slider("dupThreshold", th, "近似重复阈值（Manning 等例为0.9）", 0.5, 1, 0.01) + (h ? `<p class="verdict ${h.exact >= th ? "dup" : ""}">按阈值，机器${h.exact >= th ? "会把两段判为近似重复，只留一段" : "不会把两段当作重复"}。</p>` : "") + table(["", "A", "B"], [["版本", E(this.sources().find((m) => m.id === a?.source)?.edition || all.length && S.corpus.sources().find((m) => m.id === a?.source)?.edition), E(bVersion)], ["定位", E(a?.locator), E(b?.locator)], ["核读", E(a?.verification), E(b?.verification)]]) + tabs("decision", s.decision || "", [["keep", "两版都保留（差异是研究对象）"], ["merge", "合并为一条，注明另一版本"], ["drop", "删去副本"]]) + area("report", s.report, "写下决定的理由", 3)]]);
          break;
        }
        case "D15":
          html = sel + this.flow([["材料与查询", input("query", s.query, "检索词") + `<button data-do="retrieve">实际BM25检索</button>`], ["实际取回", this.result?.retrieved ? table(["ID", "得分", "来源"], this.result.retrieved.map((r2) => [E(r2.id), number(r2.score), E(r2.locator)])) : "<p>先执行检索。</p>"], ["实际进入", slider("budget", s.budget, "上下文片段预算", 1, 8) + (this.result?.retrieved || []).slice(0, s.budget).map(quote).join("")], ["人工记录使用", (this.result?.retrieved || []).slice(0, s.budget).map((r2) => `<label><input type="checkbox" data-use="${r2.id}" ${s.used.includes(r2.id) ? "checked" : ""}> ${E(r2.id)}作为回答依据</label>`).join("") + area("answer", s.answer, "回答与所用引用ID", 4)]]);
          break;
        case "D16":
          html = sel + this.flow([["拆成句子", `<div class="preset-row"><button data-do="preset-support" data-v="lecture">讲义示例（教学构造，含讲义判断）</button><button data-do="preset-support" data-v="wrong">导入错例</button></div>` + area("answer", s.answer || s.claim, "回答，每行一句", 6)], ["并列所引原文", (() => { const ids = [...new Set(Object.values(s.grades).map((g) => g?.cite).filter(Boolean))]; return ids.length ? ids.map((id) => rs.find((r2) => r2.id === id)).filter(Boolean).map(quote).join("") : "<p>为句子选定引文后，这里并列所引原文。</p>"; })()], ["人工三级判定", (s.answer || s.claim).split("\n").filter(Boolean).map((t, i) => `<article class="grade-line"><p>${E(t)}</p><label>引文<select data-cite="${i}"><option value="">无引文</option>${rs.map((r2) => `<option value="${r2.id}" ${s.grades[i]?.cite === r2.id ? "selected" : ""}>${E(r2.id)}</option>`).join("")}</select></label>${tabs("grade" + i, s.grades[i]?.weight || 0, [[1, "完全支持"], [0.5, "部分支持"], [0, "不支持"]])}</article>`).join("")], ["计算两个比例", (() => {
            let rows = (s.answer || s.claim).split("\n").filter(Boolean).map((_, i) => s.grades[i] || { cite: "", weight: 0 }), x = M.support(rows);
            return table(["比例", "代入", "数值"], [["P_w", `${x.sum}/${x.cited}`, x.cited ? number(x.P) : "—（没有带引文的句子，0/0 无定义）"], ["R_w", `${x.sum}/${x.sentences}`, x.sentences ? number(x.R) : "—"]]) + "<p>无引文句记0；分级是人工核读，不由相似度自动判断。</p>";
          })()]]);
          break;
        case "D17":
          html = sel + `<p class="lab-quote">${E(s.claim)}</p><div class="lab-grid-cards">${S.corpus.sources().filter((m) => !m.private).map((m) => `<article class="lab-card"><h3>${E(m.author)}</h3>${m.paragraphs.slice(0, 2).map((p) => quote({ ...p, source: m.id, author: m.author })).join("")}</article>`).join("")}</div>`;
          break;
        case "D18":
          html = `<div class="chapter-split">${this.chapter(true)}<section class="live-panel">${this.graphBody(sel, false)}</section></div>`;
          break;
        case "D19": {
          let g = this.currentGraph();
          html = sel + `<div class="entity-workspace"><aside><h3>候选称呼与规则</h3>${area("terms", s.terms, "史料中查找的词项／称呼", 8)}${tabs("entityRule", s.entityRule, [["exact", "精确"], ["edit", "距离≤1"], ["alias", "人工异称"]])}${area("aliases", s.aliases, "原称呼=>首选名；空白不归并", 5)}${slider("zoom", s.zoom, "图放大", 0.7, 2.5, 0.1)}<button data-do="graph-fullscreen">单独放大关系图</button></aside><main>${this.graphSVG(g)}${table(["节点", "异称", "出处片段"], g.nodes.map((n) => [E(n.id), E((n.aliases || []).join("、")), E(n.sources.join("、"))]))}<p>当前${g.nodes.length}节点、${g.edges.length}共现边；题录责任者另作元数据节点。选择节点可核读实际片段。</p>${g.nodes.find((n) => n.id === this.selectedNode)?.sources.map((id) => S.corpus.records().find((r2) => r2.id === id)).filter(Boolean).slice(0, 3).map(quote).join("") || ""}</main></div>`;
          break;
        }
        case "D20": {
          html = tabs("strategy", s.strategy, [["GraphRAG", "GraphRAG"], ["LightRAG", "LightRAG"], ["LazyGraphRAG", "LazyGraphRAG"]]) + `<div class="strategy-layout"><div class="strategy-left">${this.strategyIntro()}${this.strategyPipeline()}</div><div class="strategy-right">${this.graphBody(sel, true)}</div></div>`;
          break;
        }
        case "D21": {
          const tab = +s.tab || 0;
          html = `<div class="chapter-split d21">${this.chapter(true)}<section class="live-panel">${tab === 0 ? this.blackboardBody(sel) : tab === 1 ? this.antBody(sel) : this.problemsBody()}</section></div>`;
          break;
        }
        case "D22":
          html = this.readingBody(sel);
          break;
        case "D23":
          html = '<div class="conclusion"><h2>论从史出</h2><p>切分决定机器取回哪一层原文，相似度决定哪些片段排在前面，上下文预算决定哪些进入回答；最后，每一句仍由我们回到依据核读。</p><p>有引用与论从史出之间，隔着本讲讨论的每一步。</p><p>下一讲往前追一步：这些电子文本怎样从原页被识读出来？</p></div>';
          break;
        case "D24":
          html = this.d24();
          break;
        case "D25":
          html = this.glossary();
          break;
      }
      D.rerender(this, `${this.busy ? '<div class="busy-banner">正在实际处理，请等待本轮完成。</div>' : ""}${html}<p class="revision-status" role="status">${E(this.message)}</p>`);
      this.querySelectorAll("[data-use]").forEach((el) => el.onchange = () => {
        let id = el.dataset.use;
        this.s.used = el.checked ? [...new Set([...this.s.used, id])] : this.s.used.filter((x) => x !== id);
        this.save();
      });
      this.querySelectorAll("[data-scope]").forEach((el) => el.onchange = () => {
        const cur = new Set(this.d24Scope().map((m) => m.id));
        el.checked ? cur.add(el.dataset.scope) : cur.delete(el.dataset.scope);
        this.s.d24scope = [...cur];
        this.invalidateD24(true);
        this.save();
      });
      this.querySelectorAll("[data-d24cite]").forEach((el) => el.onchange = () => {
        const i = el.dataset.d24cite;
        this.s.d24grades = { ...this.s.d24grades || {}, [i]: { ...this.s.d24grades?.[i] || {}, cite: el.value } };
        this.save();
      });
      this.querySelectorAll("[data-bib]").forEach((el) => el.onchange = () => {
        this.s.bib = { ...this.s.bib || {}, [el.dataset.bib]: el.value };
        this.save();
      });
      this.querySelectorAll("[data-prompt]").forEach((el) => el.onchange = () => {
        this.s.prompts = { ...this.s.prompts || {}, [this.s.task]: el.value };
        this.save();
      });
      this.querySelectorAll("tr[data-chunk]").forEach((tr) => tr.onclick = () => {
        this.s.chunkFocus = +tr.dataset.chunk === +(this.s.chunkFocus ?? -1) ? -1 : +tr.dataset.chunk;
        this.save();
        this.querySelector(".ribbon .focus")?.scrollIntoView({ block: "nearest" });
      });
      this.querySelectorAll("[data-meta]").forEach((el) => el.onchange = () => {
        this.s.metaFields = [...this.querySelectorAll("[data-meta]:checked")].map((x) => x.dataset.meta);
        this.result = null;
        this.save();
      });
      this.querySelectorAll("[data-cite]").forEach((el) => el.onchange = () => {
        let i = el.dataset.cite;
        this.s.grades[i] = { ...this.s.grades[i] || {}, cite: el.value };
        this.save();
      });
      if (this.fromThrough) this.querySelectorAll('[data-do^="load-"]').forEach((x) => x.remove());
      if (this.busy) this.querySelectorAll("input,textarea,select,button").forEach((x) => x.disabled = true);
    }
    cloudChoice() {
      return `<label class="cloud-permission"><input type="checkbox" data-k="cloud" ${this.s.cloud ? "checked" : ""}>允许本次选中范围发送到所配云端（本机导入材料默认不发送）</label>`;
    }
    graphBody(sel, compare) {
      let g = this.s.view === "prepared" ? this.result?.graph || S.prepared.graph : this.result?.graph || this.currentGraph();
      return sel + tabs("view", this.s.view, [["run", "实际建图／查询"], ["prepared", "已跑好的结果"], ["paper", "论文原图"]]) + (this.s.view === "paper" ? `<figure><img src="assets/revision/figures/${this.s.strategy === "LightRAG" ? "lightrag-fig1.png" : this.s.strategy === "LazyGraphRAG" ? "lazy-official-fig1.png" : "graphrag-fig1.png"}" alt="原论文或官方原图"><figcaption>${E(this.s.strategy)}原图；${E(this.s.strategy === "LightRAG" ? "Guo等，arXiv:2410.05779v3，PDF页序3，图1" : this.s.strategy === "LazyGraphRAG" ? "Microsoft Research，2024-11-25，官方图1" : "Edge等，arXiv:2404.16130v2，PDF页序4，图1")}。<a href="${this.s.strategy === "LightRAG" ? "https://arxiv.org/abs/2410.05779v3" : this.s.strategy === "LazyGraphRAG" ? "https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/" : "https://arxiv.org/abs/2404.16130v2"}" target="_blank" rel="noopener">原文出处 ↗</a></figcaption></figure>` : `<div class="graph-workspace"><aside>${input("query", this.s.query, "问题")}${slider("budget", this.s.budget, "社区／检索／相关性核读预算", 1, 5)}${area("terms", this.s.terms, "实际词项／名称", 5)}<button data-do="load-graph-example">载入当前方法实际API结果</button><button data-do="load-relations-example">载入实际实体关系抽取</button><button data-do="graph-local">在选中原文建共现图</button><button data-do="graph-api">API抽取实体关系并处理当前方法</button><button data-do="graph-query">按当前方法实际查询</button>${this.cloudChoice()}<p>预跑：实际词项提取、共现建图与标签传播；未用构造关系。API可补实体关系和摘要；课堂适配与官方全量框架分开。</p></aside><main>${this.graphSVG(g)}${table(["节点／边", "数量", "实际性质"], [["节点", g.nodes.length, "实际文字命中或来源字段"], ["边", g.edges.length, E(g.mode || "API关系，须人工核读")], ["社区", (g.communities || S.A.labelPropagation(g)).length, "实际标签传播；非Leiden全量索引"]])}${this.result?.output ? `<p class="lab-quote">${E(this.result.output)}</p>` : ""}${this.result?.trace ? JSONblock(this.result.trace) : ""}</main></div>`);
    }
    strategyIntro() {
      const Q = {
        GraphRAG: { cite: "Edge 等，“From Local to Global: A Graph RAG Approach to Query-Focused Summarization”，arXiv:2404.16130v2，摘要", url: "https://arxiv.org/abs/2404.16130v2", lines: [["However, RAG fails on global questions directed at an entire text corpus, such as “What are the main themes in the dataset?”, since this is inherently a query-focused summarization (QFS) task, rather than an explicit retrieval task.", "然而，对于面向整个文本语料的全局性问题，例如“数据集的主要主题是什么？”，RAG 会失败，因为这类问题本质上是一项面向查询的摘要（QFS）任务，而不是一项明确的检索任务。"], ["Our approach uses an LLM to build a graph index in two stages: first, to derive an entity knowledge graph from the source documents, then to pregenerate community summaries for all groups of closely related entities.", "我们的方法用大语言模型分两个阶段建立图索引：先从原始文档中导出实体知识图谱，再为所有联系紧密的实体群组预先生成社区摘要。"]] },
        LightRAG: { cite: "Guo 等，“LightRAG: Simple and Fast Retrieval-Augmented Generation”，arXiv:2410.05779v3，摘要", url: "https://arxiv.org/abs/2410.05779v3", lines: [["This innovative framework employs a dual-level retrieval system that enhances comprehensive information retrieval from both low-level and high-level knowledge discovery.", "这一新框架采用双层检索系统，从低层与高层两个层面的知识发现来增强信息检索的全面性。"], ["This capability is further enhanced by an incremental update algorithm that ensures the timely integration of new data, allowing the system to remain effective and responsive in rapidly changing data environments.", "这一能力又借助增量更新算法得到加强：新数据能够及时并入，使系统在快速变化的数据环境中保持有效、反应迅速。"]] },
        LazyGraphRAG: { cite: "Edge、Trinh、Larson，“LazyGraphRAG: Setting a new standard for quality and cost”，Microsoft Research Blog，2024-11-25", url: "https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/", lines: [["In this blog post, we introduce a radically different approach to graph-enabled RAG that requires no prior summarization of the source data, avoiding the up-front indexing costs that may be prohibitive for some users and use cases.", "本文介绍一种截然不同的图增强 RAG 方法：它不需要预先对原始数据作摘要，从而避免了对某些用户和用途而言可能难以承受的前期索引成本。"], ["LazyGraphRAG data indexing costs are identical to vector RAG and 0.1% of the costs of full GraphRAG.", "LazyGraphRAG 的数据索引成本与向量 RAG 相同，是完整 GraphRAG 的 0.1%。"]] },
      }[this.s.strategy];
      return `<section class="strategy-intro">${Q.lines.map(([en, zh]) => `<blockquote><p>“${E(en)}”</p><p class="zh">${E(zh)}</p></blockquote>`).join("")}<p class="caption">${E(Q.cite)}；中文为教学用学术翻译。<a href="${E(Q.url)}" target="_blank" rel="noopener">原文 ↗</a></p></section>`;
    }
    // 三种方法在当前所选片段上的本页流程：各自的中间产物与模型调用次数（按本页流程计数，不是论文数字）。
    strategyPipeline() {
      const s = this.s, rs = this.records(), g = this.result?.graph || this.currentGraph(), comm = (g.communities || S.A.labelPropagation(g)).filter(c => c.length), N = rs.length, C = comm.length, b = +s.budget;
      const ids = (xs) => xs.map((r) => E(r.id)).join("、") || "无";
      let steps = [];
      if (s.strategy === "GraphRAG") steps = [["建索引①", "逐块抽取实体与关系", `逐块抽取时估计${N}次；本页共现图${g.nodes.length}节点、${g.edges.length}边，0次；API按钮按实际批次另记`], ["建索引②", "社区划分（含单节点社区）", comm.map((c, i) => `社区${i + 1}：${E(c.join("、"))}`).join("<br>") || "当前没有社区"], ["建索引③", "每个社区预写摘要", `理论估计${C}次；本页查询时会为预算内社区现写摘要`], ["查询", "摘要→map分头回答→reduce合并", `至多2×${Math.min(C, b)}+1次（预算${b}个社区；没有可用回答时不执行reduce）`]];
      if (s.strategy === "LightRAG") {
        const low = S.sparse(s.low || "劉氏子元 劉氏", rs).slice(0, b), high = S.sparse(s.high || "心術 史德", rs).slice(0, b), lowNames = (s.low || "劉氏子元 劉氏").split(/\s+/).filter(Boolean), hit = new Set(g.nodes.filter((n) => lowNames.some((k) => n.id.includes(k) || k.includes(n.id))).map((n) => n.id)), nb = g.edges.filter((e) => hit.has(e.source) || hit.has(e.target));
        steps = [["建索引", "逐块抽取实体与关系；新材料只增量并入", `${N}次调用；追加一份材料只需处理新块`], ["查询①", "从问题提取两层关键词", `1次调用。本页可手填：${input("low", s.low || "劉氏子元 劉氏", "低层（具体实体）")}${input("high", s.high || "心術 史德", "高层（主题）")}`], ["查询②", "两层各自检索＋邻接扩展", `低层命中：${ids(low)}<br>高层命中：${ids(high)}<br>邻接边：${nb.map((e) => E(e.source + "—" + e.target)).join("、") || "无"}`], ["查询③", "合并后生成回答", "1次调用"]];
      }
      if (s.strategy === "LazyGraphRAG") {
        const cand = S.sparse(s.query, rs);
        steps = [["建索引", "名词短语与共现建图，不调用模型", `0次调用：${g.nodes.length}节点、${g.edges.length}边`], ["查询①", "按问题取候选（本页用 BM25）", `${cand.length}段：${ids(cand.slice(0, 8))}${cand.length > 8 ? "…" : ""}`], ["查询②", `按预算逐段核读相关性（预算${b}段）`, `将核读：${ids(cand.slice(0, b))}；未核读：${ids(cand.slice(b, b + 6))}${cand.length > b + 6 ? "…" : ""}<br>${b}次调用`], ["查询③", "据通过核读的原文回答", "1次调用"]];
      }
      const cost = [["GraphRAG", N + C, 2 * Math.min(C, b) + 1], ["LightRAG", N, 2], ["LazyGraphRAG", 0, Math.min(S.sparse(s.query, rs).length, b) + 1]].map(([k, i, q]) => [k === s.strategy ? `<b>${k}</b>` : k, i, "≤" + q]);
      const actual = ["GraphRAG", "LightRAG", "LazyGraphRAG"].map(k => {
        const r = this.graphRuns?.[k], index = r?.index;
        return [E(k), index ? index.calls : "未运行", r?.calls != null ? `<span data-actual-calls="${k}">${r.calls}</span>` : "未运行", r?.calls != null ? `预算${r.budget}；${E(r.question)}<br><small>${E(r.time)}；${r.sourceIds.length}个片段</small>` : index ? `API建图：${index.sourceIds.length}个片段；${E(index.time)}` : "—"];
      });
      return `<section class="pipeline"><h3>${E(s.strategy)} 在当前${N}个片段上的流程</h3>${table(["步骤", "做什么", "本页产物／估算"], steps)}<h4>原理估算（逐块抽取；本页查询调用上限）</h4>${table(["方法", "理论建索引", "查询上限"], cost)}<p class="caption">N=${N}块，C=${C}个社区，预算=${b}；这里是估算，不是已发生的调用。</p><h4>最近一次实际模型调用</h4>${table(["方法", "本页API建图", "实际查询", "该次范围与问题"], actual)}<p class="caption">实际数按保存的调用记录逐次统计；未运行不记为0。论文成本与本页运行分开。</p></section>`;
    }
    blackboardBody(sel) {
      const s = this.s, run = this.localBoard(), step = Math.min(+(s.bbStep ?? run.log.length), run.log.length), state = run.states[step];
      const level = (name, items) => `<section class="bb-level"><h4>${E(name)}</h4>${items.length ? items.map((x) => `<p class="${x.at === step ? "fresh" : ""}"><small>${E(x.by)}</small> ${x.html}</p>`).join("") : '<p class="caption">（空）</p>'}</section>`;
      return `${sel}<div class="bb-grid"><div><div class="inline-form">${input("query", s.query, "共同研究问题")}</div>${area("points", s.points ?? "史德\n心術\n盡其天\n劉氏", "问题要点（每行一个；KS3据此检查缺口）", 3)}<div class="preset-row"><button data-do="bb-step" data-v="-1">← 上一步</button><button data-do="bb-step" data-v="1">下一步 →</button><button data-do="bb-step" data-v="0">从头</button><span>第${step}/${run.log.length}步</span></div><ol class="bb-log">${run.log.map((l, i) => `<li class="${i + 1 === step ? "on" : ""}"><b>控制</b>：${E(l.why)} → <b>${E(l.ks)}</b>：${E(l.did)}</li>`).join("")}</ol><p class="caption">本机运行，不调用模型：三个知识源都是确定的程序，只通过黑板交换结果；${run.stop}</p></div><div class="bb-board"><h3>黑板</h3>${level("论断与缺口", state.claims)}${level("人物与概念", state.entities)}${level("片段", state.segments)}</div></div><details class="bb-more"><summary>原图与近年用法、API 试跑</summary><div class="paper-figs"><figure><img src="assets/revision/figures/nii1986-fig1.png" alt="Nii 1986 Figure 1 The Blackboard Model"><figcaption>Nii 1986, AI Magazine 7(2), p. 39, Figure 1（原图）。</figcaption></figure><figure><img src="assets/revision/figures/blackboard-fig1.png" alt="Salemi等2025年图1"><figcaption>2025 年的大模型多智能体黑板：Salemi 等，arXiv:2510.01285v2，图1（原图）。</figcaption></figure></div><button data-do="blackboard">API：发布请求、按能力响应并汇总</button><button data-do="load-board-example">载入已跑好的黑板协作</button>${this.cloudChoice()}${this.result?.board ? this.result.board.map((r) => `<article class="blackboard-entry"><h3>${E(r.role)}</h3><pre>${E(r.output)}</pre><small>${E(r.model)} · ${number(r.seconds)}秒</small></article>`).join("") : ""}</details>`;
    }
    // 黑板模型的本机课堂实现：三层黑板、三个知识源、按最新变化选择知识源的控制。
    localBoard() {
      const s = this.s, rs = this.records(), points = (s.points ?? "史德\n心術\n盡其天\n劉氏").split("\n").map((x) => x.trim()).filter(Boolean);
      const aliases = Object.fromEntries(s.aliases.split("\n").filter((l) => l.includes("=>")).map((l) => l.split("=>").map((x) => x.trim())));
      const names = [...new Set([...s.terms.split(/[\n,，]/).map((t) => t.trim()).filter(Boolean), ...Object.keys(aliases)])];
      let board = { segments: [], entities: [], claims: [] }, states = [structuredClone(board)], log = [], queries = [s.query], done = { ks2: new Set(), ks3: false }, n = 0;
      const snap = () => states.push(structuredClone(board));
      while (n < 10) {
        n++;
        const fresh = board.segments.filter((x) => !done.ks2.has(x.id)), gaps = board.claims.filter((c) => c.gap && !c.searched);
        if (!board.segments.length) {
          const hits = S.sparse(queries[0], rs).slice(0, 3);
          hits.forEach((h) => board.segments.push({ id: h.id, by: "KS1 检索", at: n, html: `<b>${E(h.id)}</b> ${E(h.text.slice(0, 36))}…` }));
          log.push({ why: "黑板只有问题", ks: "KS1 检索", did: `按问题检索，写入${hits.length}段：${hits.map((h) => h.id).join("、")}` });
        } else if (fresh.length) {
          const found = [];
          for (const seg of fresh) {
            done.ks2.add(seg.id);
            const text = rs.find((r) => r.id === seg.id)?.text || "";
            for (const nm of names) if (text.includes(nm)) {
              const canon = aliases[nm] || nm;
              let e = board.entities.find((x) => x.canon === canon);
              if (!e) board.entities.push(e = { canon, forms: [], ids: [], by: "KS2 称呼归并", at: n });
              if (!e.forms.includes(nm)) e.forms.push(nm);
              if (!e.ids.includes(seg.id)) e.ids.push(seg.id);
              e.at = n;
              found.push(nm);
            }
          }
          board.entities.forEach((e) => (e.html = `<b>${E(e.canon)}</b>${e.forms.some((f) => f !== e.canon) ? "（原文作" + E(e.forms.join("、")) + "）" : ""} · ${E(e.ids.join("、"))}`));
          done.ks3 = false;
          log.push({ why: `新写入片段${fresh.map((x) => x.id).join("、")}`, ks: "KS2 称呼归并", did: found.length ? `识别称呼：${[...new Set(found)].join("、")}` : "未找到称呼表中的名称" });
        } else if (!done.ks3) {
          done.ks3 = true;
          const texts = board.segments.map((x) => rs.find((r) => r.id === x.id)?.text || "");
          for (const p of points) {
            const where = board.segments.filter((x, i) => texts[i].includes(p)).map((x) => x.id), old = board.claims.find((c) => c.point === p);
            if (old && old.gap && where.length) Object.assign(old, { gap: false, at: n, html: `要点“${E(p)}”已有依据：${E(where.join("、"))}` });
            else if (!old) board.claims.push({ point: p, gap: !where.length, by: "KS3 证据检查", at: n, html: where.length ? `要点“${E(p)}”已有依据：${E(where.join("、"))}` : `<span class="gap">缺口：要点“${E(p)}”尚无片段</span>` });
          }
          const g = board.claims.filter((c) => c.gap);
          log.push({ why: "人物与概念层有变化", ks: "KS3 证据检查", did: g.length ? `写下${g.length}个缺口：${g.map((c) => c.point).join("、")}` : "各要点均已有片段" });
        } else if (gaps.length) {
          const c = gaps[0];
          c.searched = true;
          const have = new Set(board.segments.map((x) => x.id)), hits = S.sparse(c.point, rs).filter((h) => !have.has(h.id)).slice(0, 2);
          hits.forEach((h) => board.segments.push({ id: h.id, by: "KS1 检索（补缺口）", at: n, html: `<b>${E(h.id)}</b> ${E(h.text.slice(0, 36))}…` }));
          if (!hits.length) Object.assign(c, { at: n, html: `<span class="gap">缺口：要点“${E(c.point)}”本库检索不到（只能说明本库未收或写法不同）</span>` });
          log.push({ why: `黑板上有缺口“${c.point}”`, ks: "KS1 检索", did: hits.length ? `以“${c.point}”补检，写入${hits.map((h) => h.id).join("、")}` : "补检无新片段" });
        } else break;
        snap();
      }
      return { log, states, stop: n >= 10 ? "达到10步上限后停止。" : "没有前提已满足的知识源，控制停止。" };
    }
    antBody(sel) {
      const s = this.s, res = this.result?.ant ? this.result : null;
      return `${sel}<div class="ant-grid"><aside>${input("query", s.query, "检索问题")}${slider("antN", s.antN || 6, "取回片段数（城市数）", 3, 10)}${slider("antIter", s.antIter, "迭代次数（cycle）", 1, 40)}${slider("ants", s.ants, "蚂蚁数 m", 2, 16)}${slider("rhoPaper", s.rhoPaper, "ρ（原文：保留系数；1−ρ 为挥发）", 0.1, 0.9, 0.1)}<p class="formula">p<sub>ij</sub> ∝ τ<sub>ij</sub><sup>α</sup>·η<sub>ij</sub><sup>β</sup>，η<sub>ij</sub>=1/d<sub>ij</sub>，α=1，β=2<br>τ<sub>ij</sub>(t+n) = ρ·τ<sub>ij</sub>(t) + Σ<sub>k</sub> Q/L<sub>k</sub></p><button data-do="ants">在取回的片段上运行 Ant System</button><p class="caption">距离 d = 1 − 两段的字二元组杰卡德系数；求一条经过全部片段、首尾衔接最紧的阅读顺序（旅行商问题）。</p></aside><main>${res ? `<h4>最短阅读顺序（长度${number(res.ant.best.length)}）</h4><ol class="ant-path">${res.ant.best.path.slice(0, -1).map((i) => `<li><b>${E(res.input[i].id)}</b> ${E(res.input[i].text.slice(0, 40))}…</li>`).join("")}</ol>${table(["迭代", "本轮最短路线", "长度"], res.ant.history.filter((h, i, a) => i < 5 || i === a.length - 1 || h.best.length < a[i - 1].best.length).map((h) => [h.iteration, h.best.path.map((i) => res.input[i].id).join("→"), number(h.best.length)]))}${this.tauTable(res)}` : `<figure><img src="assets/revision/figures/dorigo1996-fig1.png" alt="Dorigo等1996 Fig.1"><figcaption>Dorigo、Maniezzo、Colorni 1996，Fig. 1“An example with real ants”（作者公开稿第3页原图）：障碍物两侧，较短路径上的信息素增长更快。</figcaption></figure>`}</main></div>`;
    }
    tauTable(res) {
      const ids = res.input.map((x) => x.id), t = res.ant.tau, max = Math.max(...t.flat());
      return `<h4>结束时各边信息素 τ（颜色越深越多）</h4><div class="table-scroll"><table class="kv tau"><thead><tr><th></th>${ids.map((x) => `<th>${E(x)}</th>`).join("")}</tr></thead><tbody>${t.map((row, i) => `<tr><th>${E(ids[i])}</th>${row.map((v, j) => `<td style="background:rgba(29,92,169,${i === j ? 0 : (v / max).toFixed(2)})">${i === j ? "" : v.toFixed(2)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="caption">信息素多只说明这两段字面衔接更紧、被更多短路线经过，不表示历史关系。</p>`;
    }
    problemsBody() {
      const s = this.s, P = [["形式化", "演进趋势的形式化"], ["趋新", "时间意识上的趋新化"], ["偏颇", "知识结构上的严重偏颇"]];
      return `<div class="problems"><p>把一段模型回答（例如 D22 的工具路径回答）贴在下面，逐类检查：整体框架是否来自材料。</p>${area("answer", s.answer, "待检查的回答", 5)}${P.map(([k, l]) => `<section class="problem-check"><h4>${E(l)}</h4>${tabs("pb" + k, s["pb" + k] || "", [["未见", "未见"], ["疑似", "疑似"], ["存在", "存在"]])}${area("pbn" + k, s["pbn" + k], "依据：回答中哪一句、材料原文为何不支持", 2)}</section>`).join("")}<p class="caption">三类问题的名称与含义据讲义 5.1 转述；出处为未刊研究，公开课件不录原文。</p></div>`;
    }
    readingBody(sel) {
      const s = this.s, tasks = Object.keys(TASK_PROMPTS), prompt = s.prompts?.[s.task] ?? TASK_PROMPTS[s.task], chat = this.result?.chat;
      const session = this.result?.session, manualReady = (s.answer || "").trim();
      const changed = session && (session.query !== s.query || session.budget !== +s.budget || session.task !== s.task || session.manual !== s.answer || session.prompt !== prompt);
      const chips = (t) => E(t).replace(/\[([A-Za-z0-9_\-·]+)\]/g, (m, id) => S.corpus.records().some((r) => r.id === id) ? `<button class="cite-chip" data-reader="${id}">${id}</button>` : m);
      return `<div class="reading-layout"><main>${sel}<div class="task-row">${tabs("task", s.task, tasks.map((t) => [t, t]))}</div><label class="field">本任务提示词（预置，可改）<textarea data-prompt="1" rows="3">${E(prompt)}</textarea></label>${input("query", s.query, session ? "下一轮研究问题" : "本轮研究问题")}${area("answer", s.answer, "先独立阅读：自己的80—120字回答（模型之前写）", 3)}<div class="reading-actions"><button data-do="reading" ${manualReady ? "" : "disabled"}>冻结所选范围，发送</button><button data-do="load-reading-example">载入所选任务已跑好的结果</button><button data-do="contrast" ${manualReady ? "" : "disabled"}>固定检索与工具调用对照</button><button data-do="load-contrast-example">载入已跑好的对照</button><button data-do="export">导出本轮输入、输出与判断</button></div>${manualReady ? "" : '<p class="caption">先写下自己的阅读判断，再发送给模型。</p>'}${this.cloudChoice()}${session ? `<section class="sent-session"><h3>本轮已发送：${E(session.task)}</h3><p>${E(session.query)}</p>${changed ? '<p class="note-box">上方输入已改变。下面保留的是先前运行；追问沿用先前原文，点击“冻结所选范围，发送”才开始新一轮。</p>' : ""}</section>` : ""}${chat ? `<div class="chat-log">${chat.filter((m) => m.role !== "system").map((m, i) => `<article class="msg ${m.role}"><small>${m.role === "user" ? (i ? "追问" : "提问＋冻结的原文") : "模型 " + E(m.model || "")}</small><div>${m.role === "user" && !i ? E(session?.query || this.result?.trace?.input?.[1]?.content?.split("\n")[0] || "已保存的提问") + `<details><summary>本次实际输入的原文</summary><pre class="trace">${E(m.content)}</pre></details>` : chips(m.content)}</div></article>`).join("")}</div><div class="inline-form">${input("followup", s.followup, "追问（同一冻结范围内继续）")}<button data-do="followup">追问</button></div>` : this.result?.output ? `<article class="reading-candidate"><h3>已保存的模型回答</h3><div>${chips(this.result.output)}</div></article>` : ""}${area("report", s.report, "采用／收窄／纠错／待核：逐句依据与理由", 4)}</main><aside>${session ? `<section class="sent-scope"><h3>本轮已发送的原文范围</h3>${rsBrief(session.records)}</section>` : ""}<section class="planned-scope"><h3>${session ? "下一轮待选范围" : "待发送的原文范围"}</h3>${slider("budget", s.budget, "下一轮片段预算", 1, 8)}${rsBrief(this.plannedRecords())}</section><p class="caption">新一轮按当前问题检索；已发送范围独立保存。追问检查整段对话的实际材料范围。回答中的 [片段ID] 可点开原页核对。</p></aside></div>`;
    }
    glossary() {
      let g = D.DATA.glossary, q = (this.s.termQuery || "").toLowerCase();
      const all = g.categories.flatMap((c) => c.terms.map((t) => ({ ...t, cat: c.label })));
      const terms = all.filter((t) => [t.term, t.en, t.definition || "", ...Object.values(t.fields), ...t.paragraphs].join(" ").toLowerCase().includes(q));
      const sel = terms.find((t) => t.term === this.s.selectedTerm) || terms[0];
      const groups = [...new Set(terms.map((t) => t.cat))];
      const block = (n, h, body) => body ? `<section class="cblock"><h3><span>${n}</span>${E(h)}</h3>${body}</section>` : "";
      return `<div class="structured-glossary"><aside>${input("termQuery", this.s.termQuery, "搜索术语／释义")}${groups.map((c) => `<p class="group">${E(c.replace(/^第.组：/, ""))}</p>${terms.filter((t) => t.cat === c).map((t) => `<button data-set="selectedTerm" data-v="${E(t.term)}" class="${sel?.term === t.term ? "on" : ""}" aria-pressed="${sel?.term === t.term}">${E(t.term)}<small>${E(t.en)}</small></button>`).join("")}`).join("")}</aside><main>${sel ? `<header class="concept-head"><h2>${E(sel.term)} <small>${E(sel.en)}</small></h2><p>${E(sel.fields.alias || "")}</p><p class="caption">${E(sel.fields.where || "")} · ${sel.first_slide ? D.pageLink(sel.first_slide, "首次出现 " + sel.first_slide + " " + (D.pageById(sel.first_slide)?.title || "") + " →") : ""}</p></header><div class="concept-blocks">${block("1", "一句话定义", `<p class="definition">${E(sel.definition || sel.fields.problem || "")}</p><p class="caption">它解决什么问题：${E(sel.fields.problem || "")}</p>`)}${block("2", "机制或公式", (sel.formulaHtml ? `<div class="formula-box">${sel.formulaHtml}</div>` : "") + `<details ${sel.formulaHtml ? "" : "open"}><summary>展开讲解</summary>${sel.paragraphs.filter((p) => !p.startsWith("公式：")).map((p) => `<p>${E(p)}</p>`).join("")}</details>`)}${block("3", "本讲例子", `<p>${E(sel.fields.classroom || "")}</p>${sel.first_slide ? `<p>${D.pageLink(sel.first_slide, "到 " + sel.first_slide + " 动手看 →")}</p>` : ""}`)}${block("4", "易混处", `<p>${E(sel.fields.confusion || "")}</p>`)}${block("5", "对历史研究的意义", `<p>${E(sel.fields.history || "")}</p>`)}</div>` : "<p>未找到匹配概念。</p>"}</main></div>`;
    }
    async import(file) {
      if (!file) return;
      try {
        let counts = await S.corpus.importFile(file);
        this.s.source = "all";
        this.message = `已在本机导入${counts.sources}项材料、${counts.segments}片段；各演示共用。`;
        this.save();
      } catch (e) {
        this.message = "导入失败，当前库保留：" + e.message;
        this.render();
      }
    }
    async restore(file) {
      if (!file) return;
      try {
        await S.corpus.restore(file);
        this.s.source = "all";
        this.message = "原件、正文与实际运行记录已在本机恢复。";
        this.save();
      } catch (e) {
        this.message = "恢复失败，当前记录保留：" + e.message;
        this.render();
      }
    }
    async read(id) {
      const r = S.corpus.records().find((x) => x.id === id);
      if (!r) return;
      let source = S.corpus.sources().find((x) => x.id === r.source), blob = r.attachmentId ? await S.corpus.file(r.attachmentId) : null, url = blob ? URL.createObjectURL(blob) : source.local_pdf || r.url;
      if (url && !/^(https?:|blob:|\/local-materials\/)/.test(url)) url = "";
      if (source.local_pdf && !blob) {
        const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
        if (!local) url = "";
        else try { if (!(await fetch(url, { method: "HEAD" })).ok) url = ""; } catch { url = ""; }
      }
      const reference = /^https?:\/\//.test(source.url || "") ? `<p><a href="${E(source.url)}" target="_blank" rel="noopener">公开参照文本 ↗</a>（版本与课堂PDF可能不同）</p>` : "";
      const missing = `<p>所用PDF原件未随公开课件发布。本机预览可回读；也可通过通用导入页导入自己的原件。</p>${reference}`;
      let dialog = document.createElement("dialog");
      dialog.className = "material-reader";
      dialog.innerHTML = `<header><h2>${E(source.title)}</h2><button data-close>关闭 ×</button></header><div class="reader-split"><div>${url ? `<iframe src="${E(url)}#page=${r.pdfPage || 1}" title="所用PDF原页"></iframe>` : missing}</div><aside>${table(["字段", "所用值"], [["作者", E(source.author)], ["版本", E(source.edition || source.date || "待查")], ["位置", E(r.locator)], ["加工", E(r.method || source.acquisition || "待查")], ["核读", E(r.verification || "待核")]])}${quote(r)}</aside></div>`;
      dialog.querySelector("[data-close]").onclick = () => dialog.close();
      dialog.addEventListener("close", () => {
        if (blob) URL.revokeObjectURL(url);
        dialog.remove();
      });
      document.body.append(dialog);
      dialog.showModal();
    }
    async action(name) {
      if (name.startsWith("load-")) {
        if (this.fromThrough) {
          this.message = "保存示例使用公开《史德》；德教处理链请运行当前导入材料。";
          this.render();
          return;
        }
        const names = { "load-hyde-example": "HyDE三语候选", "load-context-example": "上下文补写", "load-graph-example": this.s.strategy, "load-relations-example": "实体关系抽取", "load-board-example": "Blackboard System", "load-reading-example": "六项阅读任务", "load-contrast-example": "固定与工具检索对照" }, example = S.preparedAPI.results.find((x) => x.name === names[name]);
        if (!example) {
          this.message = "该项目暂无保存的真实记录";
          this.render();
          return;
        }
        let r = structuredClone(example.result);
        this.s.source = "shide";
        if (!["load-context-example", "load-relations-example"].includes(name)) this.s.query = example.question.split("\n\n")[0];
        if (name === "load-hyde-example") {
          this.s.hyps = parseJSON(r.output).documents;
          this.s.hypIndex = 0;
          this.s.hypothesis = this.s.hyps[0].text;
          this.result = { run: r };
        } else if (name === "load-context-example") {
          this.s.context = "api";
          this.s.record = "S1";
          this.result = { method: "api", run: r, output: r.output, composed: r.output.trim() + "\n" + (this.records().find((x) => x.id === "S1")?.text || ""), example: true, plain: [], ctx: [], cosPlain: NaN, cosCtx: NaN };
        } else if (name === "load-board-example") {
          this.s.tab = "0";
          this.result = r;
        } else if (name === "load-reading-example") {
          let run = r.runs.find((x) => x.task === this.s.task);
          this.result = { trace: run, output: run.output };
        } else if (name === "load-relations-example") {
          let graph = parseJSON(r.output);
          let rs = this.records(), ids = new Set(graph.nodes.map((n) => n.id));
          graph.edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target) && e.quote && e.sources?.some((id) => rs.some((s2) => s2.id === id && s2.text.includes(e.quote))));
          graph.communities = S.A.labelPropagation(graph);
          graph.mode = "实际API候选关系；逐字证据过滤后仍须人工核读";
          this.result = { graph, trace: { extraction: r } };
          this.s.view = "prepared";
        } else {
          this.result = r;
          if (name === "load-graph-example") this.s.view = "prepared";
        }
        this.message = "载入2026-10-13真实API记录：《史德》原范围；请求deepseek-chat，接口返回deepseek-flash。当前材料和问题已恢复到该次范围。";
        this.save();
        return;
      }
      if (name.startsWith("bib-")) {
        const r = this.selected(), m = this.sources().find((x) => x.id === r?.source) || {};
        if (name === "bib-fill") this.s.bib = { type: m.id === "acton" ? "speech" : "chapter", author: m.author, title: m.title, edition: m.edition, origin: m.first_publication, access: m.provider, page: r?.printedPage || "", pdfPage: r?.pdfPage ? String(r.pdfPage) : "", status: r?.verification || "待核", basis: m.id === "shide" ? "商务印书馆旧版本（据版权页）" : "待查" };
        if (name === "bib-clear") this.s.bib = {};
        if (name === "bib-save") this.s.bibList = [...this.s.bibList || [], { ...this.s.bib }];
        if (name === "bib-load") this.s.bib = { ...this.s.bibList[+this.lastPreset] };
        if (name === "bib-export") return D.download("题录.json", JSON.stringify((this.s.bibList?.length ? this.s.bibList : [this.s.bib]).map((b) => this.cslOf(b)), null, 2), "application/json");
        this.save();
        return;
      }
      if (name === "d24-grade") {
        const [i, w] = this.lastPreset.split("|");
        this.s.d24grades = { ...this.s.d24grades || {}, [i]: { ...this.s.d24grades?.[i] || {}, weight: +w } };
        this.save();
        return;
      }
      if (name === "d24-bm25") {
        this.invalidateD24(true);
        const t0 = performance.now(), units = this.d24Units();
        this.d24res = { stamp: this.d24Stamp(), total: units.length, bm25: S.sparse(this.s.query, units), query: this.s.query };
        this.d24res.bm25Seconds = (performance.now() - t0) / 1000;
        this.save();
        return;
      }
      if (name === "bb-step") {
        const total = this.localBoard().log.length, cur = +(this.s.bbStep ?? total), d = +this.lastPreset;
        this.s.bbStep = d === 0 ? 0 : Math.max(0, Math.min(total, cur + d));
        this.save();
        return;
      }
      if (name === "preset-support") {
        if (this.lastPreset === "wrong") Object.assign(this.s, { answer: this.s.claim, grades: {} });
        else Object.assign(this.s, { answer: PAGE_DEFAULTS.D16.answer, grades: structuredClone(LECTURE_GRADES) });
        this.save();
        return;
      }
      if (name === "preset-edit") {
        const [a, b] = (this.lastPreset || "").split("|");
        Object.assign(this.s, { a, b, edit: 0 });
        this.save();
        return;
      }
      if (name === "preset-jaccard") {
        Object.assign(this.s, { passage: "能具史識者。必知史德。德者何。謂著書者之心術也。", query: this.lastPreset === "trad" ? "史德與心術" : "史德与心术", unit: "char", norm: "", step: 3 });
        this.save();
        return;
      }
      if (name === "preset-question") {
        this.s.query = { shide: "章學誠對著史者提出了什麼要求？這一要求針對的是什麼？", acton: "阿克顿认为批评者遇到一条有意思的陈述，要做哪几步检查？", ogai: "森鴎外不愿随意改动史料，这一表态针对的是什么？" }[this.s.source] || this.s.query;
        this.save();
        return;
      }
      if (name === "importer") {
        S.openImporter();
        return;
      }
      if (name === "export") {
        D.download(this.id + "-研究记录.json", JSON.stringify({ schema: "week05-revision/v1", page: this.id, state: this.s, result: this.result, ...(this.id === "D24" ? { retrieval: this.d24res && { query: this.d24res.query, total: this.d24res.total, bm25: this.d24res.bm25.slice(0, 40).map((x) => ({ id: x.id, score: x.score })), dense: this.d24res.dense?.map((x) => ({ id: x.id, cos: x.cos })), seconds: [this.d24res.bm25Seconds, this.d24res.denseSeconds] }, modelAnswer: this.d24answer } : {}), date: (new Date()).toISOString() }, null, 2), "application/json");
        return;
      }
      if (name === "backup") {
        let blob = await S.corpus.backup(), a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "第五周_完整本机研究备份.zip";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
        return;
      }
      if (name === "edit-next") {
        this.s.edit = +this.s.edit + 1;
        this.save();
        return;
      }
      if (name === "edit-play" || name === "play-process") {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        } else this.timer = setInterval(() => {
          if (name === "edit-play") {
            let x = S.A.editSteps(this.s.a, this.s.b), end = this.s.editMode === "fill" ? x.steps.length : x.path.length;
            if (+this.s.edit >= end) {
              clearInterval(this.timer);
              this.timer = null;
            } else this.s.edit = +this.s.edit + 1;
          } else this.s.flowNode = (+(this.s.flowNode || 0) + 1) % 4;
          this.save();
        }, 650);
        return;
      }
      if (name === "graph-fullscreen") {
        let dialog = document.createElement("dialog");
        dialog.className = "graph-dialog";
        const draw = () => {
          dialog.innerHTML = `<header><button data-close>关闭 ×</button>${tabs("entityRule", this.s.entityRule, [["exact", "精确匹配"], ["edit", "编辑距离≤1"], ["alias", "人工异称表"]])}</header>` + this.graphSVG(this.currentGraph());
          dialog.querySelector("[data-close]").onclick = () => dialog.close();
          dialog.querySelectorAll("[data-set]").forEach((x) => x.onclick = () => {
            this.s.entityRule = x.dataset.v;
            this.save();
            draw();
          });
        };
        draw();
        dialog.onclose = () => dialog.remove();
        document.body.append(dialog);
        dialog.showModal();
        return;
      }
      if (this.busy) return;
      if (window.W5CloudBusy) {
        this.message = "另一页正在调用模型，请等待本轮完成。";
        this.render();
        return;
      }
      if (["reading", "contrast"].includes(name) && !(this.s.answer || "").trim()) {
        this.message = "先写下自己的阅读判断，再发送给模型。";
        this.render();
        return;
      }
      this.busy = true;
      window.W5CloudBusy = true;
      this.message = "正在实际处理…";
      this.render();
      let records = structuredClone(this.id === "D22" ? (name === "reading" ? this.plannedRecords() : this.frozen()) : this.records().slice(0, Math.max(1, this.s.budget))), s = structuredClone(this.s);
      const revisionAtStart = S.corpus.revision();
      if (name === "reading") this.result = null;
      try {
        if (name === "encode") {
          let sent = this.sentenceRows();
          let v = await S.embedding.encode(sent.map((x) => x.text), (msg) => {
            this.message = msg;
            this.render();
          });
          this.vectors = { texts: sent.map((x) => x.text), vectors: v, model: S.embedding.model, revision: S.embedding.revision };
          this.message = "浏览器实际编码完成；每个句子与距离已更新。";
        }
        if (name === "d24-dense") {
          if (!this.d24res || this.d24res.stamp !== this.d24Stamp() || !this.d24res.bm25.length) throw Error("先在当前范围执行有结果的 BM25 检索");
          const top = this.d24res.bm25.slice(0, +(s.topN || 40)), t0 = performance.now();
          const v = await S.embedding.encode([this.d24res.query, ...top.map((u) => u.text)], (m) => { this.message = m; this.render(); });
          this.d24res = { ...this.d24res, dense: top.map((u, i) => ({ ...u, cos: S.A.cosine(v[0], v[i + 1]) })).sort((a, b) => b.cos - a.cos), denseSeconds: (performance.now() - t0) / 1000 };
          delete this.d24res.restoredKept;
          delete this.d24res.legacy;
          this.invalidateD24(false);
          this.result = { d24: { query: this.d24res.query, encoded: top.map((u) => u.id), seconds: this.d24res.denseSeconds } };
        }
        if (name === "d24-read") {
          const kept = this.d24Kept();
          if (!kept.length || !(s.manual || "").trim()) throw Error("先在当前范围检索，并写下自己的判断");
          const run = await S.generate("依据所给原文回答研究问题。每句一行，句末标[单元ID]；区分原文明说与推断。下面附研究者先写的独立判断，只作对照，不要迎合。", kept, (s.question || s.query) + "\n研究者的独立判断：" + s.manual, { allowCloud: s.cloud });
          this.d24answer = run;
          this.s.d24answer = undefined;
          this.s.d24grades = {};
          this.result = { d24run: run.id };
        }
        if (name === "context") {
          const plan = this.contextPlan();
          if (!plan.target) throw Error("先选择单一材料的片段，不把不同作者的全文混作邻段");
          let composed = plan.composed, late = null, run = null, ctx, tGen = 0;
          const timing = {};
          if (s.context === "api") {
            const key = JSON.stringify([plan.target.id, plan.whole.map((x) => x.id), plan.prompt, window.W5Chat?.settings?.().model]);
            if (this.contextCache?.key === key) {
              run = this.contextCache.run;
              timing.cached = true;
            } else {
              const t0 = performance.now();
              let shown = 0;
              this.message = `① 已把 ${plan.wholeChars} 字原文（${plan.whole.length} 段）与目标片段发给模型，等待首个字……`;
              this.render();
              run = await S.generate(plan.prompt, plan.whole, "为片段 " + plan.target.id + " 写检索用的上下文说明", { allowCloud: s.cloud, maxTokens: 300, onDelta: (t) => { if (!shown) timing.firstToken = (performance.now() - t0) / 1000; shown = t.length; this.message = `① 模型正在写（首字用时 ${number(timing.firstToken)} 秒）：${t.slice(-80)}`; this.render(); } });
              tGen = (performance.now() - t0) / 1000;
              timing.generate = tGen;
              this.contextCache = { key, run };
            }
            composed = run.output.trim() + "\n" + plan.target.text;
          }
          const t1 = performance.now();
          const [q, plain] = await S.embedding.encode([s.query, plan.target.text], (m) => { this.message = "② " + m; this.render(); });
          if (s.context === "late") {
            late = await S.embedding.late(plan.window.map((x) => x.text));
            ctx = late.ranges[plan.before.length].vector;
          } else ctx = (await S.embedding.encode([composed]))[0];
          timing.encode = (performance.now() - t1) / 1000;
          this.result = { method: s.context, target: plan.target.id, composed, late, run, output: run?.output, plain, ctx, cosPlain: S.A.cosine(q, plain), cosCtx: S.A.cosine(q, ctx), timing, sentChars: s.context === "api" ? plan.wholeChars : 0, mode: "浏览器内实际编码" + (run ? "；补写为实际API调用" : "") };
          this.s.flowNode = 3;
        }
        if (name === "representation") {
          const t0 = performance.now();
          let all = this.records().slice(0, 30);
          if (this.fromThrough && this.throughChunks) {
            let c = this.throughChunks;
            all = all.flatMap((r) => M.chunks(r.text, c.method, +c.size, +c.overlap).map((chunk, i) => ({ ...r, id: r.id + "-chunk" + (i + 1), parentId: r.id, text: chunk.text, locator: r.locator + "；切分字符[" + chunk.start + "," + chunk.end + ")" }))).slice(0, 18);
          }
          if (s.representation === "dense") {
            let chunks = all.map((r) => ({ ...r, text: S.A.sentences(r.text).slice(0, 2).map((s2) => s2.text).join("") })), v = await S.embedding.encode([s.query, ...chunks.map((r) => r.text)]);
            this.result = { rows: S.rankDense(v[0], chunks, v.slice(1)), mode: "实际多语句向量余弦（每段取前两句编码）", seconds: (performance.now() - t0) / 1000 };
          } else {
            let rows = S.sparse(s.query, all, { tfidf: s.representation === "tfidf" });
            if (s.representation === "bow") rows = rows.map((r) => ({ ...r, score: r.terms.reduce((n, x) => n + x.count, 0), terms: r.terms.map((x) => ({ ...x, value: x.count })) })).sort((a, b) => b.score - a.score);
            this.result = { rows, mode: "实际" + s.representation };
          }
        }
        if (name === "hyde-generate") {
          let run = await S.generate('你在执行 HyDE 的假想相关文档生成：只依据给定问题，不读取检索库，不添加引文 ID，不冒充史料原文。请写8段可用于检索的假想文档，四种文体各两段，两段的视角不同（如一段侧重概念界定，一段侧重论证脉络）：文言（仿清代学术文体）、现代汉语学术文字、English academic prose、日本語の学術的文章。每段约100—150字。只返回JSON {documents:[{language:"文言/现代汉语/English/日本語",angle:"视角",text:"假想文档"}]}。', [], s.query);
          let parsed = parseJSON(run.output);
          const languages = ["文言", "现代汉语", "English", "日本語"];
          if (!Array.isArray(parsed.documents) || parsed.documents.length !== 8 || parsed.documents.some(x => !languages.includes(x.language) || typeof x.angle !== "string" || !x.angle.trim() || typeof x.text !== "string" || !x.text.trim()) || languages.some(l => parsed.documents.filter(x => x.language === l).length !== 2)) throw Error("API未返回四种文体各两条的8个完整候选；原始输出已保存，可重试生成。原候选保留。");
          this.s.hyps = parsed.documents;
          this.s.hypIndex = 0;
          this.s.hypothesis = parsed.documents[0].text;
          this.result = { run };
        }
        if (name === "hyde-retrieve") {
          if (!s.hypothesis.trim()) throw Error("先生成或自己输入假想文档");
          const t0 = performance.now();
          let rs = this.records().slice(0, 30).map((r) => ({ ...r, text: S.A.sentences(r.text).slice(0, 2).map((x) => x.text).join("") })), v = await S.embedding.encode([s.query, s.hypothesis, ...rs.map((r) => r.text)], (m) => { this.message = m; this.render(); });
          this.result = { ...this.result, base: S.rankDense(v[0], rs, v.slice(2)).slice(0, s.budget), hyde: S.rankDense(v[1], rs, v.slice(2)).slice(0, s.budget), inputHypothesis: s.hypothesis, mode: `浏览器内实际编码${rs.length}段（每段前两句）＋原查询＋假想文档，用时${number((performance.now() - t0) / 1000)}秒` };
        }
        if (name === "retrieve") this.result = { retrieved: S.sparse(s.query, this.records()), query: s.query, mode: "实际BM25" };
        if (name === "graph-local") {
          let graph = this.currentGraph();
          graph.communities = S.A.labelPropagation(graph);
          this.result = { graph, trace: { mode: "实际词项共现图和标签传播", sources: this.records().map((x) => x.id), calls: 0 } };
        }
        if (name === "graph-api") {
          let run = await S.generate('从原文抽取实体与关系。返回JSON {nodes:[{id:"原文中的名称",sources:["片段ID"]}],edges:[{source:"名称",target:"名称",relation:"明确关系",sources:["片段ID"],quote:"原文证据"}]}。每条边须有逐字原文和存在的来源，不推断思想影响。', records, "建立可回查的小图", { allowCloud: s.cloud });
          let graph = parseJSON(run.output);
          if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw Error("模型关系格式错误，实际输出已保存");
          let map = new Map(records.map((r) => [r.id, r]));
          graph.edges = graph.edges.filter((e) => typeof e.quote === "string" && e.quote.trim() && e.sources?.some((id) => map.has(id) && map.get(id).text.includes(e.quote)));
          graph.nodes = graph.nodes.filter((n) => typeof n.id === "string");
          let ids = new Set(graph.nodes.map((n) => n.id));
          graph.edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
          graph.communities = S.A.labelPropagation(graph);
          graph.mode = "实际API候选关系，逐字证据过滤后仍须人工核读";
          let summaries = [];
          if (s.strategy === "GraphRAG") for (let group of graph.communities.slice(0, 3)) {
            let relevant = records.filter((r) => group.some((n) => r.text.includes(n)));
            if (relevant.length) {
              let summary = await S.generate("据所给原文概括该社区的主题，每句标片段ID，不跨范围概括。", relevant, group.join("、"), { allowCloud: s.cloud });
              summaries.push(summary);
            }
          }
          this.result = { graph, trace: { extraction: run, summaries }, output: summaries.map((x) => x.output).join("\n") };
          this.graphRuns = { ...this.graphRuns || {}, [s.strategy]: { ...this.graphRuns?.[s.strategy] || {}, index: { calls: 1 + summaries.length, time: new Date().toISOString(), sourceIds: records.map(r => r.id) } } };
        }
        if (name === "graph-query") {
          const { queryGraph } = await import("./graph-query.mjs");
          this.result = await queryGraph(S, { graph: this.result?.graph || this.currentGraph(), records: structuredClone(this.records()), question: s.query, strategy: s.strategy, budget: +s.budget, allowCloud: s.cloud });
          this.graphRuns = { ...this.graphRuns || {}, [s.strategy]: { ...this.graphRuns?.[s.strategy] || {}, question: s.query, budget: +s.budget, calls: this.result.trace.runs.length, time: new Date().toISOString(), sourceIds: this.records().map(r => r.id), phases: this.result.trace.phases } };
        }
        if (name === "ants") {
          const input2 = S.sparse(s.query, this.records()).slice(0, +(s.antN || 6));
          if (input2.length < 3) throw Error("取回的片段少于3段，换一个问题或材料");
          const dist = input2.map((a, i) => input2.map((b, j) => i === j ? 0 : Math.max(1e-3, 1 - M.similarity(a.text, b.text, 2).J)));
          const ant = S.A.antSystem(dist, { iterations: +s.antIter, ants: +s.ants, rho: 1 - +s.rhoPaper });
          this.result = { ant, dist, input: input2, mode: "本机实际运行 Ant System：随机构造路线、按 Q/L 沉积、按 1−ρ 挥发" };
        }
        if (name === "blackboard") {
          const { runBlackboard } = await import("./blackboard.mjs");
          this.result = await runBlackboard(S, records, s.query, { allowCloud: s.cloud });
        }
        if (name === "reading") {
          const prompt = s.prompts?.[s.task] ?? TASK_PROMPTS[s.task];
          let run = await S.generate(prompt + "\n仅用所给原文；回答中引用一律写成[片段ID]。", records, s.query + (s.answer ? "\n自己的回答：" + s.answer : ""), { allowCloud: s.cloud });
          this.result = { output: run.output, trace: run, session: { records, query: s.query, task: s.task, budget: +s.budget, manual: s.answer, prompt, materialRevision: revisionAtStart }, chat: [...run.input, { role: "assistant", content: run.output, model: run.model }] };
        }
        if (name === "followup") {
          if (!this.result?.chat) throw Error("先发送一次");
          if (!s.followup?.trim()) throw Error("先写追问");
          if (!this.result.session?.records || this.result.session.materialRevision !== revisionAtStart) throw Error("该对话缺少有效的冻结范围，先开始新一轮阅读。");
          S.assertCloudPermission(this.result.session.records, s.cloud);
          const messages = [...this.result.chat.map(({ role, content }) => ({ role, content })), { role: "user", content: s.followup }];
          const r = await window.W5Chat.chat(messages, { maxTokens: 2048 });
          this.result = { ...this.result, chat: [...this.result.chat, { role: "user", content: s.followup }, { role: "assistant", content: r.text, model: r.model }] };
          await S.corpus.saveRun({ id: "followup-" + crypto.randomUUID(), time: new Date().toISOString(), input: messages, output: r.text, model: r.model });
          this.s.followup = "";
        }
        if (name === "contrast") {
          let frozen = this.records().slice(0, 30);
          S.assertCloudPermission(frozen, s.cloud);
          let fixed = S.sparse(s.query, frozen).slice(0, s.budget), first = await S.generate("固定检索路径：据实际取回原文回答，逐句标ID。", fixed, s.query, { allowCloud: s.cloud });
          let collected = [], log = [];
          const settings = window.W5Chat.settings();
          let messages = [{ role: "system", content: "据库内工具返回片段回答，逐句标ID；最多3次模型调用。调用search以原语关键词检索。" }, { role: "user", content: s.query }], tools = [{ type: "function", function: { name: "search", description: "在冻结的所选史料库实际BM25检索", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }];
          for (let i = 0; i < 3; i++) {
            let response = await window.W5Chat.chat(messages, { maxTokens: 2048, tools: i < 2 ? tools : void 0 });
            log.push({ input: structuredClone(messages), output: response });
            if (!response.toolCalls?.length) {
              collected.push(response.text);
              break;
            }
            messages.push({ role: "assistant", content: response.text || null, tool_calls: response.toolCalls });
            for (let t of response.toolCalls) {
              let arg = parseJSON(t.function.arguments), rs = S.sparse(arg.query, frozen).slice(0, s.budget);
              messages.push({ role: "tool", tool_call_id: t.id, content: rs.map((r) => `[${r.id}] ${r.locator}
${r.text}`).join("\n") || "本库没有命中字词" });
            }
          }
          this.result = { output: "固定路径：\n" + first.output + "\n\n工具路径：\n" + (collected.join("\n") || "预算用尽，尚无最终回答"), trace: { fixed: first, agent: log, model: settings.model, corpusSHA256: await S.sha256(frozen), limit: 3, budget: s.budget } };
          await S.corpus.saveRun({ id: "contrast-" + crypto.randomUUID(), ...this.result.trace });
        }
        if (revisionAtStart !== S.corpus.revision()) {
          if (this.id === "D24") this.invalidateD24(true);
          else this.result = null;
          this.message = "材料已变化。本轮响应留在运行历史，当前页请重新处理。";
        } else this.message = "本轮实际处理完成，输入与输出可导出。";
      } catch (e) {
        this.message = "实际处理未完成：" + e.message;
      } finally {
        try {
          if (this.result) await S.corpus.saveRun({ id: "operation-" + crypto.randomUUID(), time: (new Date()).toISOString(), operation: name, page: this.id, state: s, result: this.result });
        } finally {
          this.busy = false;
          window.W5CloudBusy = false;
          this.save();
        }
      }
    }
  }
  function parseJSON(s) {
    let clean = s.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    let start = clean.indexOf("{"), end = clean.lastIndexOf("}");
    return JSON.parse(start >= 0 ? clean.slice(start, end + 1) : clean);
  }
  function rsBrief(rs) {
    return rs.map((r) => `<p><b>${E(r.id)}</b> ${E(r.title)}<br><small>${E(r.locator)}</small></p>`).join("");
  }
  D.register("revision-lab", RevisionLab);
  // 模型接入页中的嵌入模型状态：载入程序库 → 检查下载地址 → 下载权重（逐文件进度）→ 就绪／失败。
  class EmbeddingStatus extends HTMLElement {
    connectedCallback() {
      this.onState = (e) => this.render(e.detail);
      window.addEventListener("week05-embedding-state", this.onState);
      this.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-emb]");
        if (!b) return;
        const S2 = await window.W5ServicesReady;
        if (b.dataset.emb === "load") S2.embedding.load().catch(() => {});
        if (b.dataset.emb === "retry") { S2.embedding.reset(); S2.embedding.load().catch(() => {}); }
      });
      this.addEventListener("change", async (e) => {
        if (!e.target.matches("[data-emb-host]")) return;
        const S2 = await window.W5ServicesReady;
        S2.embedding.setHost(e.target.value);
      });
      this.render(window.W5EmbeddingState || { phase: "idle", message: "尚未加载", files: {} });
    }
    disconnectedCallback() {
      window.removeEventListener("week05-embedding-state", this.onState);
    }
    render(st) {
      const files = Object.entries(st.files || {}), total = files.reduce((n, [, f]) => n + (f.total || 0), 0), loaded = files.reduce((n, [, f]) => n + (f.loaded || 0), 0), pct = st.phase === "ready" ? 100 : total ? Math.round((loaded / total) * 100) : 0;
      const label = { idle: "未加载", library: "载入程序库", host: "检查下载地址", downloading: "取得模型文件", ready: "已就绪", error: "加载失败" }[st.phase] || st.phase;
      const mb = (x) => (x / 1048576).toFixed(1);
      let host = "";
      try { host = localStorage.getItem("week05/v3/embeddingHost") || ""; } catch {}
      const busy = ["library", "host", "downloading"].includes(st.phase);
      this.innerHTML = `<div class="emb-status emb-${E(st.phase)}"><div class="emb-head"><b>${E(label)}</b><span>${E(st.phase === "downloading" && total ? `${pct}%　${mb(loaded)} / ${mb(total)} MB` : "")}</span></div><div class="emb-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${busy || st.phase === "ready" ? pct || (busy ? 4 : 0) : 0}%"></i></div><p role="status">${E(st.message || "")}</p>${files.length ? `<table class="kv emb-files"><thead><tr><th>文件</th><th>大小</th><th>状态</th></tr></thead><tbody>${files.map(([n, f]) => `<tr><td>${E(n)}</td><td>${f.total ? mb(f.loaded || 0) + " / " + mb(f.total) + " MB" : "—"}</td><td>${E({ initiate: "开始", download: "下载中", progress: "下载中", done: "完成", ready: "就绪" }[f.status] || f.status || "")}</td></tr>`).join("")}</tbody></table>` : ""}<div class="emb-actions"><button data-emb="load" ${busy ? "disabled" : ""}>${st.phase === "ready" ? "检查嵌入模型" : "加载嵌入模型"}</button>${st.phase === "error" ? '<button data-emb="retry">重试</button>' : ""}<label>权重来源<select data-emb-host ${busy ? "disabled" : ""}><option value="" ${host ? "" : "selected"}>自动（先 huggingface.co，不通则 hf-mirror.com）</option><option value="https://huggingface.co/" ${host === "https://huggingface.co/" ? "selected" : ""}>huggingface.co</option><option value="https://hf-mirror.com/" ${host === "https://hf-mirror.com/" ? "selected" : ""}>hf-mirror.com（国内镜像）</option></select></label></div><p class="caption">程序库先从本站载入，失败时改用 jsDelivr；权重约 118 MB，只下载一次，之后从浏览器缓存读取。各页“实时编码”与这里共用同一个模型。</p></div>`;
    }
  }
  customElements.get("embedding-status") || customElements.define("embedding-status", EmbeddingStatus);
})();
