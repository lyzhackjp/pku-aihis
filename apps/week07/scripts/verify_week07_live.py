#!/usr/bin/env python3
"""第七周现场抽取、模型接入与材料导入的浏览器验收（Playwright + Chromium）。
分两部分，结果分别标明运行模式：
  一、接口测试替身（fake_openai_server.py，固定写法的回复，不是模型）：检查模型接入页、请求组装、A／B 解析与 schema 校验、
      LangExtract（Pyodide）分块与对齐、写入证据表、通用导入页握手、D30“我的材料”、云端发送前确认。
  二、浏览器内模型实测（--browser-models）：GLiNER multi v2.1 与 Qwen3-0.6B 在本页内实际运行（需联网下载库与权重）。
用法：python3 verify_week07_live.py <原型 URL> <材料包相对 URL> <替身端口> <输出目录> [--browser-models] [--proxy URL]"""
import asyncio, json, os, sys, time, tempfile
from playwright.async_api import async_playwright

URL, PACK, PORT, OUT = sys.argv[1:5]
BROWSER = '--browser-models' in sys.argv
PROXY = sys.argv[sys.argv.index('--proxy') + 1] if '--proxy' in sys.argv else os.environ.get('HTTPS_PROXY')
os.makedirs(OUT, exist_ok=True)
R = []
def check(name, ok, detail='', mode='接口测试替身'):
    R.append({'check': name, 'pass': bool(ok), 'mode': mode, 'detail': detail if isinstance(detail, str) else json.dumps(detail, ensure_ascii=False)[:600]})
    print(('PASS' if ok else 'FAIL'), name, '' if ok else detail, flush=True)

async def wait_idle(pg, slide, timeout=900000):
    await pg.wait_for_function(f"!document.querySelector('deck-slide[slide-id={slide}] live-extract [data-lx=run]').disabled", timeout=timeout)
    await pg.wait_for_timeout(300)

