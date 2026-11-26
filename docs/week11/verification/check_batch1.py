"""第十一周第一批浏览器验收（云端工作区，headless Chrome）｜2026-11-26
用法：python3 check.py <输出目录>"""
import sys, json, re, os, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
BASE = 'http://127.0.0.1:8781/prototype/index.html'
res = []; errs = []
def ok(name, cond, note=''):
    res.append({'check': name, 'pass': bool(cond), 'note': note}); print(('PASS ' if cond else 'FAIL ') + name + ('｜' + note if note else ''))

def goto(page, pid):
    page.evaluate(f"location.hash = '#{pid}'"); page.wait_for_timeout(500)
def slide(page, pid): return page.locator(f'deck-slide[slide-id="{pid}"]')
def text(page, pid): return slide(page, pid).inner_text()

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for mode in ['local', 'public']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e, m=mode: errs.append(f'[{m}] pageerror {e}'))
        page.on('console', lambda m, md=mode: errs.append(f'[{md}] console.error {m.text} {m.location.get("url","")}') if m.type == 'error' and 'favicon' not in m.location.get('url', '') else None)
        url = BASE + ('?pack=../local-only/week11-pack.json' if mode == 'local' else '')
        page.goto(url); page.wait_for_timeout(1500)
        ids = page.evaluate("DECK_DATA.pages.map(p=>p.id)")
        ok(f'[{mode}] 页数 23', len(ids) == 23)
        for pid in ids:
            goto(page, pid)
            page.screenshot(path=f'{OUT}/{mode}_{pid}.png')
        if mode == 'local':
            ok('[local] 本机材料包已载入', '本机材料包已载入' in page.locator('.pack-bar').inner_text())
            # D01
            goto(page, 'D01'); s = slide(page, 'D01')
            s.locator('[data-cl]').nth(3).click(); s.locator('button[data-x="run"]').click(); page.wait_for_timeout(300)
            t = text(page, 'D01'); m = re.search(r'片段 (\d+) 处', t)
            ok('[local] D01 第 2 段照抄片段 3 处（k=12）', m and m.group(1) == '3', m.group(0) if m else t[:200])
            s.locator('input[data-k]').fill('6'); s.locator('input[data-k]').dispatch_event('change'); page.wait_for_timeout(300)
            m2 = re.search(r'片段 (\d+) 处', text(page, 'D01'))
            ok('[local] D01 k 调到 6 片段变多', m2 and int(m2.group(1)) > 3, m2.group(0) if m2 else '')
            # D05
            goto(page, 'D05'); s = slide(page, 'D05'); s.locator('button[data-x="fig4"]').click(); page.wait_for_timeout(300)
            fl = s.locator('.w11-flags').inner_text()
            ok('[local] D05 讲义图 4 标注后六类提示', all(x in fl for x in ['罗列：P2', '一段多事：P4、P7', '重复：P3、P6', '问题晚出：P7', '限定后置：P6、P7']), fl.replace('\n', ' '))
            s.locator('button[data-x="move"]').click(); page.wait_for_timeout(300)
            fl2 = s.locator('.w11-flags').inner_text()
            ok('[local] D05 问题移到第 1 段后"问题晚出"消失', '问题晚出：' not in fl2 and '一段多事：P4、P7' in fl2, fl2.replace('\n', ' '))
            # D06
            goto(page, 'D06'); s = slide(page, 'D06')
            for i, v in enumerate(['修正', '修正', '舍弃', '修正']): s.locator(f'select[data-dec="{i}"]').select_option(v)
            page.wait_for_timeout(300); t = text(page, 'D06')
            ok('[local] D06 登记表 修正 3、舍弃 1', '采纳 0、修正 3、舍弃 1' in t)
            slide(page, 'D06').locator('button[data-x="send"]').click(); page.wait_for_timeout(300)
            # D10
            goto(page, 'D10'); t = text(page, 'D10')
            ok('[local] D10 采纳率 1/3（33%）、意思改变占比 3/4（75%）', '1/3 = 33%' in t and '3/4 = 75%' in t, re.sub(r'\s+', ' ', t[t.find('模型意见采纳率'):][:120]))
            slide(page, 'D10').locator('select[data-dec="1"]').select_option('accept'); page.wait_for_timeout(300)
            ok('[local] D10 第 2 条改为采纳后 2/3', '2/3 = 67%' in text(page, 'D10'))
            # D13
            goto(page, 'D13'); page.wait_for_timeout(800); s = slide(page, 'D13')
            n = s.locator('table.w11-rev tr').count() - 1
            t = text(page, 'D13')
            ok('[local] D13 修订夹具抽出 4 条（含脚注 1 条）与批注', n == 4 and '脚注 3' in t and 'DeepSeek 2026-11-25' in t and '批注 1 条' in t, f'{n} 行')
            # D15
            goto(page, 'D15'); page.wait_for_timeout(500); s = slide(page, 'D15'); t = text(page, 'D15')
            ok('[local] D15 默认分页：第 2 页首条"同上"标红', s.locator('.w11-bad').count() == 1)
            s.locator('input[data-brk]').fill('7'); s.locator('input[data-brk]').dispatch_event('change'); page.wait_for_timeout(300)
            ok('[local] D15 分页线移到第 7 条后不再标红', s.locator('.w11-bad').count() == 0)
            s.locator('input[data-brk]').fill('6'); s.locator('input[data-brk]').dispatch_event('change'); page.wait_for_timeout(200)
            s.locator('input[name="fnstyle"][value="short"]').check(); page.wait_for_timeout(300)
            ok('[local] D15 换简式后问题消失', s.locator('.w11-bad').count() == 0)
            s.locator('input[name="fnstyle"][value="ibid"]').check(); page.wait_for_timeout(200); s.locator('input[data-rs]').uncheck(); page.wait_for_timeout(300)
            ok('[local] D15 关掉每页重新编号后第 2 页首条显示⑦', '⑦' in s.locator('.w11-pages').inner_text())
            # D17
            goto(page, 'D17'); page.wait_for_timeout(500); s = slide(page, 'D17'); s.locator('button[data-x="assist"]').click(); page.wait_for_timeout(800)
            t = text(page, 'D17')
            ok('[local] D17 规则辅助复现：引号内相同 5、找不到 5；引号外 4 处', '相同 5 处，节录中找不到 5 处' in t and t.count('字，第') >= 4 and '规则查不出' in t)
            ok('[local] D17 "康有为"片段报第 198 页', '康有为、梁启超事后认定，政变（15 字，第 198 页）' in t)
            s.locator('input[name="ck-src"][value="guo-2002"]').check(); page.wait_for_timeout(300); s.locator('button[data-pg="38"]').click(); page.wait_for_timeout(400)
            ok('[local] D17 原页面板显示郭文第 38 页图像', s.locator('img.w11-pageimg').count() == 1)
            s.locator('input[data-teacher]').check(); page.wait_for_timeout(300)
            ok('[local] D17 教师模式显示答案', '4.3 答案（教师用' in text(page, 'D17'))
            s.locator('select[data-ck="7|transfer"]').select_option('有误'); s.locator('button[data-x="send"]').click(); page.wait_for_timeout(300)
            # D18
            goto(page, 'D18'); page.wait_for_timeout(300); s = slide(page, 'D18')
            s.locator('[data-stage="5"]').click(); page.wait_for_timeout(300); t = text(page, 'D18')
            ok('[local] D18 附件默认为空（附件：无）', '附件：无' in t)
            ok('[local] D18 文案"附件按个人情况提交"，无"作业"', '附件按个人情况提交' in t and '作业' not in t)
            s.locator('input[data-att="诊断意见登记表"]').check(); page.wait_for_timeout(300)
            ok('[local] D18 勾选后附件出现', '附件：诊断意见登记表' in text(page, 'D18'))
            # 导出 → 清空 → 恢复（含 Key 的检查）
            page.evaluate("W11.Model.setKey('deepseek','sk-TESTKEY-0000000000000000000000')")
            with page.expect_download() as d: s.locator('button[data-x="json"]').click()
            dl = d.value; path = f'{OUT}/through.json'; dl.save_as(path); exp = open(path, encoding='utf-8').read()
            ok('[local] 导出中无 Key', 'sk-TESTKEY' not in exp and '"apiKey"' not in exp)
            before = page.evaluate("JSON.stringify({r:W11.Through.get().register, e:W11.Through.get().edits.length, p:W11.Through.get().page_state.D18})")
            page.on('dialog', lambda dg: dg.accept())
            s.locator('button[data-x="clear"]').click(); page.wait_for_timeout(300)
            ok('[local] 清空后记录为空', page.evaluate("W11.Through.get().register.length") == 0)
            r = page.evaluate("(t)=>W11.Through.import(t).ok", exp)
            after = page.evaluate("JSON.stringify({r:W11.Through.get().register, e:W11.Through.get().edits.length, p:W11.Through.get().page_state.D18})")
            ok('[local] 导出再恢复后记录一致', r and before == after)
            bad = page.evaluate("()=>{const n=W11.Through.get().register.length; const r=W11.Through.import('{bad json'); return [r.ok, W11.Through.get().register.length===n]}")
            ok('[local] 坏文件被拒、旧记录保留', bad == [False, True])
            # 课前运行面板：先不填 Key
            page.evaluate("W11.Model.setKey('deepseek',''); W11.Model.setKey('kimi','')")
            page.evaluate("W11.Preclass.dialog()"); page.wait_for_timeout(300)
            dlg = page.locator('.w11-pcdlg')
            for cid in ['D1A', 'D1B', 'D2B', 'D2P', 'S1', 'S2']:
                dlg.locator(f'input[data-pc-card="{cid}"]').uncheck(); page.wait_for_timeout(100)
            dlg.locator('input[data-pc-samples]').fill('2'); dlg.locator('input[data-pc-samples]').dispatch_event('change'); page.wait_for_timeout(200)
            dlg.locator('button[data-pc="plan"]').click(); page.wait_for_timeout(200); dlg.locator('button[data-pc="start"]').click(); page.wait_for_timeout(400)
            ok('[local] 课前运行：不填 Key 时明确提示', '未填 Key：DeepSeek、Kimi' in dlg.inner_text(), dlg.inner_text()[:160].replace('\n', ' '))
            # 模拟接口（页面内替换，不发真实请求），中途失败一次
            page.evaluate("""()=>{ window.__calls=0; window.__failed=false; window.W11Live = { call: async (o)=>{ window.__calls++; if(o.presetId==='kimi' && !window.__failed){ window.__failed=true; return {ok:false,error:'模拟失败 502',model:o.model}; }
              return {ok:true, reply:'（模拟回答，不是模型输出）', model:o.model, model_returned:o.model, temperature:0.7, ms:5, usage:null, finish_reason:'stop'}; } };
              W11.Model.setKey('deepseek','sk-TESTKEY-AAAA'); W11.Model.setKey('kimi','sk-TESTKEY-BBBB'); }""")
            dlg.locator('button[data-pc="start"]').click(); page.wait_for_timeout(1500)
            t1 = dlg.inner_text()
            dlg.locator('button[data-pc="failed"]').click(); page.wait_for_timeout(1500)
            t2 = dlg.inner_text()
            ok('[local] 课前运行：1 条件 × 2 模型 × 2 次，中途失败 1 次后续跑补齐', '失败 1' in t1 and '完成 4／4' in t2, re.sub(r'\s+', ' ', re.search(r'进度.*?待运行 \d+', t2).group(0)) if re.search(r'进度.*?待运行 \d+', t2) else '')
            with page.expect_download() as d: dlg.locator('button[data-pc="export"]').click()
            p2 = f'{OUT}/runs.json'; d.value.save_as(p2); rj = open(p2, encoding='utf-8').read()
            ok('[local] 课前运行导出：4 条、无 Key', json.loads(rj)['runs'].__len__() >= 4 and 'sk-TESTKEY' not in rj)
            page.locator('.w11-pcdlg button[data-x="close"]').click()
            # Word 稿导入
            page.locator('.pack-bar button[data-open-docx]').click(); page.wait_for_timeout(300)
            page.locator('.w11-docx input[type=file]').set_input_files('site/prototype/../local-only/../prototype/data/w11-public.js' if False else '/home/claude/w11test/jia_draft.docx')
            page.wait_for_timeout(800); t = page.locator('.w11-docx').inner_text()
            ok('[local] 导入 Word 稿：9 段、脚注 8、每页重新编号', '段落 9' in t and '脚注 8' in t and '每页重新编号' in t, t[:120].replace('\n', ' '))
            page.locator('.w11-docx input[data-merge="5"]').check(); page.locator('.w11-docx button[data-x="accept"]').click(); page.wait_for_timeout(300)
            n = page.evaluate("W11.Through.get().paragraphs.filter(p=>p.doc_id==='jia_draft').length")
            ok('[local] 导入 Word 稿：合并续段后 8 段（含标题）', n == 8, str(n))
        else:
            goto(page, 'D01'); slide(page, 'D01').locator('button[data-x="run"]').click(); page.wait_for_timeout(300)
            ok('[public] D01 无本机材料包时提示"需导入本机材料包"', '需导入本机材料包' in text(page, 'D01'))
            goto(page, 'D17'); page.wait_for_timeout(500); slide(page, 'D17').locator('button[data-x="assist"]').click(); page.wait_for_timeout(300)
            t = text(page, 'D17')
            ok('[public] D17 无答案、规则辅助只报体例，原页提示需导入', '4.3 答案（教师用' not in t and '需导入本机材料包' in t)
            goto(page, 'D04'); ok('[public] D04 回答格为"待课前运行"占位', text(page, 'D04').count('待课前运行') >= 4)
            # 窄屏
            page.set_viewport_size({'width': 390, 'height': 844})
            for pid in ['D01', 'D05', 'D13', 'D17', 'D18']:
                goto(page, pid); page.screenshot(path=f'{OUT}/narrow_{pid}.png')
                w = page.evaluate("document.documentElement.scrollWidth")
                ok(f'[public] 窄屏 {pid} 无整页横向溢出', w <= 400, f'scrollWidth {w}')
        ctx.close()
    b.close()
ok('全程无 pageerror / console.error', not errs, '；'.join(errs[:6]))
json.dump({'date': time.strftime('%Y-%m-%d %H:%M'), 'env': 'Claude 云端工作区 headless Chrome（/usr/bin/google-chrome），python http.server 127.0.0.1:8781', 'results': res, 'errors': errs}, open(f'{OUT}/verification.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(sum(r['pass'] for r in res), '/', len(res))
