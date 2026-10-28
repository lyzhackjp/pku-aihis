#!/usr/bin/env python3
"""生成第七周“材料包”（只存本机，课堂现场导入；不进公开构建）。

教师 2026-10-28 决定：所有原始数据不上公开站点，现场导入；制作课件时可本地试跑。
本脚本把以下来源打成一个 JSON：
  cbdb/      CBDB 接口原始返回（按名 JSON 与 HTML、各编号 JSON）
  ndl/       NDL 典拠 JSON
  hipe/      HIPE-2026-data v1.0 英文训练集（CC BY-NC-SA 4.0）
  wikisource/ 维基文库原始 wikitext（宋史卷312、續資治通鑑卷068、建炎以來繫年要錄卷169/170/175）
  ndl_iiif/  NDL デジタルコレクション页影（PDM），按讲义页序裁半页并缩小
  runs/      D01 智能体运行记录、D25 LangExtract 运行记录
  calendar   DDBC 時間規範資料庫中日朔闰表（CC BY-SA 3.0）
  teach/     教学文件夹原件（week07/source/）：讲义 4.2 抽取记录、NDLOCR-Lite 识读输出、TEI 校验记录、人工参照转录、未决问题说明
用法：python3 build_week07_pack.py <raw 目录> <runs 目录> <calendar.json> <讲义.typ> <输出 json> [<source 目录>]
"""
import json, sys, os, re, base64, io, hashlib, datetime
from PIL import Image

RAW, RUNS, CAL, TYP, OUT = sys.argv[1:6]
SRC = sys.argv[6] if len(sys.argv) > 6 else None
J = lambda p: json.load(open(p, encoding="utf8"))
T = lambda p: open(p, encoding="utf8").read()
sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
files = []
def reg(p, note=""):
    files.append({"file": os.path.relpath(p, RAW) if p.startswith(RAW) else os.path.basename(p), "sha256": sha(p), "bytes": os.path.getsize(p), "note": note}); return p

pack = {"format": "pku-aihis-week07-pack", "version": 1, "built": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "notice": "课堂现场导入的本机材料包；含第三方原始数据与页影，不得放入公开构建。",
        "licenses": {"cbdb": "CBDB License（见 cbdb.hsites.harvard.edu）", "ndl_authorities": "NDL 利用条件", "hipe": "CC BY-NC-SA 4.0",
                     "wikisource": "CC BY-SA 4.0（维基文库）", "ndl_images": "PDM（NDL IIIF 元数据 Access Restrictions）", "calendar": "CC BY-SA 3.0（DDBC／DILA）"}}

# ---------- CBDB ----------
html = T(reg(f"{RAW}/cbdb/name_wanggui.html", "按名“王珪”网页，2026-10-28 11:49 curl"))
body = re.sub(r"<script.*?</script>|<style.*?</style>", "", html, flags=re.S)
items = re.findall(r">([^<>|]{1,20})</[^>]+>\s*<[^>]+>\s*(\d{3,7})\s*<", body)
lst = []
txt = re.sub(r"<[^>]+>", "|", body); txt = re.sub(r"\|[\s|]*", "|", txt)
m = re.search(r"搜尋結果：「王珪」\s*\|(.*?)\|載入中", txt, re.S)
toks = m.group(1).split("|") if m else []
for i in range(0, len(toks) - 1, 2): lst.append({"label": toks[i].strip(), "id": toks[i + 1].strip()})
pack["cbdb"] = {"queried": "2026-10-28T11:49+08:00", "api": "https://cbdb.fas.harvard.edu/cbdbapi/person.php",
                "name_query": {"name": "王珪", "html_list": lst, "json": J(reg(f"{RAW}/cbdb/name_wanggui.json", "按名“王珪”JSON"))},
                "persons": {}}
for f in sorted(os.listdir(f"{RAW}/cbdb")):
    mm = re.match(r"cbdb_(\d+)\.json$", f)
    if mm and os.path.getsize(f"{RAW}/cbdb/{f}"): pack["cbdb"]["persons"][mm.group(1)] = J(reg(f"{RAW}/cbdb/{f}", f"编号 {mm.group(1)}"))

# ---------- NDL ----------
pack["ndl"] = {"queried": "2026-10-28T11:49+08:00", "records": {re.match(r"ndl_(\d+)\.json", f).group(1): J(reg(f"{RAW}/ndl/{f}"))
               for f in sorted(os.listdir(f"{RAW}/ndl")) if f.endswith(".json")}}

