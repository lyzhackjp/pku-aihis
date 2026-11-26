"""第十一周 D12 浏览器验收｜2026-11-26"""
import sys, json, re, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
BASE = 'http://127.0.0.1:8782/prototype/index.html'
res = []; errs = []
def ok(name, cond, note=''):
    res.append({'check': name, 'pass': bool(cond), 'note': note}); print(('PASS ' if cond else 'FAIL ') + name + ('｜' + note if note else ''))
def goto(page, pid): page.evaluate(f"location.hash = '#{pid}'"); page.wait_for_timeout(500)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for mode in ['local', 'public']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}); page = ctx.new_page()
        page.on('pageerror', lambda e, m=mode: errs.append(f'[{m}] pageerror {e}'))
        page.on('console', lambda m, md=mode: errs.append(f'[{md}] console.error {m.text}') if m.type == 'error' and 'favicon' not in m.location.get('url', '') else None)
        page.goto(BASE + ('?pack=../local-only/week11-pack.json' if mode == 'local' else '')); page.wait_for_timeout(1500)
        goto(page, 'D12'); s = page.locator('deck-slide[slide-id="D12"]'); page.screenshot(path=f'{OUT}/{mode}_D12.png')
        t = s.inner_text()
        ok(f'[{mode}] D12 账本 21 条（LEDGER 19＋乙二 2），无人名', '账本（21 条）' in t and '李原榛' not in t)
        s.locator('input[data-lp="L-019"]').click(); page.wait_for_timeout(200); s.locator('input[data-lp="W-01"]').click(); page.wait_for_timeout(300)
        pre = s.locator('pre.srcbox').first.inner_text()
        ok(f'[{mode}] D12 勾两条：附入文字含两条偏好', '连接套语' in pre and '判断词的强度' in pre and '已选 2 条' in s.inner_text())
        s.locator('button[data-x="blank"]').click(); page.wait_for_timeout(200)
        s.locator('textarea[data-f="preference"]').fill('不把"注意到"改成"指出"'); s.locator('textarea[data-f="preference"]').dispatch_event('change'); page.wait_for_timeout(200)
        s.locator('button[data-x="save"]').click(); page.wait_for_timeout(400); t = s.inner_text()
        ok(f'[{mode}] D12 新建条目存入，状态默认候选、不可附入', 'M-1' in t and s.locator('input[data-lp="M-1"]').is_disabled())
        s.locator('summary', has_text='进阶：账本检验').click(); page.wait_for_timeout(200)
        ok(f'[{mode}] D12 S3 未运行：待课前运行', '待课前运行（S3' in s.inner_text())
        ctx.close()
    b.close()
ok('全程无页面错误', not errs, '；'.join(errs[:6]))
json.dump({'results': res, 'errors': errs}, open(f'{OUT}/result.json', 'w'), ensure_ascii=False, indent=1)
print(sum(r['pass'] for r in res), '/', len(res))
