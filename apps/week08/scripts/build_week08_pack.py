#!/usr/bin/env python3
"""第八周本机材料包：CBDB 王珪记录、『梅颸日記』十段（录文与影像）、JBDB 查询结果。只在教师电脑生成与保存，不入 Git、不随课件发布。
用法：python3 build_week08_pack.py <原始数据目录> <cbdb_1845.json> <梅颸導入包目录> <JBDB 查询目录> <输出 week08-pack.json>
只用标准库。"""
import base64, csv, hashlib, json, pathlib, sys, datetime, collections

raw, cbdbjson, meishi, jbdb, out = map(pathlib.Path, sys.argv[1:6])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
files = []
def reg(p, note): files.append({'file': p.name, 'sha256': sha(p), 'bytes': p.stat().st_size, 'note': note}); return p

# ---------- CBDB ----------
ep = reg(raw / 'cbdb_1845_社会关系边表_20261029.csv', '由第七周 cbdb_1845.json（2026-10-22 API）转出的社会关系边表')
rows = list(csv.DictReader(ep.open(encoding='utf-8-sig')))
person = json.loads(reg(cbdbjson, 'CBDB API 2026-10-22 原始返回').read_text(encoding='utf-8'))['Package']['PersonAuthority']['PersonInfo']['Person']
arr = lambda v, k: (v or {}).get(k) if isinstance((v or {}).get(k), list) else ([v[k]] if v and v.get(k) else [])
assoc = arr(person.get('PersonSocialAssociation'), 'Association')
kin = arr(person.get('PersonKinshipInfo'), 'Kinship')
notes = []
for a in assoc:  # 附注（如“對方之妻子”）按对方编号与类型挂到边上
    key = (str(a.get('AssocPersonId')), a.get('AssocName'))
    extra = []
    if a.get('AssocKinRelName') not in (None, '', '未詳'): extra.append('附注：對方之' + a['AssocKinRelName'] + ('（' + a['AssocKinPersonName'] + '）' if a.get('AssocKinPersonName') not in (None, '', '未詳') else ''))
    if a.get('KinRelName') not in (None, '', '未詳'): extra.append('王珪之' + a['KinRelName'] + ('（' + a['KinPersonName'] + '）' if a.get('KinPersonName') not in (None, '', '未詳') else ''))
    if a.get('Notes'): extra.append('注：' + a['Notes'])
    if a.get('Pages'): extra.append('页：' + a['Pages'])
    notes.append((key, '；'.join(extra)))
MEMORIAL = {'為Y作墓誌銘', '為Y作神道碑', '為Y作祭文', '祭文由Y所作', '挽詩、詞由Y所作', '為Y作諡議', '為Y之神道碑作書', '神道碑由Y所作'}
edges = []
for i, r in enumerate(rows):
    e = {'s': r['source_id'], 't': r['target_id'], 'type': r['assoc_name'], 'code': r['assoc_code'], 'time_raw': r['year'], 'ref': r['text_title'], 'row': i + 2}
    key, n = notes[i]  # 边表与接口返回同序（由同一 JSON 依次转出），逐行对应并核对
    if key != (r['target_id'], r['assoc_name']): raise SystemExit(f'第 {i + 2} 行与接口返回不对应：{key} ≠ {(r["target_id"], r["assoc_name"])}')
    if n: e['note'] = n
    e['group'] = '纪念文字' if r['assoc_name'] in MEMORIAL else '其他'
    edges.append(e)
nodes = {r['source_id']: r['source'] for r in rows}; nodes.update({r['target_id']: r['target'] for r in rows})
cbdb = {'id': 'cbdb-wanggui', 'kind': 'network', 'title': 'CBDB 王珪（1845）社会关系 97 条',
        'card': {'unit': '人（王珪与其关系人，按 CBDB 人物编号）', 'edge_meaning': 'CBDB 编者从某一出处录出的一种关系，如“為Y作墓誌銘”',
                 'missing': '只收王珪本人的直接关系（自我中心网络）；关系人彼此之间不录；收录多少取决于编者用过的书，纪念文字多来自《華陽集》',
                 'time_precision': '多为缺省（0、-1），少数为推定或卒年', 'author': 'CBDB 项目', 'version': 'CBDB API，2026-10-22 取得（CBDB BJ 20260602）',
                 'location': 'PersonSocialAssociation，97 条', 'obtained': '第七周下载；第八周 2026-10-29 转为边表', 'nature': '实际数据',
                 'license': 'CC BY-NC-SA 4.0', 'visibility': '仅本机（课堂导入）'},
        'declare': {'directed': True, 'missing_time': ['0', '-1'], 'suspect_time': ['1085'], 'note': '1085 为王珪卒年；0、-1 的含义未见接口文档说明'},
        'nodes': [{'id': k, 'label': v} for k, v in nodes.items()], 'edges': edges,
        'kin': [{'id': str(k.get('KinPersonId')), 'name': k.get('KinPersonName'), 'rel': k.get('KinRelName')} for k in kin]}

# ---------- 『梅颸日記』 ----------
mrows = list(csv.DictReader(reg(meishi / 'passages.csv', '导入包录文').open(encoding='utf-8-sig')))
images = {}
for img in sorted((meishi / 'images').glob('*.png')):
    reg(img, '半页影像（带个人传送件水印，投影前裁去页脚）')
    images[img.name] = 'data:image/png;base64,' + base64.b64encode(img.read_bytes()).decode()
