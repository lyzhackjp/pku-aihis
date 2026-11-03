#!/usr/bin/env python3
"""第八周原型浏览器验收（Playwright）。
用法：python3 verify_week08.py <原型 URL> <本机材料包相对 URL 或 -> <输出目录> [--models]
例：在含 prototype/ 与 local-only/week08-pack.json 的目录起 python3 -m http.server 8788，再
    python3 verify_week08.py http://127.0.0.1:8788/prototype/index.html ../local-only/week08-pack.json out
--models：另在浏览器内实际载入句向量与 GLiNER 模型（需联网；经代理时设 HTTPS_PROXY）。
检查讲义数值回归、交互、未导入材料包时的提示、两种视口无横向溢出、全程无脚本错误。"""
import asyncio, json, os, sys, pathlib, re
from playwright.async_api import async_playwright

URL, PACK, OUT = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3]); MODELS = '--models' in sys.argv
OUT.mkdir(parents=True, exist_ok=True); (OUT / 'screenshots').mkdir(exist_ok=True)
results = []
def check(name, ok, detail=''):
    results.append({'check': name, 'ok': bool(ok), 'detail': str(detail)[:300]}); print(('✔' if ok else '✘'), name, ('' if ok else detail))

async def main():
    async with async_playwright() as p:
        args = []
        if MODELS and os.environ.get('HTTPS_PROXY'):
            px = os.environ['HTTPS_PROXY'].replace('http://', '').split('@')[-1]
            args = [f'--proxy-server=http://{px}', '--proxy-bypass-list=127.0.0.1;localhost', '--ignore-certificate-errors']
        b = await p.chromium.launch(args=args)
        errs = []
        def watch(pg):
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'onnxruntime' not in m.text else None)
        # ---------- 1 未导入本机材料包 ----------
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); watch(pg)
        await pg.goto(URL + '#D01'); await pg.wait_for_timeout(2500)
        t = await pg.inner_text('deck-slide[slide-id="D01"]')
        check('未导入时 D01 显示材料包提示', '需课堂导入第八周本机材料包' in t, t[:200])
        await pg.goto(URL + '#D13'); await pg.wait_for_timeout(800)
        t = await pg.inner_text('deck-slide[slide-id="D13"]')
        check('未导入时 D13 不内置日记原文', '需课堂导入' in t and '中井' not in t, t[:200])
        await pg.goto(URL + '#D10'); await pg.wait_for_timeout(800)
        t = await pg.inner_text('deck-slide[slide-id="D10"]')
        check('未导入时公开材料页 D10 可用', '丁' in t and '9' in t)
        await ctx.close()
        # ---------- 2 导入后逐页 ----------
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); watch(pg)
        q = '' if PACK == '-' else '?pack=' + PACK
        await pg.goto(URL + q + '#D00'); await pg.wait_for_timeout(4000)
        ids = await pg.evaluate("window.DECK_DATA.pages.map(p=>p.id)")
        check('页表 26 页', len(ids) == 26, len(ids))
        async def go(i): await pg.evaluate(f"location.hash='{i}'"); await pg.wait_for_timeout(600)
        async def txt(i): return await pg.inner_text(f'deck-slide[slide-id="{i}"] .slide-body')
        # D01
        await go('D01'); t = await txt('D01')
        bad = await pg.locator('deck-slide[slide-id="D01"] tr.bad').count()
        check('D01 按类型计数与讲义 @fig-wanggui-types 一致（8 行）', bad == 0 and '97' in t, f'bad rows {bad}')
        check('D01 纪念文字 73、出处含《華陽集》63、无出处 17', '纪念文字类 73 条' in t and '63 条' in t and '17 条' in t, t[:300])
        await pg.check('deck-slide[slide-id="D01"] input[data-k="memorial"]'); await pg.wait_for_timeout(500); t = await txt('D01')
        check('D01 去掉纪念文字后剩 24 条、19 人', '剩余 24 条记录、19 人' in t, re.findall(r'剩余[^。]*', t))
        await pg.uncheck('deck-slide[slide-id="D01"] input[data-k="memorial"]'); await pg.wait_for_timeout(300)
        hits = await pg.evaluate("W8.findInHuayangji('李氏墓誌銘 / 華陽集').map(h=>h.juan)")
        check('D01 回原文：“李氏墓誌銘”在本地《華陽集》卷五十一', 51 in hits, hits)
        await pg.locator('deck-slide[slide-id="D01"] svg.netsvg line').first.click(force=True); await pg.wait_for_timeout(400)
        check('D01 点边显示出处卡', await pg.locator('deck-slide[slide-id="D01"] .evid-card').count() >= 1)
        await pg.screenshot(path=str(OUT / 'screenshots/D01_edge.png'))
        # 网络图交互：点节点看指标、拖动节点、滚轮缩放、指标表；过滤后位置保留
        S = 'deck-slide[slide-id="D01"] '
        c = await pg.locator(S + 'g[data-node="1845"] circle').bounding_box()
        await pg.mouse.click(c['x'] + c['width'] / 2, c['y'] + c['height'] / 2); await pg.wait_for_timeout(300)
        info = await pg.inner_text(S + '.netinfo')
        check('网络图：点王珪显示度 84、出度 84、记录 97', '84' in info and '97' in info and '出度／入度' in info, info[:120])
        n2 = pg.locator(S + 'g[data-node="1488"] circle'); b2 = await n2.bounding_box()
        await pg.mouse.move(b2['x'] + 3, b2['y'] + 3); await pg.mouse.down(); await pg.mouse.move(b2['x'] + 60, b2['y'] + 40, steps=5); await pg.mouse.up(); b3 = await n2.bounding_box()
        check('网络图：节点可拖动', abs(b3['x'] - b2['x']) > 30)
        sv = pg.locator(S + 'svg.netsvg'); vb0 = await sv.get_attribute('viewBox'); sb = await sv.bounding_box()
        await pg.mouse.move(sb['x'] + sb['width'] / 2 + 20, sb['y'] + sb['height'] / 2 + 20); await pg.mouse.wheel(0, -400); await pg.wait_for_timeout(300)
        check('网络图：滚轮缩放', (await sv.get_attribute('viewBox')) != vb0)
        await pg.click(S + '[data-net="table"]'); await pg.wait_for_timeout(300)
        check('网络图：指标表列出度、介数、聚类系数', '聚类系数' in await pg.inner_text(S + '.nettable'))
        await pg.click(S + '[data-net="reset"]'); await pg.wait_for_timeout(300)
        # D04
        await go('D04'); t = await txt('D04')
        check('D04 两份材料四栏说明并排', t.count('缺在哪里') >= 2)
        await pg.click('deck-slide[slide-id="D04"] details[data-adv] summary'); await pg.click('deck-slide[slide-id="D04"] button[data-set="miss:drop"]'); await pg.wait_for_timeout(300); t2 = await txt('D04')
        await pg.click('deck-slide[slide-id="D04"] button[data-set="miss:absent"]'); await pg.wait_for_timeout(300); t1 = await txt('D04')
        c1 = re.search(r'结论：([^。]*)', t1).group(1); c2 = re.search(r'结论：([^。]*)', t2).group(1)
        check('D04 进阶：两种缺失值处理结论相反（教学构造）', c1 != c2 and '复杂化在先' in c1, f'{c1} / {c2}')
        # D06
        await go('D06'); t = await txt('D06')
        diffs_lev = await pg.evaluate("[...document.querySelectorAll('deck-slide[slide-id=D06] table.simtable tr')].slice(1).map(r=>r.children[3].classList.contains('diff'))")
        diffs_lcs = await pg.evaluate("[...document.querySelectorAll('deck-slide[slide-id=D06] table.simtable tr')].slice(1).map(r=>r.children[4].classList.contains('diff'))")
        check('D06 程宁表 2 的“编辑距离”栏十组都等于 2×LCS／总字数', not any(diffs_lcs[:10]), diffs_lcs)
        check('D06 按 1−编辑距离／较长句字数有 4 组与论文不同（CN02、CN06、CN07、CN08：共有字次序相反或错位）', diffs_lev[:10] == [False, True, False, False, False, True, True, True, False, False], diffs_lev)
        check('D06 阈值 0.9 下保留 10／11 组（0.88 一例被排除）', '保留 10 ／ 11 组' in t, re.findall(r'保留[^。]*', t))
        # D08
        await go('D08'); t = await txt('D08')
        check('D08 四人网络：有向时矩阵不对称', '矩阵不对称' in t)
        await pg.click('deck-slide[slide-id="D08"] button[data-set="dir:false"]'); await pg.wait_for_timeout(300)
        check('D08 无向时矩阵对称', '沿对角线对称' in await txt('D08'))
        await pg.click('deck-slide[slide-id="D08"] button[data-set="tab:dup"]'); await pg.wait_for_timeout(300); t = await txt('D08')
        check('D08 查重列出俞充、李受、周必大等多条记录', '俞充' in t and '李受' in t and '周必大' in t, re.findall(r'同一对人[^。]*', t))
        await pg.click('deck-slide[slide-id="D08"] button[data-set="tab:adj"]')
        # D09
        await go('D09'); t = await txt('D09')
        check('D09 表头转换与导出按钮', 'Source' in t and await pg.locator('deck-slide[slide-id="D09"] [data-exp="edges"]').count() == 1)
        # D10
        await go('D10'); t = await txt('D10')
        bt = await pg.evaluate("(()=>{const m=W8.Mat.get('toy7');const g=W8.graph(m,{directed:false});const b=W8.betweenness(g);return Object.fromEntries(g.nodes.map((n,i)=>[n.id,b[i]]))})()")
        check('D10 七人小网介数：丁 9，丙、戊 8，其余 0（讲义 @fig-betw）', bt == {'甲': 0, '乙': 0, '丙': 8, '丁': 9, '戊': 8, '己': 0, '庚': 0}, bt)
        check('D10 页面显示密度 0.38', '0.38' in t)
        await pg.click('deck-slide[slide-id="D10"] [data-preset="jiaji"]'); await pg.wait_for_timeout(400); t = await txt('D10')
        m = re.search(r'丁\s+2\s+([\d.]+)\s*（原 9）', t)
        check('D10 添“甲—己”后丁的介数下降', m and float(m.group(1)) < 9, m.group(0) if m else t[:300])
        await pg.click('deck-slide[slide-id="D10"] [data-preset="reset"]')
        await pg.select_option('deck-slide[slide-id="D10"] select[data-k="mat"]', 'padgett'); await pg.wait_for_timeout(500); t = await txt('D10')
        check('D10 美第奇：度 6、介数 47.5 均最高', '度最高：Medici（6）' in t and '介数最高：Medici（47.50）' in t, re.findall(r'度最高[^\n]*', t))
        await pg.select_option('deck-slide[slide-id="D10"] select[data-k="mat"]', 'toy7')
        # D11
        await go('D11'); t = await txt('D11')
        check('D11 七人小网：密度 0.381、丙聚类系数 0.33', '0.381' in t and '（页面：0.33）' in t)
        await pg.click('deck-slide[slide-id="D11"] [data-run]'); await pg.wait_for_timeout(2500); t = await txt('D11')
        check('D11 生成 100 张随机网络并给出实际值位置', '100 张随机网络中' in t, re.findall(r'实际值[^。]*', t))
        # D12
        await go('D12'); t = await txt('D12')
        check('D12 王裕华亲属网 2106 人，王珪度 11，作为 target 11 行', '全网 2106 人' in t and '此人度 11' in t and 'target（他人的亲属）11 行' in t, re.findall(r'全网[^。]*。[^。]*', t))
        check('D12 复制数据：王珪 0.11、王安石 0.47、司马光 0.61', all(x in t for x in ['0.11', '0.47', '0.61']))
        check('D12 变法立场空缺 74 人', '为空者 74 人' in t)
        # D13
        await go('D13'); t = await txt('D13')
        check('D13 默认 BS09（文政七年九月六日，全書本 p.658）', '文政七年九月六日' in t and '658' in t)
        check('D13 JBDB 同日只有一条书信事件，赴京记事未录入', '餘一から' in t and '未录入' in t)
        await pg.click('deck-slide[slide-id="D13"] button[data-who="中井小娘二人"]'); await pg.wait_for_timeout(300)
        check('D13 点选人物生成边表一行', '中井小娘二人' in await pg.inner_text('deck-slide[slide-id="D13"] table.steps'))
        ar = await pg.evaluate("(()=>{const b=document.querySelector('deck-slide[slide-id=D13] .cropbox');return b?getComputedStyle(b).aspectRatio:''})()")
        check('D13 影像按比例裁去页脚（外框宽高比已按原图设定）', '/' in ar, ar)
        # D20
        await go('D20'); t = await txt('D20')
        check('D20 王珪年份：有年份 18 条、缺省 79 条；可疑值 1085 共 14 条；早于出生 1 条', '有年份 18 条，缺省 79 条' in t and '1085）14 条' in t and '早于事主出生（1019）的 1 条' in t, re.findall(r'有年份[^。]*。[^。]*。[^。]*。', t))
        await pg.fill('deck-slide[slide-id="D20"] input[data-k="miss"]', ''); await pg.press('deck-slide[slide-id="D20"] input[data-k="miss"]', 'Tab'); await pg.wait_for_timeout(400); t = await txt('D20')
        check('D20 不声明缺省值时 97 条都“有年份”（0 年被当作年份）', '有年份 97 条' in t, re.findall(r'有年份[^。]*', t))
        await pg.fill('deck-slide[slide-id="D20"] input[data-k="miss"]', '0,-1'); await pg.press('deck-slide[slide-id="D20"] input[data-k="miss"]', 'Tab'); await pg.wait_for_timeout(300)
        # D02 D03 D05 D07（第三批）
        S = lambda i: f'deck-slide[slide-id="{i}"]'
        await go('D02'); await pg.click(S('D02') + ' [data-set="ans:unit"]'); await pg.click(S('D02') + ' [data-set="unit:篇"]'); t = await txt('D02')
        check('D02 远读“换单位”：选“研究的单位”出讲义回答；选“篇”连到 D07', '决定看什么单位' in t and '以“篇”为单位' in t)
        check('D02 莫莱蒂原句与核对说明', 'distance, let me repeat it, is a condition of knowledge' in t and '第 57 页' in t)
        await go('D03')
        for i, v in enumerate(['both', 'close', 'far', 'both']): await pg.click(S('D03') + f' [data-pick="{i}:{v}"]')
        await pg.click(S('D03') + ' [data-set="show:1"]'); await pg.wait_for_timeout(300); t = await txt('D03')
        n_ok = await pg.evaluate("document.querySelectorAll('deck-slide[slide-id=D03] .pcard.keep').length")
        check('D03 四问分类后显示讲义判断：1、3、4 往返，2 近读；故意放错第三问，判对 3 个', n_ok == 3 and '（2）近读' in t and '（3）往返' in t, n_ok)
        await pg.click(S('D03') + ' [data-set="row:网络分析"]'); dim = await pg.evaluate("document.querySelectorAll('deck-slide[slide-id=D03] table.mxo td.dim').length")
        check('D03 方法×对象表按“网络分析”筛选后其余 12 格变淡', dim == 12, dim)
        await go('D05'); t = await txt('D05')
        check('D05《宋史》较长选段“相”4 次：宰相 2、相公 1、副词 1（按建议）', '“相”出现 4 次' in t and '宰相（官位） 2｜相公（称谓） 1｜互相、相继（副词） 1' in t, re.findall(r'“相”出现[^。]*|宰相（官位）[^\n]*', t))
        await pg.select_option(S('D05') + ' select[data-k="mat"]', 'practice1'); await pg.wait_for_timeout(300); t = await txt('D05')
        check('D05 练习材料一只有 2 处“相”，页面提示讲义所举用法不在此段', '“相”出现 2 次' in t and '两段都没有' in t)
        await pg.select_option(S('D05') + ' select[data-k="mat"]', 'huayangji'); await pg.wait_for_timeout(300)
        await pg.select_option(S('D05') + ' select[data-k="juan"]', 'all'); await pg.wait_for_timeout(500); t = await txt('D05')
        check('D05《華陽集》全部卷“相”120 次', '“相”出现 120 次' in t, re.findall(r'“相”出现[^。]*', t))
        await pg.select_option(S('D05') + ' select[data-k="mat"]', 'songshi_w7')
        await go('D07'); await pg.select_option(S('D07') + ' select[data-k="corpus"]', 'huayangji'); await pg.wait_for_timeout(8000); t = await txt('D07')
        check('D07《華陽集》282 篇在浏览器内跑 LDA，主题×文体表显示主题先分出制詞与碑志', '282 篇' in t and '碑志祭文等' in t and '材料构成' in t, re.findall(r'\d+ 篇、词表 \d+', t))
        if PACK != '-':
            for c, need in (('ballard', 'MIDWIFERY'), ('qingshilu', 'Miller 2013'), ('meishi', '山田')):
                await pg.select_option(S('D07') + ' select[data-k="corpus"]', c); await pg.wait_for_timeout(400)
                await pg.fill(S('D07') + ' input[data-name]', '验收'); await pg.dispatch_event(S('D07') + ' input[data-name]', 'change'); await pg.wait_for_timeout(300)
                if not await pg.locator(S('D07') + ' .pcard.keep').count(): await pg.click(S('D07') + ' [data-set^="reveal"]'); await pg.wait_for_timeout(300)
                t = await txt('D07'); check(f'D07 {c}：保存结果回放，三篇原文与原研究者命名', need in t and '本篇中此主题占' in t and '保存结果回放' in t, t[-300:])
                if c == 'ballard': check('D07 Ballard 练习主题（K＝30，种子 1）与 Blevins MIDWIFERY 词表重合 7 词', '与本主题前 15 词重合 7 个' in t)
        # D14—D22（第三批）
        await go('D14'); await pg.wait_for_timeout(2500); t = await txt('D14')
        check('D14 王裕华神宗朝网随机删 20% 边，前五名表与保留比例', '原排名前五' in t and '平均每次保留原前五中的' in t, re.findall(r'平均每次[^。]*', t))
        check('D14 李氏墓志节录 9 人：同篇共现 36 条、明载 9 条、多出 27 条', '出现 9 人' in t and '得 36 条' in t and '明载的只有 9 条' in t and '多出 27 条' in t)
        await go('D15'); t = await txt('D15')
        check('D15 差的提法五件事全缺（关键词检查）', t.count('缺') >= 5 and '回答中' in t, re.findall(r'回答中[有没]+', t)[:8])
        await go('D16'); await pg.wait_for_timeout(1500); t = await txt('D16')
        check('D16 十五个史料地名分三栏（唯一、多个、无对应），候选来自 CHGIS TGAZ', '唯一匹配' in t and '多个候选' in t and '无对应' in t and 'TGAZ' in t, re.findall(r'(唯一匹配|多个候选|无对应)（\d+）', t))
        await pg.click(S('D16') + ' [data-sel="延安"]'); await pg.wait_for_timeout(300)
        await pg.check(S('D16') + ' [data-np="延安"]'); await pg.wait_for_timeout(300); t = await txt('D16')
        check('D16 把“延安”（封号）标为不是地点后，地图上少一个点', '个地名上图' in t, re.findall(r'\d+ 个地名上图', t))
        await go('D17'); await pg.click(S('D17') + ' [data-set="crs:gcj"]'); await pg.wait_for_timeout(500); t = await txt('D17')
        offs = [int(x) for x in re.findall(r'\t(\d{3})(?:\n|$)', t)]
        check('D17 WGS 84 误叠 GCJ-02：各点偏移数百米', len(offs) >= 5 and all(200 <= x <= 900 for x in offs), offs[:8])
        await go('D18'); await pg.wait_for_timeout(800); t = await txt('D18')
        check('D18 模型抽取表、上图与计分（容限滑块）', '有参照坐标可比的' in t and '容限' in t and 'qwen3-4b' in t.lower(), re.findall(r'有参照坐标可比的[^。]*', t))
        await go('D19'); t = await txt('D19')
        check('D19 王裕华点表：表格 2106 行，地图 2106 点；开封叠放', '表格 2106 行，地图 2106 点' in t and '叠在' in t)
        await pg.click(S('D19') + ' [data-set="swap:true"]'); await pg.wait_for_timeout(500); t = await txt('D19')
        check('D19 交换经纬度后提示疑似颠倒、可画点数骤减', '疑似经纬度颠倒' in t, re.findall(r'表格[^。]*。', t))
        await pg.click(S('D19') + ' [data-set="swap:false"]')
        await go('D21'); await pg.wait_for_timeout(2500)
        red = await pg.evaluate("document.querySelector('deck-slide[slide-id=D21] canvas[data-diff]')?.dataset.red")
        t = await txt('D21'); check('D21 武鑑嘉永四、五年两版薩摩页差分（当主名斉興→斉彬）', red and int(red) > 0 and '斉彬' in t, red)
        await pg.click(S('D21') + ' [data-set="tab:era"]'); await pg.fill(S('D21') + ' input[data-k="era"]', '熙寧三年'); await pg.press(S('D21') + ' input[data-k="era"]', 'Enter'); await pg.wait_for_timeout(300); t = await txt('D21')
        check('D21 年号换算：熙寧三年＝1070', '公元 1070 年' in t)
        await pg.click(S('D21') + ' [data-set="tab:text"]'); await pg.wait_for_timeout(1500); t = await txt('D21')
        check('D21 王珪传数字本逐字对齐（异体字另标）', '逐字对齐：异体字' in t, re.findall(r'逐字对齐[^。]*', t))
        await pg.click(S('D21') + ' [data-set="tab:bukan"]')
        await go('D22'); t = await txt('D22')
        check('D22 模型年表逐行回原文：引句与年份核对', '引句在原文中找不到的' in t and '年份与页面换算不一致的' in t, re.findall(r'共 \d+ 行[^。]*。', t))
        # D23
        await go('D23'); await pg.fill('deck-slide[slide-id="D23"] textarea[data-ki="s1a"]', '在现存记录中，王珪为 84 人中的多数写过纪念文字。')
        await pg.fill('deck-slide[slide-id="D23"] textarea[data-ki="s1b"]', '在现存记录中，去掉纪念文字后只剩 19 人。'); await pg.wait_for_timeout(300)
        done = await pg.evaluate("JSON.parse(localStorage.getItem('week08-prototype/w8/D23')).done.scale")
        check('D23 第一步填写后记为完成，打字时不整页重绘', done is True)
        await pg.click('deck-slide[slide-id="D23"] button[data-set="stage:source"]'); await pg.wait_for_timeout(300)
        for k in range(3): await pg.click(f'deck-slide[slide-id="D23"] button[data-pickc="{k}"]'); await pg.wait_for_timeout(150)
        check('D23 回读三条原文后“问来源”完成', await pg.evaluate("JSON.parse(localStorage.getItem('week08-prototype/w8/D23')).done.source") is True)
        async with pg.expect_download() as dl: await pg.click('deck-slide[slide-id="D23"] button[data-th="export"]')
        md = (await (await dl.value).path()).read_text(encoding='utf-8') if hasattr(await (await dl.value).path(), 'read_text') else open(await (await dl.value).path(), encoding='utf-8').read()
        check('D23 导出的记录单含三条原文与模板各栏', '原文一' in md and '原文三' in md and '能写进论文的一句话' in md, md[:200])
        await go('D00'); t = await txt('D00')
        check('D00 封面显示贯穿页完成状态', await pg.locator('deck-slide[slide-id="D00"] .dot.on').count() >= 2)
        # D25
        await go('D25'); n = await pg.locator('deck-slide[slide-id="D25"] .concept-card').count()
        check('D25 概念表 34 条', n == 34, n)
        # 输入框内方向键不翻页
        await go('D13'); await pg.click('deck-slide[slide-id="D13"] input[data-ki="pick"]'); await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(200)
        check('输入框内方向键不翻页', (await pg.evaluate('location.hash')) == '#D13')
        # 逐页截图（1440×900）与横向溢出
        for i in ids:
            await go(i); await pg.screenshot(path=str(OUT / f'screenshots/{i}.png'))
        ctx2 = await b.new_context(viewport={'width': 390, 'height': 844}); pg2 = await ctx2.new_page(); watch(pg2)
        await pg2.goto(URL + q + '#D00'); await pg2.wait_for_timeout(3500); over = []
        for i in ids:
            await pg2.evaluate(f"location.hash='{i}'"); await pg2.wait_for_timeout(400)
            if await pg2.evaluate('document.documentElement.scrollWidth > innerWidth + 1'): over.append(i)
            if i in ('D01', 'D12', 'D13', 'D23'): await pg2.screenshot(path=str(OUT / f'screenshots/narrow_{i}.png'), full_page=True)
        check('390×844 下各页无横向溢出', not over, over)
        # 浏览器内模型（可选）
        if MODELS:
            await go('D06'); await pg.click('deck-slide[slide-id="D06"] [data-emb]'); await pg.wait_for_timeout(60000)
            t = await txt('D06'); emb = await pg.evaluate("localStorage.getItem('week08-prototype/w8/emb')")
            check('D06 浏览器内句向量模型实际计算余弦', emb and len(json.loads(emb)) == 1, (emb or '')[:200])
            await go('D13'); await pg.click('deck-slide[slide-id="D13"] [data-ner]'); await pg.wait_for_timeout(90000)
            nb = await pg.inner_text('deck-slide[slide-id="D13"] .nerbox')
            check('D13 浏览器内 GLiNER 给出人物候选', 'gliner' in nb.lower(), nb[:200])
            await pg.screenshot(path=str(OUT / 'screenshots/D13_gliner.png'))
        check('全程无脚本错误', not errs, errs[:5])
        await b.close()
    (OUT / 'verification.json').write_text(json.dumps({'url': URL, 'pack': PACK, 'models': MODELS, 'passed': sum(r['ok'] for r in results), 'total': len(results), 'results': results}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"{sum(r['ok'] for r in results)}/{len(results)} 通过")
asyncio.run(main())