async def main():
    TXT = os.path.join(tempfile.mkdtemp(), '宋史王安石传选段.txt')
    open(TXT, 'w', encoding='utf8').write('王安石，字介甫，撫州臨川人。父益，都官員外郎。安石少好讀書，一過目終身不忘。\n\n慶曆二年，擢進士上第，簽書淮南判官。\n')
    async with async_playwright() as p:
        kw = dict(viewport={'width': 1512, 'height': 860}, ignore_https_errors=True)
        if PROXY: kw['proxy'] = {'server': PROXY, 'bypass': '127.0.0.1,localhost'}
        ctx = await p.chromium.launch_persistent_context(os.path.join(OUT, '.profile'), **kw)
        pg = ctx.pages[0] if ctx.pages else await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'{URL}?pack={PACK}#D23'); await pg.wait_for_timeout(2500)
        await pg.evaluate("localStorage.clear()")
        await pg.reload(); await pg.wait_for_timeout(2500)
        sl = pg.locator('deck-slide[slide-id=D23]')
        await sl.locator('[data-set="v:L"]').click(); await pg.wait_for_timeout(600)
        le = sl.locator('live-extract')
        check('D23“现场运行”标签载入现场抽取面板（ES 模块）', await le.locator('.live').count() == 1)
        check('顶栏有“模型接入”“材料导入”', await pg.locator('.deck-top [data-live]').all_inner_texts() == ['模型接入', '材料导入'])
        # 云端配置：未确认不能运行
        await le.locator('[data-lx="set:task:B"]').click(); await pg.wait_for_timeout(200)
        await le.locator('select[data-ls=engine]').select_option('api'); await pg.wait_for_timeout(200)
        dis = await le.locator('[data-lx=run]').is_disabled(); txt = await le.locator('.consent').inner_text() if await le.locator('.consent').count() else ''
        check('云端配置（DeepSeek）：发送前须确认，确认前“运行”不可用', dis and '发送前确认' in txt and 'api.deepseek.com' in txt, txt)
        # 模型接入页：切到本机配置，指向替身
        await pg.locator('.deck-top [data-live=models]').click(); await pg.wait_for_timeout(400)
        mp = pg.locator('w7-model-panel')
        await mp.locator('select[data-sel]').select_option(index=1); await pg.wait_for_timeout(200)
        await mp.locator('input[data-pf=baseUrl]').fill(f'http://127.0.0.1:{PORT}/v1'); await mp.locator('input[data-pf=model]').fill('test-double')
        key = await mp.locator('input[data-pf=apiKey]').get_attribute('type')
        await mp.locator('[data-mp=test]').click(); await pg.wait_for_function("/测试通过|测试失败|未能/.test(document.querySelector('w7-model-panel .mp-status').textContent)", timeout=30000)
        st = await mp.locator('.mp-status').inner_text()
        check('模型接入页：本机服务（替身）文字测试通过；Key 输入框为密码框', '测试通过' in st and key == 'password', st)
        stored = await pg.evaluate("Object.entries(localStorage).filter(([k])=>k.includes('week07-model-profiles')).map(([k,v])=>v).join('')")
        check('模型配置写入浏览器存储时不含 apiKey 字段', 'apiKey' not in stored, stored[:200])
        await mp.locator('[data-mp=close]').click(); await pg.wait_for_timeout(300)
        await le.locator('select[data-ls=engine]').select_option('api'); await pg.wait_for_timeout(200)
        check('本机服务不需发送确认', await le.locator('.consent').count() == 0 and not await le.locator('[data-lx=run]').is_disabled())
        out = {}
        for task in ['B', 'A', 'LX']:
            await le.locator(f'[data-lx="set:task:{task}"]').click(); await pg.wait_for_timeout(200)
            t0 = time.time(); await le.locator('[data-lx=run]').click(); await wait_idle(pg, 'D23')
            out[task] = (await le.locator('.live-result').inner_text(), round(time.time() - t0, 1))
        b = out['B'][0]
        check('B 型：合法 JSON、schema 全部合规、王珪精确对齐', '合法 JSON' in b and 'schema 校验：全部合规' in b and '精确对齐' in b, b[:300])
        a = out['A'][0]
        check('A 型：schema 合规，史学规则报出生卒与“年六十七”不合', 'schema 校验：全部合规' in a and '年六十七' in a, a[-400:])
        lx = out['LX'][0]
        check('LangExtract（Pyodide 内运行 3a68580）：分块、解析并给出精确对齐与字符区间', 'LangExtract（UnicodeTokenizer' in lx and '精确对齐' in lx and '[0, 2)' in lx, lx[-500:], mode='接口测试替身＋Pyodide 实际运行 LangExtract')
        await le.locator('[data-lx=toev]').click(); await pg.wait_for_timeout(300)
        n = await pg.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith('w7-ev-songshi')))||'[]').filter(r=>/模型输出，未核/.test(r.who)).length")
        check('“写入证据表”把结果追加到宋史证据表，处理人注明“模型输出，未核”', n >= 5, n)
        runs = await pg.evaluate("new Promise(ok=>{const r=indexedDB.open('pku-aihis-week07-live');r.onsuccess=()=>{const q=r.result.transaction('runs').objectStore('runs').getAll();q.onsuccess=()=>ok(q.result.map(x=>({k:x.kind,t:x.task,e:!!x.error,key:JSON.stringify(x).includes('apiKey')})))}})")
        check('每次运行记入本机 IndexedDB，记录中无 Key', len(runs) >= 4 and not any(r['key'] for r in runs), runs)
        # 通用导入页 → D30 我的材料
        await pg.evaluate("location.hash='#D30'"); await pg.wait_for_timeout(500)
        async with pg.expect_popup() as pi: await pg.locator('.deck-top [data-live=importer]').click()
        imp = await pi.value
        await imp.get_by_role('button', name='送回已经连接的课件', exact=True).wait_for(timeout=60000)
        await imp.locator('input[type=file]').first.set_input_files(TXT)
        await imp.wait_for_function("!document.querySelector('input[type=file]').disabled", timeout=120000); await imp.wait_for_timeout(800)
        await imp.get_by_role('button', name='处理所选范围', exact=True).click()
        await imp.wait_for_function("/段落已登记|失败/.test(document.querySelector('#status').textContent)", timeout=60000)
        await imp.get_by_role('button', name='送回已经连接的课件', exact=True).click()
        await imp.wait_for_function("/已接收|课件未接收/.test(document.querySelector('#status').textContent)", timeout=60000)
        st = await imp.locator('#status').inner_text()
        check('通用导入页（apps/material-importer）握手并把正文片段送回第七周', '第七周已接收 1 份材料、2 个正文片段' in st, st, mode='实际运行')
        await imp.close(); await pg.bring_to_front()
        d30 = pg.locator('deck-slide[slide-id=D30]')
        await d30.locator('[data-set="mat:mine"]').click(); await d30.locator('[data-set="stage:entry"]').click(); await d30.locator('[data-set="tab:work"]').click(); await pg.wait_for_timeout(300)
        await d30.locator('[data-th^="mineseg|"]').first.click(); await pg.wait_for_timeout(300)
        sents = await d30.locator('[data-th^="addsent|"]').count()
        check('D30“我的材料”：选用导入片段后按句列出原文', sents == 3, sents, mode='实际运行')
        await d30.locator('[data-th^="addsent|"]').first.click(); await d30.locator('[data-set="stage:extract"]').click(); await pg.wait_for_timeout(500)
        le30 = d30.locator('live-extract')
        await le30.locator('[data-lx="set:task:B"]').click(); await le30.locator('select[data-ls=engine]').select_option('api'); await pg.wait_for_timeout(200)
        await le30.locator('[data-lx=run]').click(); await wait_idle(pg, 'D30'); await le30.locator('[data-lx=toev]').click(); await pg.wait_for_timeout(300)
        rows = await pg.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith('w7-ev-mine')))||'[]')")
        check('D30 我的材料：现场抽取写入证据表，位置写出处与“文本段落”', len(rows) >= 3 and any('王安石' == r['orig'] for r in rows) and '文本段落 1' in rows[-1]['loc'], [r['orig'] for r in rows])
        if BROWSER:
            await pg.evaluate("location.hash='#D23'"); await pg.wait_for_timeout(500)
            await le.locator('select[data-ls=input]').select_option('songshi'); await le.locator('[data-lx="set:task:NER"]').click(); await pg.wait_for_timeout(200)
            t0 = time.time(); await le.locator('[data-lx=run]').click(); await wait_idle(pg, 'D23'); g = await le.locator('.live-result').inner_text()
            check(f'GLiNER multi v2.1（fp16，WASM）在浏览器内实际运行，王珪传选段（{round(time.time()-t0)} 秒，含首次下载）', '找到' in g and '王珪\t人物' in g, g[:400], mode='浏览器内实测')
            await le.locator('[data-lx="set:task:B"]').click(); await le.locator('select[data-ls=engine]').select_option('qwen'); await pg.wait_for_timeout(200)
            await le.locator('select[data-ls=qwen]').select_option('qwen3-0.6b'); await le.locator('input[data-lt=maxTokens]').fill('200'); await pg.wait_for_timeout(100)
            t0 = time.time(); await le.locator('[data-lx=run]').click(); await wait_idle(pg, 'D23', 2400000); q = await le.locator('.live-result').inner_text()
            check(f'Qwen3-0.6B（transformers.js，本机无 WebGPU 时 WASM q8）在浏览器内实际生成 200 词元（{round(time.time()-t0)} 秒）', 'Qwen3-0.6B' in q and ('合法 JSON' in q or '容错读出' in q or '非合法' in q), q[:400], mode='浏览器内实测')
            await pg.screenshot(path=os.path.join(OUT, 'D23-live-qwen.png'))
        await pg.evaluate("location.hash='#D23'"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=os.path.join(OUT, 'D23-live.png'))
        await pg.evaluate("location.hash='#D30'"); await pg.wait_for_timeout(500); await pg.screenshot(path=os.path.join(OUT, 'D30-mine-extract.png'))
        check('现场运行检查中无脚本错误', not errs, errs[:3], mode='—')
        await ctx.close()
    json.dump({'date': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'url': URL, 'results': R}, open(os.path.join(OUT, 'verification-live.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(sum(r['pass'] for r in R), '/', len(R), '通过')

asyncio.run(main())
