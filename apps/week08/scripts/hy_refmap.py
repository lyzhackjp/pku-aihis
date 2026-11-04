"""CBDB 出处题名（《華陽集》）→ 四庫全書本中的篇（卷、行）。公开与本机两个材料包的构建脚本共用。
CBDB 用简称（如“龐莊敏公神道碑”），四库本多用全衔（“……贈司空兼侍中龎公神道碑銘”），所以按 huayangji_refkeys.json 中逐条编写的关键字找篇题，
再看篇题后 120 行内有无对方的名（不含姓），作为对得上的佐证。结果是课件的对照，待核。"""
import json, pathlib, re
KEYS = json.loads((pathlib.Path(__file__).with_name('huayangji_refkeys.json')).read_text(encoding='utf-8'))['keys']
V = str.maketrans({'吕': '呂', '夀': '壽', '辠': '辜', '冦': '寇', '龎': '龐', '髙': '高', '衞': '衛', '禄': '祿', '謚': '諡', '戸': '户', '将': '將', '寜': '寧', '巻': '卷'})
def title_of(ref):
    t = re.sub(r'\(.*', '', ref.split('/')[0].strip()).translate(V)
    return re.sub(r'^《華陽集》卷.“|”$', '', t)
def refmap(juans, edges):
    """juans: {卷号: [行]}；edges: [(ref, target)]。返回 {ref: {juan, line, head, evidence}}。"""
    T = {int(j): [l.translate(V) for l in ls] for j, ls in juans.items()}
    out = {}
    for ref, target in edges:
        if not ref or '華陽集' not in ref or ref in out: continue
        k = KEYS.get(title_of(ref))
        if not k: out[ref] = {'juan': None, 'evidence': '未编关键字'}; continue
        hits = [(j, i) for j in sorted(T) for i, l in enumerate(T[j]) if re.search(k, l)]
        tg = re.sub(r'\(.*', '', target or ''); gn = tg[1:] if len(tg) >= 2 and not tg.endswith('氏') else ''
        best, ev = None, ''
        for j, i in hits:
            if gn and gn in ''.join(T[j][i:i + 120]): best, ev = (j, i), f'篇题相合，正文有“{gn}”'; break
        if not best and hits: best, ev = hits[0], (f'篇题相合，正文未见“{gn}”' if gn else '篇题相合')
        if best:   # 有的篇题接在上一篇正文行末（维基文库录入未分行）：记下篇题在行内的起点
            l = T[best[0]][best[1]]; m = re.search(k, l); st = max(0, m.start() - 90) if m.start() > 200 else 0   # 四库本无句读，篇题起点无从断定，取篇题关键字前 90 字
        out[ref] = {'juan': best[0], 'line': best[1], 'pos': st, 'head': T[best[0]][best[1]][st:st + 80], 'evidence': ev} if best else {'juan': None, 'evidence': '四庫本《華陽集》中未找到相应篇题（CBDB 所据或为别本，或篇已佚）'}
    return out
