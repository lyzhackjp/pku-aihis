"""第十一周文献导入器验收。先运行 apps/week11/scripts/start_week11.command。"""
from pathlib import Path
from tempfile import TemporaryDirectory
import os
import re

import fitz
from playwright.sync_api import expect, sync_playwright

APP = Path(__file__).resolve().parents[3] / "apps" / "week11"
BASE = os.getenv("W11_URL", "http://127.0.0.1:8781/prototype/index.html")
TITLE = "页码核对（教学构造）"
TEXT = "A source claim needs a location."


def test_import(browser, pdf, local):
    with browser.new_context() as ctx:
        page = ctx.new_page()
        page.goto(BASE + ("?pack=../local-only/week11-pack.json" if local else ""))
        bar = page.locator(".pack-bar")
        expect(bar).to_be_visible()
        if local:
            expect(bar).to_contain_text("回放 44 条")
        count = lambda: page.evaluate("[W11.Mat.entries().length, W11.Mat.replays().length]")
        before, replays = count()
        assert replays == (44 if local else 0)

        def check_text():
            bar.get_by_role("button", name="材料说明").click()
            info = page.get_by_role("dialog", name="材料说明")
            row = info.get_by_role("row").filter(has_text=TITLE)
            row.get_by_text("查看正文", exact=True).click()
            expect(row).to_contain_text(TEXT)
            expect(row).to_contain_text("PDF页序 2")
            expect(row).to_contain_text("印刷页码／档号 38")
            expect(row.get_by_role("cell").nth(4)).to_have_text("不可" if local else "可")
            info.get_by_role("button", name="关闭").click()

        with page.expect_popup() as opened:
            bar.get_by_role("button", name="文献导入").click()
        importer = opened.value
        send = importer.get_by_role("button", name="送回已经连接的课件")
        expect(send).to_be_enabled()
        importer.locator('input[type="file"]').set_input_files(pdf)
        expect(importer.get_by_role("button", name="处理所选范围")).to_be_enabled()
        title = importer.get_by_label("题名（由文件名暂拟，需核对）")
        title.fill(TITLE)
        title.press("Tab")
        expect(importer.get_by_role("button", name=TITLE + " · 有原件")).to_be_visible()
        # 已登记题名、尚无正文，检查真实回执。
        send.click()
        expect(importer.locator(".status")).to_contain_text("没有可用的正文片段")
        assert count() == [before, replays]
        page_range = importer.get_by_label("PDF 物理页序", exact=False)
        page_range.fill("2")
        page_range.press("Tab")
        importer.get_by_role("button", name="处理所选范围").click()
        transcription = importer.get_by_label("校订文字（原始识读另存）")
        expect(transcription).to_have_value(re.compile(re.escape(TEXT)))
        printed = importer.get_by_label("印刷页码／档号（另行核对）")
        printed.fill("38")
        printed.press("Tab")
        page.once("dialog", lambda dialog: dialog.dismiss() if local else dialog.accept())
        send.click()
        expect(importer.locator(".status")).to_contain_text("已接收 1 个正文片段")
        expect(importer.locator(".status")).to_contain_text("材料说明")
        assert count() == [before + 1, replays]
        check_text()
        page.reload()
        if local:
            expect(bar).to_contain_text("回放 44 条")
        check_text()
        assert count() == [before + 1, replays]

        for slide in ["D04", "D08", "D15"]:
            page.evaluate("(id) => location.hash = id", slide)
            expect(page.locator(f'deck-slide[slide-id="{slide}"]')).to_be_visible()
            check_text()

        bar.get_by_role("button", name="导入 Word 稿").click()
        word = page.get_by_role("dialog", name="导入 Word 稿")
        word.locator('input[type="file"]').set_input_files(APP / "tests/fixtures/jia_draft.docx")
        expect(word).to_contain_text("脚注 8")
        word.get_by_role("button", name="加入本机记录").click()
        expect(word).to_contain_text("已加入本机记录")
        word.get_by_role("button", name="关闭").click()
        bar.get_by_role("button", name="导入表格").click()
        table = page.get_by_role("dialog", name="导入表格")
        table.locator('input[type="file"]').set_input_files({
            "name": "课堂段落.csv", "mimeType": "text/csv",
            "buffer": "段号,正文\nP1,核对材料位置".encode(),
        })
        table.get_by_role("button", name="检查", exact=True).click()
        expect(table).to_contain_text("可用 1 行")
        table.get_by_role("button", name="加入本机记录").click()
        expect(table).to_contain_text("已加入本机记录")
        table.get_by_role("button", name="关闭").click()
        assert count() == [before + 1, replays]
        print(f"{'教师包' if local else '公开包'}：材料 {before} → {before + 1}，回放 {replays}，通过")


if __name__ == "__main__":
    with TemporaryDirectory() as tmp, sync_playwright() as playwright:
        pdf = Path(tmp) / "week11-sample.pdf"
        with fitz.open() as doc:
            for line in ["Teaching fixture. Printed page 37.", "Printed page 38. " + TEXT]:
                doc.new_page().insert_text((52, 72), line)
            doc.save(pdf)
        with playwright.chromium.launch(channel="chrome") as browser:
            print("Chrome", browser.version)
            for local in [True, False]:
                test_import(browser, pdf, local)
