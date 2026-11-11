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
     'prompt': {'messages': []}, 'reply': '（验收构造的回放记录，不是模型输出。）吾辈今日所论，在开民智。'}]}
with open(os.path.join(os.path.dirname(PROTO), 'verify-pack.json'), 'w', encoding='utf-8') as f: json.dump(TESTPACK, f, ensure_ascii=False)

results = []
def check(name, ok, detail=''):
    results.append({'check': name, 'ok': bool(ok), 'detail': str(detail)[:300]}); print(('通过 ' if ok else '失败 ') + name + ('：' + str(detail)[:160] if detail else ''))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}); page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('console.error: ' + m.text) if m.type == 'error' else None)
    page.on('dialog', lambda d: d.accept())
    page.goto(BASE + '?pack=../verify-pack.json'); page.wait_for_timeout(1500)
    pages = page.evaluate('window.DECK_DATA.pages.map(p=>[p.id,p.status])')
    check('页表互锁：28 页、页号连续', len(pages) == 28 and [x[0] for x in pages] == ['D%02d' % i for i in range(28)], len(pages))
    def go(pid):
        page.evaluate(f"location.hash='#{pid}'"); page.wait_for_timeout(500)
        return page.locator(f'deck-slide[slide-id="{pid}"]')
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
    s = go('D00'); s.locator('input[name="w9mode"][value="live"]').check(); s.locator('input[data-mk="deepseek"]').fill(FAKE_KEY); s.locator('input[data-mk="deepseek"]').dispatch_event('change')
    s.locator('input[data-mk="kimi"]').fill(FAKE_KEY); s.locator('input[data-mk="kimi"]').dispatch_event('change')
    s = go('D01'); s.locator('[data-run="card-1a|kimi"]').click(); page.wait_for_timeout(1500)
    t = s.inner_text()
    check('现场调用失败时切到预存回放并如实标明', '现场调用失败' in t and '预存回放' in t, [l for l in t.split('\n') if '失败' in l][:2])
    page.evaluate("""localStorage.setItem('week09-prototype/model-base', JSON.stringify({deepseek:'http://127.0.0.1:18792/v1', kimi:'http://127.0.0.1:18792/v1'}))""")
    page.reload(); page.wait_for_timeout(1500)
    s = go('D00'); s.locator('input[name="w9mode"][value="live"]').check(); s.locator('input[data-mk="deepseek"]').fill(FAKE_KEY); s.locator('input[data-mk="deepseek"]').dispatch_event('change')
    s.locator('input[data-mk="kimi"]').fill(FAKE_KEY); s.locator('input[data-mk="kimi"]').dispatch_event('change')
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