passages = []
for r in mrows:
    code = 'BS%02d' % int(r['id'])
    img = next((k for k in images if k.startswith(code + '_')), None)
    passages.append({'id': code, 'wareki': r['和暦'], 'year': int(r['西暦年']), 'month': int(r['月']), 'day': int(r['日']), 'page': r['全書頁'],
                     'pdf': r['影像文件'], 'pdf_page': r['影像頁(1起)'], 'side': r['頁側'], 'text': r['錄文'],
                     'persons': [x for x in r['人物（照錄文所見，未考證）'].split('；') if x], 'classroom': r['課堂展示'] == '是', 'note': r['備註'], 'image': img})
meishi_mat = {'id': 'meishi', 'kind': 'events', 'title': '『梅颸日記』十段（『頼山陽全書』本）',
              'card': {'unit': '日条', 'edge_meaning': '一条日记中赖静与所见人物的往来（由使用者判读）', 'missing': '随机抽取的十段；『頼山陽全書』只收前四十八年',
                       'time_precision': '日（和暦）', 'author': '頼静（梅颸）', 'version': '頼彌次郎编『梅颸日記』，『頼山陽全書』所収（NDL pid 1688880）',
                       'location': '各段全書页码见 page 栏', 'obtained': '教师提供的国会图书馆个人传送件；2026-11-02 按固定种子 20261102 抽取并录文',
                       'form': '录文（agent 对照影像录出，未经第二人校对）', 'nature': '实际数据', 'license': '仅供本课堂使用；影像带个人水印，不分发', 'visibility': '仅本机'},
              'declare': {'calendar': '和暦'}, 'passages': passages, 'images': images}

# ---------- JBDB ----------
J = jbdb
ets = {s: json.loads(reg(J / f'ets_{s}.json', f'EventsToSources cSourceid={s}').read_text()) for s in (9, 3)}
ed = json.loads(reg(J / 'eventdata_9_3.json', 'EventData（两部日记所涉事件的人物）').read_text())
bio = {b['cPersonid']: b for b in json.loads(reg(J / 'biog.json', 'BiogMains（编号、姓名、性别）').read_text())}
summary = {}
for s, diarist in ((9, 270), (3, 0)):
    ev = {x['cEventId'] for x in ets[s]}
    ps = collections.Counter(x['cPersonid'] for x in ed if x['cEventId'] in ev and x['cPersonid'] not in (diarist, -1))
    g = collections.Counter({True: '女', False: '男', None: '未标'}[bio.get(p, {}).get('cFemale')] for p in ps)
    summary[s] = {'events': len(ev), 'persons': len(ps), 'by_gender': dict(g)}
b7 = json.loads(reg(J / 'eventcodes_bunsei7.json', 'EventCodes 文政七年全部事件').read_text())
day = json.loads(reg(J / 'eventcodes_bunsei7_09_05-07.json', 'EventCodes 文政七年九月五至七日').read_text())
pe = collections.defaultdict(list)
ids = {e['cEventId'] for e in b7}
for x in ed:
    if x['cEventId'] in ids: pe[x['cEventId']].append(x['cPersonid'])
def person(p): b = bio.get(p, {}); return {'id': p, 'name': b.get('cName'), 'romaji': b.get('cNameRomaji'), 'female': b.get('cFemale')}
src9 = {x['cEventId']: x.get('cPages') for x in ets[9]}
jb = {'queried': '2026-11-02T22:40+08:00', 'endpoint': 'https://app.jbdb.jp/api', 'note': 'SwaggerHub 所载基址 jbdb.jp 的证书只对 app.jbdb.jp 有效；本次按证书所示主机查询，未绕过证书校验。',
      'sources': json.loads(reg(J / 'sourcedata_3_9.json', 'SourceData 3、9').read_text()), 'summary': summary,
      'bunsei7': [{'id': e['cEventId'], 'month': e.get('cFyMonth'), 'day': e.get('cFyDay'), 'leap': e.get('cFyIntercalary'), 'notes': e.get('cEventNotes'), 'type': e.get('cEventTypeCode'),
                   'in_baishi': e['cEventId'] in src9, 'page': src9.get(e['cEventId']), 'persons': [person(p) for p in pe.get(e['cEventId'], [])]} for e in b7],
      'day_0905_07': day,
      'same_day': [{'passage': d['passage'], 'wareki': d['wareki'], 'nengo_code': d['nengo_code'], 'year': d['year'], 'month': d['month'], 'day': d['day'],
                    'events': [{'id': e['cEventId'], 'notes': e.get('cEventNotes'), 'type': e.get('cEventTypeCode'),
                                'sources': [{'source': x['cSourceid'], 'page': x.get('cPages')} for x in d['events_to_sources'] if x['cEventId'] == e['cEventId']],
                                'persons': [person(x['cPersonid']) for x in d['event_data'] if x['cEventId'] == e['cEventId']]} for e in d['events']]}
                   for d in json.loads(reg(J / 'passages_same_day.json', '十段日记同日的 EventCodes／EventsToSources／EventData').read_text())], 'license': 'JBDB 数据的再发布许可未见说明，只在本机使用'}

pack = {'format': 'pku-aihis-week08-pack', 'version': 1, 'built': datetime.datetime.now().astimezone().isoformat(timespec='seconds'),
        'notice': '第八周本机材料包：只在教师电脑与课堂使用，不上传、不分发。', 'materials': {'cbdb-wanggui': cbdb, 'meishi': meishi_mat}, 'jbdb': jb, 'files': files}
out.write_text(json.dumps(pack, ensure_ascii=False), encoding='utf-8')
print(f'{out}: {out.stat().st_size/1e6:.1f} MB; CBDB {len(edges)} 条；梅颸 {len(passages)} 段、影像 {len(images)}；JBDB 文政七年 {len(b7)} 条；摘要 {summary}')
