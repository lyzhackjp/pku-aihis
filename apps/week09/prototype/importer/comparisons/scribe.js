let scribe;
const $ = (id) => document.getElementById(id);
async function run(ocr) {
  const file = $("file").files[0];
  if (!file) {
    $("status").textContent = "请先选取一页材料。";
    return;
  }
  $("extract").disabled = $("ocr").disabled = true;
  const started = performance.now();
  let doc;
  try {
    scribe ||= (await import("/comparison/scribe-package/scribe.js")).default;
    scribe.opt.workerN = 2;
    scribe.opt.progressHandler = (m) =>
      ($("status").textContent = "实际处理进度：" + JSON.stringify(m));
    doc = await scribe.openDocument([file]);
    if (doc.pageMetrics.length > 3)
      throw Error("比较页面限制为三页以内；请先在导入器中选页。");
    if (ocr) await doc.recognize({ langs: [$("lang").value], modeAdv: "lstm" });
    const text = await doc.exportData("txt", { usePDFText: true });
    $("result").value = text || "";
    $("status").textContent =
      `Scribe.js 0.16.1 · ${ocr ? "LSTM OCR" : "已有文字层"} · ${((performance.now() - started) / 1000).toFixed(1)} 秒 · ${String(text).length} 字。结果待核。`;
  } catch (e) {
    $("status").textContent = "比较未完成：" + e.message;
  } finally {
    await doc?.close();
    await scribe?.terminate();
    $("extract").disabled = $("ocr").disabled = false;
  }
}
$("extract").onclick = () => run(false);
$("ocr").onclick = () => run(true);
