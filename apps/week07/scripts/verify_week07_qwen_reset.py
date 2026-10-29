#!/usr/bin/env python3
"""第七周浏览器内 Qwen3 修订验收（2026-10-29 下午）：去掉 1.7B；载入失败后模型线程自动重置，可直接重试。
用法：python3 verify_week07_qwen_reset.py <原型 URL> <输出目录> [--proxy URL]
做法：第一次载入 Qwen3-0.6B 时拦截 Hugging Face 的权重请求，使载入失败；放开后在同一页（不刷新）再次载入，应成功。
需联网下载 0.6B（约 0.6 GB）。容器内无 WebGPU，走 WASM q8。"""
import asyncio, json, os, sys, time
from playwright.async_api import async_playwright

URL, OUT = sys.argv[1:3]
PROXY = sys.argv[sys.argv.index('--proxy') + 1] if '--proxy' in sys.argv else None
os.makedirs(OUT, exist_ok=True)
R = []
def check(name, ok, info=''):
    R.append({'name': name, 'pass': bool(ok), 'info': str(info)[:600]}); print('PASS' if ok else 'FAIL', name, '' if ok else info, flush=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(proxy={'server': PROXY, 'bypass': 'localhost,127.0.0.1'} if PROXY else None)
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        # 旧设置里存着 1.7B：应自动改为 0.6B
        await pg.goto(URL + '#D23'); await pg.wait_for_timeout(1500)
        await pg.evaluate("Deck.store.set('w7-live-d23', {task:'B', engine:'qwen', qwen:'qwen3-1.7b'})")
        await pg.reload(); await pg.wait_for_timeout(2500)
        await pg.locator('deck-slide[slide-id=D23] [data-set="v:L"]').click(); await pg.wait_for_timeout(600)
        le = pg.locator('deck-slide[slide-id=D23] live-extract')
        opts = await le.locator('select[data-ls=qwen] option').evaluate_all('o=>o.map(x=>x.value)')
        sel = await le.locator('select[data-ls=qwen]').input_value()
        check('现场运行的规模下拉只有 0.6B 与 4B', opts == ['qwen3-0.6b', 'qwen3-4b'], opts)
        check('旧设置中的 1.7B 自动改为 0.6B', sel == 'qwen3-0.6b', sel)
        await pg.evaluate('W7Live.openModels()'); await pg.wait_for_timeout(500)
        panel = await pg.locator('w7-model-panel').inner_text()
        check('模型接入页不再列出 1.7B', 'Qwen3-1.7B' not in panel and 'Qwen3-0.6B' in panel and 'Qwen3-4B' in panel, panel[:300])
        # 第一次：拦截权重，载入失败
        async def block(route): await route.abort()
        await ctx.route('**/onnx-community/Qwen3-0.6B-ONNX/**/onnx/**', block)
        await pg.locator('w7-model-panel [data-mp="qwen:qwen3-0.6b"]').click()
        q06 = "[...document.querySelectorAll('w7-model-panel tr')].find(r=>r.textContent.includes('Qwen3-0.6B'))?.textContent||''"
        await pg.wait_for_function(f"/失败/.test({q06})", timeout=600000)
        line = await pg.evaluate(q06)
        check('载入失败时提示写明运行方式并说明已自动重置', '模型线程已自动重置' in line and ('wasm/q8' in line or 'webgpu/q4f16' in line), line)
        # 第二次：放开，不刷新，同一页重试
        await ctx.unroute('**/onnx-community/Qwen3-0.6B-ONNX/**/onnx/**', block)
        t0 = time.time()
        await pg.locator('w7-model-panel [data-mp="qwen:qwen3-0.6b"]').click()
        await pg.wait_for_function("/已载入（|失败/.test([...document.querySelectorAll('w7-model-panel tr')].find(r=>r.textContent.includes('Qwen3-0.6B'))?.textContent||'')", timeout=1500000)
        row = await pg.evaluate("[...document.querySelectorAll('w7-model-panel tr')].find(r=>r.textContent.includes('Qwen3-0.6B')).textContent")
        check(f'失败后不刷新页面直接重试，0.6B 载入成功（{round(time.time() - t0)} 秒）', '已载入（' in row, row)
        await pg.screenshot(path=os.path.join(OUT, 'model-panel-after-retry.png'))
        check('全程无脚本错误', not errs, errs[:3])
        await b.close()
    json.dump({'date': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'url': URL, 'results': R}, open(os.path.join(OUT, 'verification-qwen-reset.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(sum(r['pass'] for r in R), '/', len(R), '通过')

asyncio.run(main())