# ---------- HIPE ----------
hp = f"{RAW}/hipe/HIPE-2026-v1.0-impresso-train-en.jsonl"
pack["hipe"] = {"repo": "hipe-eval/HIPE-2026-data", "commit": T(f"{RAW}/hipe/COMMIT.txt").strip(), "file": "data/newspapers/v1.0/HIPE-2026-v1.0-impresso-train-en.jsonl",
                "docs": [json.loads(l) for l in open(reg(hp, "英文训练集"), encoding="utf8")]}

# ---------- 文本 ----------
L = T(TYP).split("\n")
def block_after(title):
    i = next(k for k, l in enumerate(L) if l.startswith("== " + title))
    j = next(k for k in range(i, len(L)) if L[k].startswith("#block"))
    out = []
    for k in range(j + 1, len(L)):
        if L[k].startswith("]"): break
        if L[k].startswith("#set"): continue
        if L[k].strip(): out.append(L[k].strip())
    return "\n".join(out)
def wiki(f, pat, w=120):
    s = T(reg(f"{RAW}/wikisource/{f}", "维基文库 wikitext，2026-10-28"))
    return [x.group(0) for x in re.finditer(r"[^。\n]{0,%d}%s[^。\n]{0,%d}" % (w, pat, w), s)]
pack["texts"] = {
    "songshi_wanggui_excerpt": {"title": "《宋史》卷三一二《王珪传》选段（讲义附录练习材料一）", "source": "维基文库 宋史/卷312（底本未注明）", "text": block_after("练习材料一")},
    "ruiko_toyokuni": {"title": "『新増補浮世絵類考』“歌川豐國”条（讲义附录练习材料二，目验转录，待核）", "source": "NDL 994737 PDF 页序 52—53", "text": block_after("练习材料二")},
    "dnsr_p1_excerpt": {"title": "『大日本史料』9-1 本文第 1 页（讲义 @fig-dnsr 所录节录；括注照录）", "source": "NDL 3450611 PDF 页序 29 左半",
                        "text": open(os.path.join(RUNS, "input_dnsr_p1.txt"), encoding="utf8").read().strip()},
    "xzztj_068": {"title": "《續資治通鑑》卷六十八（相关句）", "lines": wiki("xzztj_068.wiki", "王珪參知政事", 60)},
    "xnyl": {k: {"title": f"《建炎以來繫年要錄》（四庫全書本）卷{k}（相关句）", "lines": wiki(f"xnyl_{k}.wiki", "王[珪圭]", 80)} for k in ("169", "170", "175")},
}

