#!/usr/bin/env python3
"""第七周原型补充验收：演讲者窗口双向同步、B 静态模式、输入框内方向键不翻页、五种窗口尺寸 × 30 页。
用法：python3 verify_week07_extra.py <原型 URL> <材料包相对 URL> <输出目录>
每种尺寸逐页检查横向溢出（document.scrollWidth ≤ clientWidth+1）、本页脚本错误与导入提示，并拼一张缩略总览图。"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
from PIL import Image
URL, PACK, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
R = []
def check(name, ok, detail=""):
    R.append({"check": name, "ok": bool(ok), "detail": str(detail)[:300]}); print(("PASS " if ok else "FAIL ") + name, "" if ok else detail)
SIZES = [(1512, 860), (1280, 720), (1024, 768), (899, 860), (390, 844)]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        aud = await ctx.new_page(); errs = []; aud.on("pageerror", lambda e: errs.append(str(e)))
        await aud.goto(URL + f"?pack={PACK}#D14"); await aud.wait_for_timeout(2500)
        ids = await aud.evaluate("Deck.DATA.pages.map(p=>p.id)")
        # 1 演讲者窗口
        pres = await ctx.new_page(); await pres.goto(URL + "?presenter=1#D00"); await pres.wait_for_timeout(1500)
        t = await pres.inner_text("body")
        check("演讲者窗口收到观众屏当前页 D14 并显示已同步", "已与观众屏同步" in t and "D14" in t, t[:200])
        check("演讲者窗口显示三段备注", all(k in t for k in ("目的", "范例引导", "机制背景")))
        await pres.click('[data-act="next"]'); await aud.wait_for_timeout(600)
        check("演讲者窗口点“下一页”→ 观众屏跳到 D16（跳过别名 D15）", await aud.evaluate("location.hash") == "#D16", await aud.evaluate("location.hash"))
        await aud.keyboard.press("ArrowRight"); await pres.wait_for_timeout(800)
        check("观众屏翻页 → 演讲者窗口跟随到 D17", "D17" in (await pres.inner_text("body"))[:200])
        await pres.screenshot(path=f"{OUT}/presenter-D17.png")
        await pres.close()
        # 2 B 静态
        await aud.evaluate("location.hash='#D22'"); await aud.wait_for_timeout(400)
        before = await aud.evaluate("getComputedStyle(document.querySelector('deck-slide[slide-id=\"D22\"] .caret')).animationName")
        await aud.locator("body").click(position={"x": 5, "y": 880}); await aud.keyboard.press("b"); await aud.wait_for_timeout(200)
        after = await aud.evaluate("[document.body.classList.contains('low-power'), getComputedStyle(document.querySelector('deck-slide[slide-id=\"D22\"] .caret')).animationName]")
        check("B 静态：body.low-power 生效，D22 光标闪烁动画关闭", after[0] and before != "none" and after[1] == "none", (before, after))
        await aud.keyboard.press("b")
        # 3 输入框内方向键不翻页
        await aud.evaluate("location.hash='#D21'"); await aud.wait_for_timeout(400)
        await aud.locator('deck-slide[slide-id="D21"] textarea[data-k="json"]').click(); await aud.keyboard.press("ArrowRight"); await aud.wait_for_timeout(300)
        check("焦点在输入框时方向键不翻页（停在 D21）", await aud.evaluate("location.hash") == "#D21")
        await aud.locator('deck-slide[slide-id="D08"]').evaluate("n=>0")
        await aud.evaluate("location.hash='#D08'"); await aud.wait_for_timeout(300)
        await aud.locator('deck-slide[slide-id="D08"] input[data-k="add"]').click(); await aud.keyboard.type("ArrowLeft"); await aud.keyboard.press("ArrowLeft"); await aud.wait_for_timeout(300)
        check("输入框内打字与方向键不翻页（停在 D08）", await aud.evaluate("location.hash") == "#D08")
        # 3b 2026-10-28 晚教师意见：D05 新增一行只加一行；D04 填写示例；输入法组字（CDP 模拟拼音“wang”→“王珪”）不被重绘打断
        await aud.evaluate("location.hash='#D05'"); await aud.wait_for_timeout(400)
        rows = 'deck-slide[slide-id="D05"] .evtable tbody tr'
        n0 = await aud.locator(rows).count(); await aud.locator('deck-slide[slide-id="D05"] [data-ev="add"]').click(); await aud.wait_for_timeout(300)
        n1 = await aud.locator(rows).count()
        check("D05 点一次“新增一行”只增加一行", n1 == n0 + 1, (n0, n1))
        await aud.locator(f'deck-slide[slide-id="D05"] [data-ev="del:{n1 - 1}"]').click(); await aud.wait_for_timeout(200)
        await aud.evaluate("location.hash='#D04'"); await aud.wait_for_timeout(400)
        await aud.locator('deck-slide[slide-id="D04"] [data-fx="example"]').click(); await aud.wait_for_timeout(300)
        vals = await aud.evaluate("[...document.querySelectorAll('deck-slide[slide-id=D04] input[data-arr]')].map(n=>n.value)")
        check("D04“填入示例”填满五个字段与五个用途", len(vals) == 10 and all(vals), vals[:3])
        cdp = await aud.context.new_cdp_session(aud); ime = []
        ids = await aud.evaluate("[...document.querySelectorAll('deck-slide')].map(s=>s.getAttribute('slide-id'))")
        for pid in ids:
            await aud.evaluate(f"location.hash='#{pid}'"); await aud.wait_for_timeout(350)
            n = await aud.evaluate(f"""[...document.querySelectorAll('deck-slide[slide-id={pid}] input:not([type]), deck-slide[slide-id={pid}] input[type=text], deck-slide[slide-id={pid}] textarea')].filter(n=>n.offsetParent&&!n.disabled&&!n.readOnly).map((n,i)=>(n.dataset.imetest=i,i))""")
            for i in n:
                sel = f'deck-slide[slide-id="{pid}"] [data-imetest="{i}"]'
                if not await aud.locator(sel).count(): continue
                await aud.locator(sel).focus(); await aud.evaluate(f"(()=>{{const n=document.querySelector('{sel}');n.value='';n.dispatchEvent(new Event('input',{{bubbles:true}}))}})()")
                for t in ["w", "wa", "wang", "王"]:
                    await cdp.send("Input.imeSetComposition", {"text": t, "selectionStart": len(t), "selectionEnd": len(t)}); await aud.wait_for_timeout(25)
                await cdp.send("Input.insertText", {"text": "王珪"}); await aud.wait_for_timeout(120)
                v = await aud.evaluate("(()=>{const a=document.activeElement;return a&&('value' in a)?a.value:null})()")
                ime.append((pid, i, v))
        bad = [x for x in ime if not (x[2] or "").endswith("王珪") or "王王" in (x[2] or "") or "w" in (x[2] or "")]
        check(f"输入法组字：{len(ime)} 个文字输入框均得到“王珪”、焦点不丢", not bad and len(ime) >= 20, bad[:5])
        await aud.evaluate("localStorage.clear()")
        check("交互检查中无脚本错误", not errs, errs[:3])
        # 4 五种尺寸 × 30 页
        for w, h in SIZES:
            c2 = await b.new_context(viewport={"width": w, "height": h}); pg = await c2.new_page(); e2 = []; pg.on("pageerror", lambda e: e2.append(str(e)))
            await pg.goto(URL + f"?pack={PACK}#D00"); await pg.wait_for_timeout(2500)
            over, gates, thumbs = [], [], []
            for pid in ids:
                await pg.evaluate(f"location.hash='#{pid}'"); await pg.wait_for_timeout(300)
                sw = await pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
                if sw[0] > sw[1] + 1: over.append(f"{pid}:{sw[0]}>{sw[1]}")
                if await pg.locator(f'deck-slide[slide-id="{pid}"] .pack-gate').count(): gates.append(pid)
                f = f"{OUT}/{w}x{h}-{pid}.png"; await pg.screenshot(path=f); thumbs.append(f)
            check(f"{w}×{h}：30 页无横向溢出", not over, over)
            check(f"{w}×{h}：材料包已导入，无页面停在导入提示", not gates, gates)
            check(f"{w}×{h}：30 页无脚本错误", not e2, e2[:3])
            tw = 360; ims = [Image.open(x) for x in thumbs]; th = int(tw * ims[0].height / ims[0].width)
            sheet = Image.new("RGB", (tw * 5, th * ((len(ims) + 4) // 5)), "white")
            for i, im in enumerate(ims): sheet.paste(im.resize((tw, th)), ((i % 5) * tw, (i // 5) * th))
            sheet.save(f"{OUT}/sheet-{w}x{h}.jpg", quality=80)
            for x in thumbs: os.remove(x)
            await c2.close()
        await b.close()
    json.dump(R, open(f"{OUT}/verification-extra.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(sum(r["ok"] for r in R), "/", len(R), "通过")
asyncio.run(main())
