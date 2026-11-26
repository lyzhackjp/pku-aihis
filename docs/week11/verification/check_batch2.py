"""第十一周第二批浏览器验收（云端工作区，headless Chrome）｜2026-11-26
用法：python3 check2.py <输出目录>；站点由 python3 -m http.server 8782 在 site2 下提供"""
import sys, json, re, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
BASE = 'http://127.0.0.1:8782/prototype/index.html'
res = []; errs = []
def ok(name, cond, note=''):
    res.append({'check': name, 'pass': bool(cond), 'note': note}); print(('PASS ' if cond else 'FAIL ') + name + ('｜' + note if note else ''))
def goto(page, pid): page.evaluate(f"location.hash = '#{pid}'"); page.wait_for_timeout(500)
def slide(page, pid): return page.locator(f'deck-slide[slide-id="{pid}"]')
def text(page, pid): return slide(page, pid).inner_text()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for mode in ['local', 'public']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e, m=mode: errs.append(f'[{m}] pageerror {e}'))
        page.on('console', lambda m, md=mode: errs.append(f'[{md}] console.error {m.text}') if m.type == 'error' and 'favicon' not in m.location.get('url', '') else None)
        page.goto(BASE + ('?pack=../local-only/week11-pack.json' if mode == 'local' else '')); page.wait_for_timeout(1500)
        ids = page.evaluate("DECK_DATA.pages.map(p=>p.id)")
        for pid in ids:
            goto(page, pid); page.screenshot(path=f'{OUT}/{mode}_{pid}.png')
        # D03
        goto(page, 'D03'); s = slide(page, 'D03')
        bins = {'学者': 'cand', '年份': 'cand', '题名': 'cand', '刊物': 'cand', '主张': 'quote', '所据材料': 'quote', '回应对象': 'cand', '与我的问题的关系': 'mine'}
        for c, v in bins.items(): s.locator(f'select[data-bin="{c}"]').select_option(v); page.wait_for_timeout(120)
        t = text(page, 'D03')
        ok(f'[{mode}] D03 放错"回应对象"时提示讲义放在"不宜"，八列放完显示两项研究', '讲义放在"不宜交给模型"' in t and '0.97' in t and '46%' in t and '与讲义图 2 相同 7 列' in t)
        s.locator('input[data-q]').fill('大大加剧了政变的激烈程度'); page.wait_for_timeout(700); t = text(page, 'D03')
        if mode == 'local': ok('[local] D03 短引机械比对：核实（连续），第 175 页', '核实（连续）' in t and '第 175 页' in t, re.sub(r'\s+', ' ', t[t.find('三　每格'):][:260]))
        else: ok('[public] D03 短引比对提示需本机材料包', '需导入本机材料包' in t)
        s.locator('summary', has_text='进阶').click(); page.wait_for_timeout(200)
        ok(f'[{mode}] D03 R1 未运行时显示"待课前运行"，不放构造回答', '待课前运行' in text(page, 'D03'))
        # D07
        goto(page, 'D07'); s = slide(page, 'D07'); t = text(page, 'D07')
        ok(f'[{mode}] D07 论文副本标出三处植入位置', s.locator('mark.w11-imp').count() == 3, str(s.locator('mark.w11-imp').count()))
        ok(f'[{mode}] D07 D2P 未运行：待课前运行；召回率不伪造', '待课前运行' in t and '合并召回率' not in t.split('召回率')[0])
        s.locator('button[data-x="toy"]').click(); page.wait_for_timeout(300); t = text(page, 'D07')
        ok(f'[{mode}] D07 甲二小例：合并 2/3，标教学构造', '合并 2/3' in t and '教学构造' in t)
        # D09
        goto(page, 'D09'); page.wait_for_timeout(600); s = slide(page, 'D09'); s.locator('button[data-x="run"]').click(); page.wait_for_timeout(600); t = text(page, 'D09')
        if mode == 'local':
            ok('[local] D09 练习材料甲：引号内相同 5、找不到 5；引号外 4 处；第 2 页"同上"', t.count('相同（第') == 5 and t.count('原文中找不到或不全同') == 5 and t.count('引号外照抄 ≥12 字') == 4 and '同上' in t, f"相同{t.count('相同（第')} 找不到{t.count('原文中找不到或不全同')} 照抄{t.count('引号外照抄 ≥12 字')}")
        else: ok('[public] D09 练习材料甲：茅文不在手，提示本机材料包；体例规则照跑', '需导入本机材料包' in t and '注释体例' in t)
        s.locator('input[name="pisrc"][value="li"]').check(); page.wait_for_timeout(400)
        s.locator('button[data-x="demo1"]').click(); page.wait_for_timeout(500); t = text(page, 'D09')
        if mode == 'local':
            ok('[local] D09 教师论文：只植入"删限定"，规则查不出（0/1）', '规则召回率 0/1' in t, re.sub(r'\s+', ' ', t[t.find('规则召回率'):][:60]))
            s.locator('button[data-x="demo2"]').click(); page.wait_for_timeout(500); t = text(page, 'D09')
            ok('[local] D09 再植入"换发言人"：查出，召回率 1/2；新出"芦田均"', '规则召回率 1/2' in t and '芦田均' in t and '植入后新出' in t, re.sub(r'\s+', ' ', t[t.find('规则召回率'):][:60]))
        else:
            ok('[public] D09 教师论文：会议录不在手，标"无法核"', '原文不在手' in t and '无法核' in t)
        # D11
        goto(page, 'D11'); s = slide(page, 'D11'); t = text(page, 'D11')
        ok(f'[{mode}] D11 S1 未运行：待课前运行，不放构造润色稿', '待课前运行（S1' in t)
        s.locator('textarea[data-paste]').fill('关于战后初期天皇制的延续与民主化改革之间的关系问题，学界已有不少研究。值得注意的是，大谷伸治的研究视角非常新颖，学界注意到，部分知识分子通过国家体制概念理解民主思想。这种做法过度强调了“国体”思想本身的民主性。')
        s.locator('textarea[data-paste]').dispatch_event('change'); page.wait_for_timeout(600); t = text(page, 'D11')
        ok(f'[{mode}] D11 粘贴润色稿后：限定语减少（之虞）、引号词语减少、泛化"学界"新增；两栏差异', '"之虞"' in t and '“国体”' in t and '"学界"' in t and s.locator('.w11-diff ins').count() > 0, re.sub(r'\s+', ' ', t[t.find('限定语减少'):][:200]))
        s.locator('summary', has_text='超额词').click(); page.wait_for_timeout(200)
        s.locator('input[data-ex="y2|a"]').fill('20'); s.locator('input[data-ex="y2|a"]').dispatch_event('change'); page.wait_for_timeout(300)
        ok(f'[{mode}] D11 超额词：2022 低于 2021 时 max 为 0', 'max 一项为 0' in text(page, 'D11'))
        # D14
        goto(page, 'D14'); page.wait_for_timeout(1200); s = slide(page, 'D14'); t = text(page, 'D14')
        ok(f'[{mode}] D14 (b) 修订 8 处，修订者为工具名；(a) 待课前生成', '修订 8 处' in t and 'word-paper-tracked-reviser' in t and '待课前生成' in t, re.sub(r'\s+', ' ', t[:300]))
        ok(f'[{mode}] D14 无"全部接受"按钮', '全部接受' not in t.replace('页面不提供"全部接受"', ''))
        rows = s.locator('table.w11-rev tr')
        ids_ = [x.get_attribute('data-int') for x in s.locator('select[data-int]').all()]
        s.locator(f'select[data-int="{ids_[6]}"]').select_option('meaning-changed'); page.wait_for_timeout(300)
        btn = s.locator(f'button[data-dec="{ids_[6]}|accept"]')
        ok(f'[{mode}] D14 "意思改变"未写理由时不能接受', btn.is_disabled())
        s.locator(f'input[data-why="{ids_[6]}"]').fill('改得与两家原意更贴近'); s.locator(f'input[data-why="{ids_[6]}"]').dispatch_event('change'); page.wait_for_timeout(300)
        s.locator(f'button[data-dec="{ids_[6]}|accept"]').click(); page.wait_for_timeout(200)
        s.locator(f'select[data-int="{ids_[0]}"]').select_option('coherence'); page.wait_for_timeout(200)
        s.locator(f'button[data-dec="{ids_[0]}|reject"]').click(); page.wait_for_timeout(300); t = text(page, 'D14')
        ok(f'[{mode}] D14 接受一条、拒绝一条：采纳率 1/2，意思改变占比 1/2', '采纳率 50%（1/2）' in t and '意思改变占比 50%' in t, re.sub(r'\s+', ' ', t[t.find('已处理'):][:80]))
        prev = s.locator('details', has_text='改后文字').inner_text()
        ok(f'[{mode}] D14 预览：接受的落入、拒绝的还原', '告密的消息则加剧了政变的激烈程度' in prev and '此后学者各有论说' in prev)
        # D16
        goto(page, 'D16'); s = slide(page, 'D16'); t = text(page, 'D16')
        ok(f'[{mode}] D16 两头对：B6 无出处、注 2 缺、B4 年份 B5 题名', '找不到出处的条目：B6' in t.replace('\n', '') and 'B4（年份）' in t and 'B5（题名）' in t and re.search(r'目录缺的文献：注 2', t.replace('\n', '')), re.sub(r'\s+', ' ', t[t.find('目录中找不到'):][:200]))
        for k, v in {'B1': '存在', 'B4': '存在', 'B6': '不存在'}.items(): s.locator(f'select[data-mk="{k}"]').select_option(v); page.wait_for_timeout(120)
        ok(f'[{mode}] D16 条目核查 3 条，2 条与答案同', '与预置答案相同 2/3' in text(page, 'D16'))
        s.locator('input[data-bib="5"]').fill(''); s.locator('input[data-bib="5"]').dispatch_event('change'); page.wait_for_timeout(300)
        # D20
        goto(page, 'D20'); s = slide(page, 'D20')
        ok(f'[{mode}] D20 11 个二维码图片都载入', page.evaluate("[...document.querySelectorAll('deck-slide[slide-id=D20] .w11-qrgrid img')].filter(i=>i.complete&&i.naturalWidth>0).length") == 11)
        s.locator('input[name="mfil"][value="pub"]').check(); page.wait_for_timeout(300)
        ok(f'[{mode}] D20 筛"可分发"只剩 M-1、M-5', s.locator('table.items').first.locator('tr').count() == 3)
        # D13 book
        goto(page, 'D13'); page.wait_for_timeout(800); s = slide(page, 'D13')
        dis = s.locator('input[name="rvsrc"][value="book"]').is_disabled()
        if mode == 'local':
            s.locator('input[name="rvsrc"][value="book"]').check(); page.wait_for_timeout(1500); t = text(page, 'D13')
            ok('[local] D13 书稿一节预置：修订者"作者"，≥10 条', '教师书稿_明治中期一节' in t and '作者' in t and s.locator('table.w11-rev tr').count() - 1 >= 10, str(s.locator('table.w11-rev tr').count() - 1))
        else: ok('[public] D13 书稿预置需本机材料包（单选禁用）', dis)
        # D05 li2023
        goto(page, 'D05'); s = slide(page, 'D05'); s.locator('input[name="olsrc"][value="li2023"]').check(); page.wait_for_timeout(500)
        n = s.locator('table.w11-outline tr').count() - 1
        ok(f'[{mode}] D05 教师论文刊本分段载入', n >= 30, str(n))
        # D18 export no key, restricted flag
        goto(page, 'D18')
        page.screenshot(path=f'{OUT}/{mode}_after.png')
        ctx.close()
    b.close()
ok('全程无页面错误', not errs, '；'.join(errs[:6]))
json.dump({'results': res, 'errors': errs}, open(f'{OUT}/result.json', 'w'), ensure_ascii=False, indent=1)
print(sum(r['pass'] for r in res), '/', len(res))
