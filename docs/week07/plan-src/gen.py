import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pages import P
from papers import Q
from decisions import apply
P = apply(P)

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for p in P:
    for k in p.get("quotes", []): assert k in Q, k
json.dump(P, open(f"{out}/page-map.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
json.dump(Q, open(f"{out}/papers.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)

LAY = {"hero": "封面／结语", "flow4": "四栏流程", "diagram": "示意图", "workbench": "工作台", "through": "贯穿", "concepts": "概念表"}
L = ["# 第七讲演示：逐页内容稿（候选，待教师确认）", "",
     "版本：2026-10-28（教师 11:44 答复七项后修订：D13 并入 D12、D15 并入 D14，30 页，旧 ID 作别名跳转）。依据：`week07/source/讲义_week07.typ`（2026-10-27 修订版，净教学 172 分钟）。本稿由 `page-map.json` 生成，改页表后重新生成。",
     "原句状态：✔ 已取原文逐字核对（2026-10-28 补核 5 条后全部为 ✔）；△ 讲义称已核、尚未取到原文。", ""]
sec = None
for p in P:
    if p["section"] != sec:
        sec = p["section"]
    L += [f"## {p['id']}　{p['title']}" + (f"（含原 {'、'.join(p['aliases'])}）" if p.get('aliases') else ""), "",
          f"- **节次／锚点**：{p['section']}／{p.get('anchor','')}　**版式**：{LAY[p['layout']]}（{p['layout']}{'，深色' if p.get('theme')=='dark' else ''}）　**建议时长**：{p.get('minutes',0)} 分",
          f"- **过渡句**：{p['transition']}",
          f"- **本页问题**：{p['question']}"]
    if p.get("steps"): L.append(f"- **步骤**：{' → '.join(p['steps'])}")
    L += [f"- **演示区**：{p['demo']}",
          f"- **学生操作**：{p['student_operation']}",
          f"- **可见结果**：{p['observable_output']}"]
    if p.get("presets"): L.append("- **讲义数值预设**：" + "；".join(p["presets"]))
    L += [f"- **运行模式**：{p['mode']}",
          f"- **讲义依据**：{p['lesson_evidence']}",
          f"- **数据与待取材料**：{p['data']}"]
    if p.get("concepts"): L.append(f"- **本页首次出现的概念**：{'、'.join(p['concepts'])}")
    if p.get("through"): L.append(f"- **贯穿阶段**：{p['through']}")
    if p.get("options"):
        o = p["options"]; L.append(f"- **交互方案**：A {o['A']}；B {o['B']}；推荐 {o['recommend']}")
    for k in p.get("quotes", []):
        q = Q[k]; mark = "✔" if q["status"].startswith("verified") else "△"
        L.append(f"- **原句 {mark}**（{q['cite']}）：“{q['en']}”——{q['zh']}" + (f"〔注：{q['note']}〕" if q["note"] else ""))
    n = p["notes"]
    L += [f"- **备注·目的**：{n['purpose']}", f"- **备注·引导**：{n['guide']}", f"- **备注·机制**：{n['mechanism']}",
          f"- **页脚**：{p['footer']}", ""]
open(f"{out}/逐页内容.md", "w", encoding="utf8").write("\n".join(L))

mins = sum(p.get("minutes", 0) for p in P)
print(len(P), "pages", mins, "min")
# 节次汇总
from collections import OrderedDict
agg = OrderedDict()
for p in P:
    s = p["section"].split(".")[0]; agg.setdefault(s, [0, []]); agg[s][0] += p.get("minutes", 0); agg[s][1].append(p["id"])
for k, (m, ids) in agg.items(): print(k, m, ids[0] + "—" + ids[-1] if len(ids) > 1 else ids[0])
