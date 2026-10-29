#!/usr/bin/env python3
"""从本机材料包中取出许可允许公开再发布的部分，写成随课件发布的公开材料（data/public/week07-public-pack.js）。

只收以下几类（许可核对见 docs/week07/licensing-20261029.md）：
  ndl       Web NDL Authorities 典拠 JSON：国立国会图书馆书志、典拠数据无偿利用（CC BY 相当），须注明取自 Web NDL Authorities
  images    NDL 数字收藏中“インターネット公開（保護期間満了）”的页影：自由利用，不需申请；注明出处
  texts     维基文库录文（《宋史》卷三一二选段、《續資治通鑑》卷六十八、《建炎以來繫年要錄》卷169/170/175 相关句）：CC BY-SA 4.0
  calendar  DDBC／DILA 時間規範資料庫：CC BY-SA 3.0
  hipe      HIPE-2026 数据（impresso 英文训练集）：CC BY-NC-SA 4.0（非商业、相同方式共享）
  teach、其余 texts、runs.d25_langextract：教师自己的材料与课前运行记录（教学文件夹原件、讲义所录节录、人工参照转录、LangExtract 实跑），
            教师 2026-10-29 决定公开；不含 CBDB 数据
不收：CBDB 接口返回与含有它的 D01 运行记录（教师 2026-10-29 决定仍课堂导入）。
用法：python3 build_public_pack.py <week07-pack.json> <输出 .js>"""
import json, sys, hashlib, time

SRC, OUT = sys.argv[1:3]
p = json.load(open(SRC, encoding="utf8"))
PUBLIC_TEXTS = list(p["texts"].keys())
out = {
    "format": "pku-aihis-week07-public-pack", "version": 1, "built": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    "notice": "随第七周课件公开发布的史料与数据。各部分许可不同，转用时请按 attribution 注明出处并遵守各自许可；本文件按部分分别授权，不构成合并作品。",
    "ndl": p["ndl"], "images": p["images"], "calendar": p["calendar"], "hipe": p["hipe"],
    "texts": {k: p["texts"][k] for k in PUBLIC_TEXTS},
    "teach": p["teach"], "runs": {"d25_langextract": p["runs"]["d25_langextract"]},
    "attribution": {
        "ndl": {"license": "国立国会図書館の書誌・典拠データ：営利・非営利を問わず無償で利用可能（CC BY 相当）", "credit": "Web NDL Authorities（国立国会図書館典拠データ検索・提供サービス）から取得したデータ。取得日 " + p["ndl"].get("queried", ""), "url": "https://id.ndl.go.jp/auth/ndla/"},
        "images": {"license": "国立国会図書館デジタルコレクション「インターネット公開（保護期間満了）」：自由に利用可、申請不要", "credit": "出典：国立国会図書館デジタルコレクション『大日本史料』第9編之1（info:ndljp/pid/3450611）、『新増補浮世絵類考』（info:ndljp/pid/994737）", "url": "https://www.ndl.go.jp/use/reproduction/"},
        "texts": {"license": "CC BY-SA 4.0", "credit": "維基文庫（zh.wikisource.org）：《宋史》卷三一二、《續資治通鑑》卷六十八、《建炎以來繫年要錄》卷一百六十九、一百七十、一百七十五；本课件节取相关句，未改字", "url": "https://creativecommons.org/licenses/by-sa/4.0/"},
        "calendar": {"license": "CC BY-SA 3.0", "credit": p["calendar"].get("source", "DDBC／DILA 時間規範資料庫"), "url": "https://creativecommons.org/licenses/by-sa/3.0/"},
        "teach": {"license": "教师自有材料，教师 2026-10-29 决定随课件公开", "credit": "第七讲教学文件夹：讲义 4.2 抽取记录（Qwen3-4B-Instruct-2507 Q4_K_M 本机运行）、NDLOCR-Lite 识读输出、TEI 校验记录、人工参照转录、未决问题说明；转录与识读对象为保护期已满的 NDL 页影", "url": ""},
        "runs": {"license": "课前运行记录，随课件公开", "credit": "LangExtract 3a68580 课前实跑（2026-10-28），模型 Qwen3-4B-Instruct-2507 Q4_K_M", "url": ""},
        "hipe": {"license": "CC BY-NC-SA 4.0（非商业、相同方式共享）", "credit": f"HIPE-2026 Shared Task data（hipe-eval/HIPE-2026-data，提交 {p['hipe'].get('commit','')}，{p['hipe'].get('file','')}）", "url": "https://github.com/hipe-eval/HIPE-2026-data"},
    },
}
assert "cbdb" not in out and set(out["runs"]) == {"d25_langextract"}
blob = json.dumps(out, ensure_ascii=False)
for marker in ("PersonAuthority", "cbdbapi", "BasicInfo"): assert marker not in blob, marker  # 不含 CBDB 接口返回
body = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
js = "/* 第七周公开材料（由 apps/week07/scripts/build_public_pack.py 生成；许可见 attribution 字段与 docs/week07/licensing-20261029.md）。 */\nwindow.W7_PUBLIC_PACK = " + body + ";\n"
open(OUT, "w", encoding="utf8").write(js)
print(OUT, len(js.encode()), "bytes", hashlib.sha256(js.encode()).hexdigest())
for k in ("ndl", "images", "texts", "calendar", "hipe", "teach", "runs"): print(" ", k, len(json.dumps(out[k], ensure_ascii=False)))
