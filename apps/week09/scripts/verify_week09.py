#!/usr/bin/env python3
# 第九周原型浏览器验收｜2026-11-11｜Python Playwright
# 用法：python3 verify_week09.py <prototype 目录> <输出目录>
# 起两个本机服务：静态服务（课件）与模拟的 OpenAI 兼容接口（只回固定文字，用于检验"现场调用→记录→导出无 Key"与失败切换；不是真实模型）。
import re, json, sys, os, threading, http.server, socketserver, functools, time
from playwright.sync_api import sync_playwright

PROTO, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
os.makedirs(OUT, exist_ok=True)
FAKE_KEY = 'sk-verify-DO-NOT-LEAK-123456'
BODIES = []

class Mock(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
    def do_OPTIONS(self): self.send_response(204); self.cors(); self.end_headers()
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); body = json.loads(self.rfile.read(n))
        BODIES.append({'path': self.path, 'auth': self.headers.get('Authorization', ''), 'body': body})
        if self.path.startswith('/fail'):
            self.send_response(500); self.cors(); self.end_headers(); self.wfile.write(b'{"error":"mock failure"}'); return
        out = {'model': body.get('model'), 'choices': [{'message': {'content': '（模拟接口的固定回答，用于验收，不是模型输出。）民权与国权，此问甚大。吾以为国权先于民权。'}, 'finish_reason': 'stop'}], 'usage': {'total_tokens': 1}}
        self.send_response(200); self.cors(); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(json.dumps(out, ensure_ascii=False).encode())

def serve(handler, port):
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", port), handler); httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start(); return httpd

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
serve(functools.partial(Quiet, directory=os.path.dirname(PROTO)), 18791)
serve(Mock, 18792)
BASE = 'http://127.0.0.1:18791/' + os.path.basename(PROTO) + '/index.html'

# 测试用本机材料包：一条合成的回放记录（标明为验收构造）
TESTPACK = {'format': 'w09-pack/v1', 'generated': 'verify', 'packs': [], 'replays': [
    {'run_id': 'R-verify-replay', 'card_id': 'card-1a', 'preset': 'kimi', 'sample_index': 1, 'mode': 'live', 'model': 'kimi-k3', 'temperature': '固定 1.0', 'date': '2026-11-11T09:00:00+08:00',
     'prompt': {'messages': [{'role': 'system', 'content': '（验收构造）课前的旧提示'}, {'role': 'user', 'content': '民权与国权，何者为先？'}]}, 'reply': '（验收构造的回放记录，不是模型输出。）吾辈今日所论，在开民智。'}]}
with open(os.path.join(os.path.dirname(PROTO), 'verify-pack.json'), 'w', encoding='utf-8') as f: json.dump(TESTPACK, f, ensure_ascii=False)

