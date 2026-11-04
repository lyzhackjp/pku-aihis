#!/usr/bin/env python3
"""第八周本机材料包补充（D15—D22）：CHGIS TGAZ 查询快照、Kanripo《宋史》卷三一二王珪传两个数字本、JBDB 年号表、王珪边表上的智能体运行记录。
再发布许可未见说明或含 CBDB 记录，只进本机材料包。用法：python3 build_local_extra.py <原始数据目录> <week08-pack.json>"""
import json, pathlib, sys, hashlib
raw, packp = map(pathlib.Path, sys.argv[1:3])
pack = json.loads(packp.read_text(encoding='utf-8')); files = pack.setdefault('files', [])
def reg(p, note): files.append({'file': p.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'note': note}); return p
x = pack.setdefault('extra', {})
t = raw / 'tgaz_20261103' / 'tgaz_queries.json'
if t.exists(): x['tgaz'] = json.loads(reg(t, 'CHGIS TGAZ 接口查询快照（D16、D18）').read_text(encoding='utf-8'))
k = raw / 'kanripo_songshi' / 'wanggui_zhuan.json'
if k.exists():
    w = json.loads(reg(k, 'Kanripo KR2a0032 卷312 王珪传（WYG 与 master 两个分支）').read_text(encoding='utf-8'))
    x['kanripo_wanggui'] = {'title': '《宋史》卷三一二王珪传（漢籍リポジトリ Kanripo KR2a0032）', 'witnesses': {'WYG': {'label': 'Kanripo WYG 分支（文淵閣四庫全書本录文）', 'text': w['WYG']}, 'master': {'label': 'Kanripo master 分支（以 WYG 为底本的规范化本）', 'text': w['master']}},
                            'url': 'https://github.com/kanripo/KR2a0032', 'obtained': '2026-11-03 经 raw.githubusercontent.com 取得 KR2a0032_312.txt', 'license': '仓库未见许可证文件，只在本机使用'}
n = raw / 'jbdb_20261102' / 'nengocodes_240_260.json'
if n.exists(): x['jbdb_nengo'] = json.loads(reg(n, 'JBDB NengoCodes 240—260（D21 和暦换算）').read_text(encoding='utf-8'))
lr = raw / 'llm_20261103'
if lr.exists():
    x['runs'] = {}
    for p in sorted(lr.glob('agent_*cbdb*.json')):
        r = json.loads(reg(p, '王珪边表上的智能体运行记录').read_text(encoding='utf-8'))
        for c in r.get('calls', []): c.pop('response', None)
        x['runs'][p.stem] = r
    if (lr / 'tasks').exists(): x['agent_tasks_cbdb'] = {k: (lr / 'tasks' / f'{k}_cbdb.md').read_text(encoding='utf-8') for k in ('bad', 'good')}
# 教师本机实际操作的 QGIS、Gephi 截图（2026-11-04；含 CHGIS 坐标与 CBDB 人名，只进本机材料包）。复制到材料包旁的 shots/，页面按材料包地址取图
sh = raw / 'shots_20261104'
if sh.exists():
    import shutil
    dst = packp.parent / 'shots'; dst.mkdir(exist_ok=True)
    CAP = {'Q01_底图': '浏览器面板 XYZ Tiles 中加 OpenStreetMap 底图', 'Q02_添加分隔文本': '添加分隔文本图层：X＝lng，Y＝lat，EPSG:4326，编码 UTF-8', 'Q03_点图层': '9 个点上图；成都与華陽同一坐标，看上去只有 8 个点',
           'Q04_属性表': '属性表：每个点带着 CHGIS 名称、编号、起讫年', 'Q05_连接': '属性连接：按 name 把引句表接进来，前缀 ev_', 'Q06_连接后属性表': '连接后每个点多出原文引句与出处两列',
           'Q07_分类符号': '符号化：按 ev_source 分类着色', 'Q08_符号化结果': '两种出处两种颜色，带地名标注', 'Q09_打印布局': '打印布局（在空项目中重做）：地图、图例、比例尺、指北针与出处文字框', 'Q10_出图': '导出的图。可作“出图前检查”的反例：地图只框住成都一带，其余 8 个点在图外；文字框压住指北针，图例末行被截断',
           'Q13_关于QGIS': '关于 QGIS：3.44.15-Solothurn；已激活 SpatialAnalysisAgent-master 1.4（GIS Copilot）', 'Q11_GCJ偏移': '叠在高德底图上放大到成都：WGS 84 的点与 GCJ-02 底图的偏差', 'Q12_插件情况': '插件库搜索 Copilot：可见 AutonomousGIS-SpatialAnalysisAgent、AI Agent by TerraLab 等',
           'G01_导入节点': '导入电子表格：先导节点表', 'G02_导入报告': '导入边表后：85 个节点、84 条边（13 对人的平行边已合并）', 'G03_数据资料': '数据资料：逐行查看边与出处', 'G04_统计': '统计：平均度 1.976；模块化 0（星形网络分不出社群）',
           'G05_布局': 'ForceAtlas 2（防止重叠）', 'G06_外观': '外观：按度着色', 'G07_过滤': '过滤：按边的属性分区', 'G08_预览': '预览：中文标签要设中文字体', 'G09_王珪97': '导出的图（过滤后）', 'G10_王珪24': '去掉纪念文字后的 24 条、20 人'}
    x['shots'] = {'date': '2026-11-04', 'machine': '教师本机（QGIS 3.44.15、Gephi 0.11.4，macOS）', 'qgis': [], 'gephi': []}
    for f in sorted(sh.glob('*.jpg')):
        shutil.copy2(f, dst / f.name); reg(f, '教师本机操作截图')
        x['shots']['gephi' if f.name.startswith('G') else 'qgis'].append({'file': 'shots/' + f.name, 'caption': CAP.get(f.stem, f.stem)})
# CBDB 出处题名 → 四庫本《華陽集》的篇（D01、D23 回原文）；行号按公开材料包中的《華陽集》文本
pub = pathlib.Path(__file__).resolve().parents[1] / 'prototype/data/public/week08-public-pack.js'
cb = pack.get('materials', {}).get('cbdb-wanggui')
if pub.exists() and cb:
    from hy_refmap import refmap
    js = pub.read_text(encoding='utf-8'); P = json.loads(js[js.index('{'):js.rindex('}') + 1])
    allj = {int(k): v['lines'] for t in ('huayangji', 'huayangji_early') for k, v in P['texts'].get(t, {}).get('juan', {}).items()}
    x['hy_refmap'] = refmap(allj, [(e.get('ref'), next((n.get('label') for n in cb.get('nodes', []) if n.get('id') == e.get('t')), '')) for e in cb['edges']])
packp.write_text(json.dumps(pack, ensure_ascii=False), encoding='utf-8')
print(packp, f'{packp.stat().st_size / 1e6:.1f} MB', list(x))