# ---------- 页影 ----------
def img(path, half, h=1600, note=""):
    im = Image.open(reg(path, note)).convert("RGB"); w, H = im.size
    if half == "L": im = im.crop((0, 0, w // 2, H))
    if half == "R": im = im.crop((w // 2, 0, w, H))
    im.thumbnail((10000, h)); b = io.BytesIO(); im.save(b, "JPEG", quality=82)
    return {"dataUrl": "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode(), "width": im.size[0], "height": im.size[1], "note": note}
I = f"{RAW}/ndl_iiif"
pack["images"] = {
    "dnsr_p1": img(f"{I}/ndl3450611_p029.jpg", "L", note="『大日本史料』9-1 本文第 1 页＝NDL 3450611 PDF 页序 29 左半（PDM）"),
    "dnsr_p2": img(f"{I}/ndl3450611_p030.jpg", "R", note="本文第 2 页＝页序 30 右半"),
    "dnsr_hanrei": img(f"{I}/ndl3450611_p006.jpg", "", h=1400, note="凡例末条所在＝页序 6（整页）"),
    "ruiko_85": img(f"{I}/ndl994737_p052.jpg", "L", note="『新増補浮世絵類考』印刷页八十五＝NDL 994737 页序 52 左半（PDM）"),
    "ruiko_86": img(f"{I}/ndl994737_p053.jpg", "R", note="印刷页八十六＝页序 53 右半"),
}

# ---------- 运行记录与历表 ----------
pack["runs"] = {}
for k, f in (("d01_agent", "d01_agent_run_20261028.json"), ("d01_attempt1_403", "d01_attempt1_403.json"), ("d25_langextract", "out_d25/d25_langextract_run_20261028.json")):
    p = os.path.join(RUNS, f)
    if os.path.exists(p): pack["runs"][k] = J(reg(p))
pack["calendar"] = J(reg(CAL, "DDBC 中日朔闰表，build_calendar.py 生成"))

# ---------- 教学文件夹原件 ----------
def recover(raw):
    """截断的 JSON：逐个读出 mentions／events 数组中完整闭合的对象（容错读出，原始回复保留）。"""
    out = {"mentions": [], "events": []}
    for key in out:
        k = raw.find('"%s"' % key)
        if k < 0: continue
        i = raw.find("[", k) + 1; depth = 0; start = None; instr = False; esc = False
        while 0 < i < len(raw):
            c = raw[i]
            if instr:
                if esc: esc = False
                elif c == "\\": esc = True
                elif c == '"': instr = False
            elif c == '"': instr = True
            elif c == "{":
                if depth == 0: start = i
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0 and start is not None:
                    try: out[key].append(json.loads(raw[start:i + 1]))
                    except Exception: pass
                    start = None
            elif c == "]" and depth == 0: break
            i += 1
    return out
if SRC:
    E = os.path.join(SRC, "抽取运行记录"); OCR = os.path.join(SRC, "识读运行记录"); TEI = os.path.join(SRC, "TEI校验记录")
    ex = {}
    for f in sorted(os.listdir(E)):
        if not f.endswith(".json"): continue
        d = J(reg(os.path.join(E, f), "讲义 4.2 抽取记录（2026-10-24）"))
        rec = {k: d[k] for k in d if k not in ("messages",)}
        rec["system"] = next((m["content"] for m in d["messages"] if m["role"] == "system"), "")
        rec["user"] = next((m["content"] for m in d["messages"] if m["role"] == "user"), "")
        if d.get("parsed") is None and d.get("raw_content"):
            rec["recovered"] = recover(d["raw_content"]); rec["recovered_note"] = "原始回复因达到词元上限被截断、不是合法 JSON；recovered 为逐个读出的完整对象，最后一个未闭合的对象不计"
        ex[f[:-5]] = rec
    inputs = {f[:-4]: T(reg(os.path.join(E, "input", f), "抽取输入")) for f in sorted(os.listdir(os.path.join(E, "input"))) if f.endswith(".txt")}
    ocr = {}
    for book in sorted(os.listdir(OCR)):
        for f in sorted(os.listdir(os.path.join(OCR, book))):
            if f.endswith(".txt"):
                base = f[:-4]; js = J(reg(os.path.join(OCR, book, base + ".json"), "NDLOCR-Lite 原始输出"))
                lines = [{"text": x.get("text"), "conf": x.get("confidence"), "box": x.get("boundingBox"), "vertical": x.get("isVertical")} for page in js.get("contents", []) for x in page]
                ocr[book + "/" + base] = {"text": T(reg(os.path.join(OCR, book, f), "NDLOCR-Lite 文本")), "lines": lines}
    def svrl(fn):
        x = T(reg(os.path.join(TEI, fn), "Schematron SVRL 结果"))
        return {"failed_assert": x.count("<svrl:failed-assert"), "successful_report": x.count("<svrl:successful-report"),
                "messages": re.findall(r"<svrl:text>(.*?)</svrl:text>", x, re.S)[:5]}
    tei = {"readme": T(reg(os.path.join(TEI, "README.md"))),
           "docs": {f[:-4]: T(reg(os.path.join(TEI, f), "TEI 示例")) for f in ("doc1_section1-4.xml", "doc2_kuozhan8.xml", "bad3.xml")},
           "svrl": {"doc1_section1-4": svrl("svrl_doc1_section1-4.xml"), "doc2_kuozhan8": svrl("svrl_doc2_kuozhan8.xml"), "bad3": svrl("svrl_bad3.xml")}}
    refs = {f[:-4]: T(reg(os.path.join(SRC, "人工参照转录", f), "人工参照转录（300 dpi 页影目验）")) for f in sorted(os.listdir(os.path.join(SRC, "人工参照转录"))) if f.endswith(".txt")}
    pack["teach"] = {"source": "教学文件夹第七周 demo/ 原件（2026-10-28 复制到 week07/source/）", "extract": ex, "extract_readme": T(reg(os.path.join(E, "README.md"))),
                     "inputs": inputs, "ocr": ocr, "tei": tei, "reference": refs, "unresolved": T(reg(os.path.join(SRC, "未决问题说明_week07.md")))}
    pack["texts"]["dnsr_p1_reference"] = {"title": "『大日本史料』9-1 本文第 1 页人工参照转录（保留编者括注）", "source": "教学文件夹 人工参照转录", "text": refs.get("dnsr_9-1_p1_reference", "")}
pack["files"] = files
json.dump(pack, open(OUT, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
print(OUT, os.path.getsize(OUT) // 1024, "KB;", len(files), "source files;", len(lst), "name-list items;", len(pack["cbdb"]["persons"]), "persons")