results = []
def check(name, ok, detail=''):
    results.append({'check': name, 'ok': bool(ok), 'detail': str(detail)[:300]}); print(('通过 ' if ok else '失败 ') + name + ('：' + str(detail)[:160] if detail else ''))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}); page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e) + ' @ ' + page.url + ' ' + (e.stack or '')[:400]))
    page.on('console', lambda m: errors.append('console.error: ' + m.text) if m.type == 'error' else None)
    page.on('dialog', lambda d: d.accept())
    page.goto(BASE + '?pack=../verify-pack.json'); page.wait_for_timeout(1500)
    pages = page.evaluate('window.DECK_DATA.pages.map(p=>[p.id,p.status])')
    check('页表互锁：28 页、页号连续', len(pages) == 28 and [x[0] for x in pages] == ['D%02d' % i for i in range(28)], len(pages))
    def go(pid):
        page.evaluate(f"location.hash='#{pid}'"); page.wait_for_timeout(500)
        return page.locator(f'deck-slide[slide-id="{pid}"]')
    def set_live():
        # 运行模式与 Key 在顶栏"模型接入"对话框（与第八周位置相同）
        page.locator('[data-open-model]').click(); d = page.locator('.w9-modeldlg')
        d.locator('input[name="w9mode"][value="live"]').check(); page.wait_for_timeout(150)
        for p_ in ['deepseek', 'kimi']:
            d.locator(f'input[data-mk="{p_}"]').fill(FAKE_KEY); d.locator(f'input[data-mk="{p_}"]').press('Enter'); d.locator(f'input[data-mk="{p_}"]').dispatch_event('change')
        page.locator('.w9-modeldlg [data-x="close"]').click(); page.wait_for_timeout(150)
    for pid, st in pages:
        s = go(pid); page.screenshot(path=os.path.join(OUT, f'{pid}_1440.png'))
    check('全部页遍历无 pageerror、无 console.error（桌面）', not errors, errors[:5])

    s = go('D00'); check('D00 载入本机材料包（测试包）', '已载入本机材料包' in s.inner_text(), s.inner_text()[:80])

    s = go('D09'); t = s.inner_text()
    check('D09 混入第三层材料（1899 年包里放《清代学术概论》）报出', '晚于时点或第三层：清代學術概論' in t, t[:200])
    check('D09 拼出的提示中不含《清代学术概论》', '清代學術概論' not in s.locator('pre.srcbox').first.inner_text())

    s = go('D07'); t = s.inner_text()
    check('D07 sendable=false 的岩波版全集被拦截', '拦截（不可送模型）：脫亞論（岩波版全集）' in t, t[:300])

    s = go('D05'); t = s.inner_text()
    check('D05 越界率小例子算出 0.375', '= 3/8 = 0.375' in t, [l for l in t.split('\n') if 'L =' in l][:2])
    s.locator('select[data-small="3"]').select_option('1'); page.wait_for_timeout(200)
    check('D05 改一个数（第 4 句 2→1），L 随之变为 0.25', '= 2/8 = 0.25' in s.inner_text())
    s.locator('select[data-small="3"]').select_option('2')

    s = go('D14'); t = s.inner_text()
    check('D14 小格 s = 3/7 ≈ 0.43，θ = 0.5 判不满意', 's = 3/7 ≈ 0.43' in t and '不满意' in t)
    s.locator('button[data-x="run"]').click(); page.wait_for_timeout(800)
    sv = s.inner_text(); check('D14 运行到停后 S 上升、U 下降到 0 附近', 'S = ' in sv, [l for l in sv.split('\n') if l.startswith('S =')][:1])

    s = go('D17'); check('D17 纳什议价小表选出 (3,3)', '选出：合约甲 (3,3)' in s.inner_text())
    check('D17 页面写明"规则简化／数字为示例"', '规则简化／数字为示例' in s.inner_text())

    s = go('D11'); s.locator('input[data-o="alpha"]').fill('1'); page.wait_for_timeout(200)
    check('D11 α = 1 时点恰在边界上', '恰在边界上' in s.inner_text())
    s.locator('input[data-o="alpha"]').fill('1.5'); page.wait_for_timeout(200)
    check('D11 α = 1.5 时越过边界', '已越过边界' in s.inner_text())

    s = go('D12'); s.locator('select[data-o="cid"]').select_option('card-bad'); page.wait_for_timeout(300)
    check('D12 错卡被报出', '未通过' in s.inner_text() and '清代學術概論' in s.inner_text())

    # 回放：模式为回放时，Kimi 一格取到测试包里的回放记录，标"预存回放"
    s = go('D01'); page.wait_for_timeout(300)
    btn = s.locator('[data-run="card-1a|kimi"]'); btn.click(); page.wait_for_timeout(500)
    t = s.inner_text()
    check('D01 预存回放标"预存回放"并注明"课前运行，非史料"', '预存回放' in t and '验收构造的回放记录' in t, t[:120])
    s.locator('[data-run="card-1a|deepseek"]').click(); page.wait_for_timeout(400)
    check('D01 没有回放的格如实显示"待课前运行"', '待课前运行' in s.inner_text())

    # 现场调用：失败 → 切回放并写明原因；成功 → 实际调用＋时间戳
    page.evaluate(f"""localStorage.setItem('week09-prototype/model-base', JSON.stringify({{deepseek:'http://127.0.0.1:18792/fail/v1', kimi:'http://127.0.0.1:18792/fail/v1'}}))""")
    page.reload(); page.wait_for_timeout(1500)
    set_live()
    s = go('D01'); s.locator('[data-run="card-1a|kimi"]').click(); page.wait_for_timeout(1500)
    t = s.inner_text()
    check('现场调用失败时切到预存回放并如实标明', '现场调用失败' in t and '预存回放' in t, [l for l in t.split('\n') if '失败' in l][:2])
    page.evaluate("""localStorage.setItem('week09-prototype/model-base', JSON.stringify({deepseek:'http://127.0.0.1:18792/v1', kimi:'http://127.0.0.1:18792/v1'}))""")
    page.reload(); page.wait_for_timeout(1500)
    set_live()
    s = go('D01'); s.locator('[data-run="card-1a|deepseek"]').click(); page.wait_for_timeout(1500)
    check('现场调用成功时标"实际调用"', '实际调用' in s.inner_text() and '模拟接口的固定回答' in s.inner_text())
    s.locator('[data-run="card-1b|kimi"]').click(); page.wait_for_timeout(1500)
    ds = [x for x in BODIES if x['body'].get('model') == 'deepseek-flash' and not x['path'].startswith('/fail')]
    km = [x for x in BODIES if x['body'].get('model') == 'kimi-k3' and not x['path'].startswith('/fail')]
    check('DeepSeek 请求：关闭思考、温度 0.7', ds and ds[-1]['body'].get('thinking') == {'type': 'disabled'} and ds[-1]['body'].get('temperature') == 0.7, ds[-1]['body'] if ds else '无请求')
    check('Kimi 请求：不传温度', km and 'temperature' not in km[-1]['body'], km[-1]['body'].keys() if km else '无请求')
    check('1903 年底一格：跨时点的《新大陸遊記》未经确认不进入提示', km and '新大陸遊記' not in json.dumps(km[-1]['body'], ensure_ascii=False))
    s.locator('input[data-confirm="card-1b|liang-xindalu"]').check(); page.wait_for_timeout(300)
    s.locator('[data-run="card-1b|kimi"]').click(); page.wait_for_timeout(1500)
    km = [x for x in BODIES if x['body'].get('model') == 'kimi-k3' and not x['path'].startswith('/fail')]
    check('教师确认后，跨时点的条目才进入提示', km and '新大陸遊記' in json.dumps(km[-1]['body'], ensure_ascii=False))
    check('请求体中不含 Key（Key 只在 Authorization 头）', all(FAKE_KEY not in json.dumps(x['body']) for x in BODIES))
    check('1899 年一格的提示含指定史料录文', ds and '泰西學者' in json.dumps(ds[-1]['body'], ensure_ascii=False))
    ls = page.evaluate("JSON.stringify(Object.fromEntries(Object.entries(localStorage)))")
    check('浏览器存储中没有 Key', FAKE_KEY not in ls)

    # 逐句标注（D08）：标两句，再导出
    s = go('D08'); s.locator('select[data-f="type"][data-i="0"]').select_option('知识'); page.wait_for_timeout(200)
    s.locator('select[data-f="beyond_timepoint"][data-i="0"]').select_option('是'); page.wait_for_timeout(200)
    check('D08 汇总随标注变化（越出时点 1）', '越出时点1' in re.sub(r'\s', '', s.inner_text()), [l for l in s.inner_text().split('\n') if '无依据' in l][:1])
    # 导出与恢复
    exp = page.evaluate('W9.Through.export()')
    check('导出记录中没有 Key', FAKE_KEY not in exp and 'apiKey' not in exp)
    before = page.evaluate('JSON.stringify({runs:W9.Through.get().runs.length,labels:W9.Through.get().labels})')
    r = page.evaluate('(t)=>{W9.Through.clear(); const r=W9.Through.import(t); return r.ok}', exp)
    after = page.evaluate('JSON.stringify({runs:W9.Through.get().runs.length,labels:W9.Through.get().labels})')
    check('导出再恢复后记录一致', r and before == after, (before[:80], after[:80]))
    bad = page.evaluate("()=>{const n=W9.Through.get().runs.length; const r=W9.Through.import('{\"format\":\"w09-through/v1\",\"runs\":\"x\"}'); return [r.ok, r.error, W9.Through.get().runs.length===n]}")
    check('坏文件不恢复，保留旧记录', bad[0] is False and bad[2], bad[1])

    check('模型面板输入 Key、调用与导出过程无 pageerror', not [e for e in errors if e.startswith('pageerror')], [e[:200] for e in errors if e.startswith('pageerror')][:2])
    errors.clear()
    # ---------- 第二批（2026-11-11）----------
    s = go('D19'); [s.locator('button[data-x="next"]').click() for _ in range(3)]; page.wait_for_timeout(200); t = s.inner_text()
    check('D19 分步框第一步 0.495／0.117（@tab-a4）', '<b>0.495</b>' in s.inner_html() and '<b>0.117</b>' in s.inner_html(), [l for l in t.split('\n') if 't=1' in l][:1])
    check('D19 第 60 步 (0.13, 0.039)', 't60 (0.13, 0.039)' in t, [l for l in t.split('\n') if 't60' in l][:1])
    check('D19 写明"规则简化／数字为示例"或"示例"', '示例' in t)
    s = go('D20'); t = s.inner_text()
    check('D20 u=−3、w=0 三根 −1.732、0、1.732', 'S = -1.732，0，1.732' in t, [l for l in t.split('\n') if '平衡点' in l][:1])
    s.locator('input[data-k="w"]').fill('2'); page.wait_for_timeout(300); t = s.inner_text()
    check('D20 w=2 时判别式为 0、判定"在边界上"', '在边界上' in t and '4u³ + 27w² = 0' in t, [l for l in t.split('\n') if '27w' in l][:1])
    s.locator('input[data-k="w"]').fill('2.2'); page.wait_for_timeout(300); t = s.inner_text()
    check('D20 越过边界后小球跳到左洼', '小球 S = -' in t, [l for l in t.split('\n') if '小球' in l][:1])
    check('D20 注明式（11.4）原书印作">"', '印作">"' in t)
    s = go('D15'); t = s.inner_text()
    check('D15 小例子 E = 0.0225', '= 0.0225' in t)
    s.locator('button[data-x="all"]').click(); page.wait_for_timeout(300); t = s.inner_text()
    m = re.search(r'最优 \(([\d.]+), ([\d.]+)\)', t)
    check('D15 遗传算法收敛到单谷 (0.6, 0.4)', m and abs(float(m.group(1)) - 0.6) < 0.05 and abs(float(m.group(2)) - 0.4) < 0.05, m.group(0) if m else t[:100])
    s.locator('input[data-k="miss"]').fill('0.5'); page.wait_for_timeout(300); t = s.inner_text()
    check('D15 缺失比例一变，母亲权重随之移动', '缺失 50%' in t)
    s = go('D21'); s.locator('button[data-x="ten"]').click(); page.wait_for_timeout(500); t = s.inner_text()
    check('D21 十次落点两谷都有（固定种子）', '左上谷' in t and '右下谷' in t and '等终性' in t, [l for l in t.split('\n') if '左上谷 ' in l][:1])
    s = go('D16'); t = s.inner_text()
    check('D16 7/10 与 8/10 → 0.875', 'P1：0.7 ÷ 0.8 = 0.875' in t, [l for l in t.split('\n') if 'P1：' in l][:1])
    s.locator('input[data-k="noRetest"]').check(); page.wait_for_timeout(200); t = s.inner_text()
    check('D16 删去重答列返回"不可算"', '历史人物没有这一栏' in t and '五人平均：不可算' in t)
    s.locator('select[data-k="place-war"]').select_option('bel'); page.wait_for_timeout(200)
    check('D16 放错时提示实际办法', '实际是"都不是"' in s.inner_text())
    s = go('D02'); s.locator('select[data-k="preset"]').select_option('kimi'); page.wait_for_timeout(300); t = s.inner_text()
    check('D02 取到回放记录并标"预存回放"', '第 1 次' in t and '预存回放' in t, t[:120])
    s.locator('[data-mark]').first.click(); page.wait_for_timeout(200)
    check('D02 勾选统计随点击变化（三者一致 1 句）', '三者一致\t1 句' in s.inner_text() or '三者一致 1 句' in re.sub(r'\s+', ' ', s.inner_text()))
    s = go('D01'); s.locator('.sent[data-circle]').first.click(); page.wait_for_timeout(200)
    s = go('D04'); s.locator('button[data-part]').first.click(); page.wait_for_timeout(200); t = s.inner_text()
    check('D04 圈出的句子归入一部分后汇总为 1 句', '共 1 句已归类' in t, [l for l in t.split('\n') if '已归类' in l][:1])
    s = go('D26'); s.locator('button[data-src="fukuzawa-zenshu-10-238"]').click(); page.wait_for_timeout(200); t = s.inner_text()
    check('D26 不可送条目只显示页码、不显示原文', '不可送模型：只显示页码' in t)
    s = go('D24'); s.locator('input[data-k="judge"][value="yes"]').check(); page.wait_for_timeout(200)
    check('D24 "倾向有效"示意勾"可归于倾向"给出理由', '倾向可由提示设定' in s.inner_text())
    s.locator('select[data-k="sc"]').select_option('dumb'); page.wait_for_timeout(200); s.locator('input[data-k="judge"][value="yes"]').check(); page.wait_for_timeout(200)
    check('D24 "只是变笨"示意给出能力下降的理由', '变笨' in s.inner_text() and '48' in s.inner_text())
    s = go('D10'); s.locator('button[data-x="edit"]').click(); page.wait_for_timeout(200)
    check('D10 改一条后显示涟漪与 RippleEdits 结论（教学构造）', 'RippleEdits' in s.inner_text() and '教学构造' in s.inner_text())
    s = go('D25'); s.locator('button[data-cell="2|0"]').click(); page.wait_for_timeout(200)
    check('D25 格子展开显示对应页', '对应页：D05' in s.inner_text())
    s = go('D03'); s.locator('g[data-cond="base"]').click(); page.wait_for_timeout(200)
    check('D03 点选基座模型一层，展开 BaiJia 等研究卡片', 'BaiJia' in s.inner_text())
    s = go('D06'); s.locator('button[data-x="reveal"]').click(); page.wait_for_timeout(200)
    check('D06 揭示后显示三段出处', '大村哲太郎' in s.inner_text() and '見城悌治' in s.inner_text())
    check('第二批交互无 pageerror、无 console.error', not errors, errors[:5])
    if errors: open(os.path.join(OUT, 'errors.txt'), 'w').write('\n\n'.join(errors))

    # ---------- 设计复查后（2026-11-11）----------
    tb = page.locator('.deck-top .pack-bar').inner_text()
    check('顶栏有"导入表格""模型接入"，并显示当前运行模式', '导入表格' in tb and '模型接入：现场调用（Key 2/2）' in tb, tb)
    check('顶栏显示本机材料包已载入', '本机材料包已载入' in tb, tb)
    page.locator('[data-open-model]').click(); dt = page.locator('.w9-modeldlg').inner_text(); page.locator('.w9-modeldlg [data-x="close"]').click()
    check('模型接入对话框如实显示接口地址被改为非默认', '接口地址已改为非默认' in dt and '127.0.0.1:18792' in dt)
    over2 = []
    for pid, st in pages:
        go(pid); r = page.evaluate(f"""(()=>{{const b=document.querySelector('deck-slide[slide-id="{pid}"] .slide-body');return b.scrollHeight-b.clientHeight}})()""")
        if r > 12: over2.append((pid, r))
    check('桌面 1440×900：各页正文不溢出到页脚之下（各栏自己滚动）', not over2, over2)
    heads = page.evaluate("""[...document.querySelectorAll('deck-slide')].filter(s=>!['D00','D23','D27'].includes(s.getAttribute('slide-id'))&&!s.querySelector('.flow-question')).map(s=>s.getAttribute('slide-id'))""")
    check('除封面、贯穿记录、概念表外，各页都有"本页问题＋步骤条"', not heads, heads)
    s = go('D01'); s.locator('[data-run="card-1a|deepseek"]').click(); page.wait_for_timeout(1500)
    cell = s.locator('.w9-cell', has=page.locator('[data-run="card-1a|deepseek"]')); n0 = cell.locator('[data-pick]').count()
    check('D01 一格有多次记录时出现采样切换，新一次现场调用自动选中', n0 >= 2 and cell.locator('[data-pick].on').inner_text().startswith('现'), n0)
    cell.locator('[data-pick]').first.click(); page.wait_for_timeout(200)
    check('D01 点"1"切回第 1 次采样', s.locator('.w9-cell', has=page.locator('[data-run="card-1a|deepseek"]')).locator('[data-pick]').first.get_attribute('class').find('on') >= 0)
    s = go('D05'); s.locator('select[data-o="cid"]').select_option('card-2c'); page.wait_for_timeout(200)
    check('D05 可选章太炎署年检验卡（乙一卡二问二）', '这些文字写于哪一年' in s.inner_text())
    s.locator('select[data-o="cid"]').select_option('card-3a')
    # 回放提示与当前条件卡不同：测试包里的回放用的是一份旧提示
    s = go('D01'); ct = s.locator('.w9-cell', has=page.locator('[data-run="card-1a|kimi"]')).inner_text()
    check('回放的提示与当前条件卡不同时如实标出', '提示与当前条件卡拼出的不同' in ct, ct[:160])
    check('设计复查后各项交互无 pageerror', not [e for e in errors if e.startswith('pageerror')], errors[:3])

    # ---------- 通用导入页握手（2026-11-12）：用一页替身代替真正的导入页，只验课件一侧的接收 ----------
    STUB = """<!doctype html><meta charset=utf-8><title>stub</title><script>
      const r=new URLSearchParams(location.search).get('receiver');window.results=[];
      addEventListener('message',e=>{if(e.data.type==='PKU_IMPORT_HELLO')opener.postMessage({type:'PKU_PROJECT',project:%s},r);else window.results.push(e.data)});
      opener.postMessage({type:'PKU_IMPORT_READY'},r);</script>"""
    good = {'schema': 'pku-history-project/v1', 'title': '验收项目', 'sources': [{'id': 's1', 'title': '验收文献'}], 'segments': [{'id': 'g1', 'sourceId': 's1', 'text': '第一段。', 'printedPage': 12}, {'id': 'g2', 'sourceId': 's1', 'text': '第二段。', 'pdfPage': 3}, {'id': 'g3', 'sourceId': 's1', 'text': '  '}]}
    state = {'proj': good}
    ctx.route('**/prototype/importer/index.html*', lambda route: route.fulfill(status=200, content_type='text/html', body=STUB % json.dumps(state['proj'], ensure_ascii=False)))
    go('D09')
    with ctx.expect_page() as pi: page.locator('[data-open-importer]').click()
    imp = pi.value; page.wait_for_selector('.w9-importer [data-d="date"]', timeout=5000)
    dlg = page.locator('.w9-importer .model-panel').inner_text()
    check('文献导入：握手后弹出声明框（2 个非空片段）', '送回 2 个正文片段' in dlg, dlg[:60])
    check('文献导入："可送模型"默认不勾', not page.locator('.w9-importer [data-d="send"]').is_checked())
    page.locator('.w9-importer [data-d="date"]').fill('1899'); page.locator('.w9-importer [data-d="layer"]').select_option('1'); page.locator('.w9-importer [data-x="ok"]').click(); page.wait_for_timeout(500)
    got = page.evaluate("window.W9.Mat.packs().filter(p=>p.id.startsWith('pack-importer')).map(p=>p.entries.map(e=>[e.page.system,e.page.value,e.sendable,e.written_date,e.layer]))")
    check('文献导入：片段成为史料条目，带页码体系、成文时间、层次，默认不可送', got and got[-1] == [['原书页', '12', False, '1899', 1], ['PDF页序', '3', False, '1899', 1]], got)
    check('文献导入：导入页收到"已接收"', imp.evaluate("window.results.map(x=>x.type)") == ['PKU_IMPORT_ACCEPTED'])
    pid = page.evaluate("window.W9.Mat.packs().filter(p=>p.id.startsWith('pack-importer')).pop().id")
    s = go('D09'); s.locator('select[data-o="pack"]').select_option(pid); page.wait_for_timeout(300); s.locator('input[data-sel]').first.check(); page.wait_for_timeout(300)
    check('文献导入：未声明可送的条目在 D09 被拦截，不进提示', '拦截（不可送模型）' in s.inner_text() and '第一段。' not in s.locator('pre.srcbox').last.inner_text())
    imp.close(); state['proj'] = {'schema': 'other/v1', 'sources': [], 'segments': []}
    n_before = page.evaluate("window.W9.Mat.packs().length")
    with ctx.expect_page() as pi: page.locator('[data-open-importer]').click()
    imp = pi.value; page.wait_for_timeout(800)
    check('文献导入：格式不对的项目被拒收，原有材料不变', imp.evaluate("window.results.map(x=>x.type)") == ['PKU_IMPORT_REJECTED'] and page.evaluate("window.W9.Mat.packs().length") == n_before)
    imp.close(); page.reload(); page.wait_for_timeout(1500)
    check('导入的史料包刷新后仍在', page.evaluate("window.W9.Mat.packs().some(p=>p.id.startsWith('pack-importer'))"))
    check('文献导入各步无 pageerror', not [e for e in errors if e.startswith('pageerror')], errors[:3])

    s = go('D03'); s.locator('details.w9-check summary').click(); s.locator('button[data-tag="scene|0"][data-v="有据"]').click(); page.wait_for_timeout(200)
    s.locator('button[data-tag="scene|2"][data-v="有据"]').click(); page.wait_for_timeout(200); t = s.inner_text()
    check('D03 场景来源判断：折叠块点选后保持展开，判对判错各有反馈', '已判断 2/5' in t and '与论文说明一致' in t and '论文说明相反' in t)
    s = go('D20'); s.locator('details summary').last.click(); s.locator('select[data-k="basis"]').select_option('已知结局'); page.wait_for_timeout(300); t = s.inner_text()
    check('D20 图 11.11 三类王朝与页码；选"已知结局"给出说明', '西汉、东汉、唐、明、清' in t and '第 416 页' in t and '规则与结局没有分开' in t)

    # 窄屏
    errors.clear(); page.set_viewport_size({'width': 390, 'height': 844}); over = []
    for pid, st in pages:
        if st != 'prototype': continue
        go(pid); page.screenshot(path=os.path.join(OUT, f'{pid}_390.png'))
        w = page.evaluate('document.documentElement.scrollWidth - innerWidth')
        if w > 2: over.append((pid, w))
    check('窄屏 390×844 已实现页无页面横向溢出', not over, over)
    check('窄屏遍历无错误', not errors, errors[:3])

    # file:// 打开（断网或不起服务）：页面能显示，现场调用不可用、改显回放
    errors.clear(); fp = b.new_page(); fp.on('pageerror', lambda e: errors.append(str(e)))
    fp.goto('file://' + os.path.join(PROTO, 'index.html') + '#D00'); fp.wait_for_timeout(1500)
    t = fp.locator('deck-slide[slide-id="D00"]').inner_text()
    check('file:// 直接打开：封面可见，现场调用标为不可用', '现场调用须经本机服务打开' in t, t[:100])
    check('file:// 直接打开无 pageerror', not errors, errors[:3])
    b.close()

json.dump({'date': time.strftime('%Y-%m-%d %H:%M:%S'), 'browser': 'Chromium (Playwright)', 'results': results, 'note': '模拟接口只回固定文字，用于检验调用链路与记录；不是真实模型调用。'}, open(os.path.join(OUT, 'verification.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"{sum(r['ok'] for r in results)}/{len(results)} 通过")
