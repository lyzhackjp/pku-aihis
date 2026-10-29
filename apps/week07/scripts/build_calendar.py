# 生成第七周历表：DDBC 時間規範資料庫（CC BY-SA 3.0，2012-02 版）中、日两套朔闰表
# 用法：python3 build_calendar.py <dila 解压目录> <输出 json>
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
from parse_ddbc import load
src, out = sys.argv[1], sys.argv[2]
res = {"source": "DDBC／DILA 時間規範資料庫（authority_time_chinese、authority_time_japanese，2012-02 版；日本历据須賀隆提供的数据），CC BY-SA 3.0",
       "fields": {"eras": "[id, 名称列表, 国别, 朝代, 帝王]", "months": "era_id → [[年, 月序, 月名, 闰, 朔日儒略日数, 天数, 状态 S/P], ...]"},
       "eras": [], "months": {}}
for country, sub in (("zh", "authority_time_chinese/authority_time_chinese.sql"), ("ja", "authority_time_japanese/authority_time_japanese.sql")):
    T = load(os.path.join(src, sub))
    nm = lambda rows: {r[0]: [x[1] for x in sorted([x for x in rows if x[0] == r[0]], key=lambda x: int(x[2]))] for r in rows}
    era_n, emp_n, dyn_n = nm(T["t_era_names"]), nm(T["t_emperor_names"]), nm(T["t_dynasty_names"])
    emp_dyn = {e: d for e, d in T["t_emperor"]}
    for era, emp in T["t_era"]:
        res["eras"].append([int(era), era_n.get(era, []), country, (dyn_n.get(emp_dyn.get(emp), [""]) or [""])[0], (emp_n.get(emp, [""]) or [""])[0]])
    for r in T["t_month"]:
        first, last = int(r[6]), int(r[7])
        res["months"].setdefault(r[5], []).append([int(r[1]), int(r[2]), r[3], int(r[4]), first, last - first + 1, r[10]])
for k in res["months"]: res["months"][k].sort(key=lambda m: m[4])
json.dump(res, open(out, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
print(len(res["eras"]), "eras", sum(len(v) for v in res["months"].values()), "months", os.path.getsize(out) // 1024, "KB")
