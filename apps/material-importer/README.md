# 通用材料导入与预处理

开发基线 main 2580682abff19418118e9278781e5997c30f3118，原开发分支为 feat/universal-material-import。它可以独立构建；第四周课件不是构建依赖。两应用通过共享项目记录接续，第四周页面内部的操作与临时回看不改变导入握手。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
pnpm run check
pnpm run build
pnpm preview
```

本机入口 http://127.0.0.1:5174/。支持 PDF 文字层、扫描 PDF、图像、DOCX、纯文本、RIS/BibTeX/CSV/CSL JSON 和项目备份。文件名仅暂拟题名，新文件保持“待分类”，责任者和年代不猜测。PDF 按物理页选范围，Word 按正文段落/脚注定位；不会伪造排版页码。空文字层要求选用 OCR，不会声称取得全文。

文件、片段与已完成页保存到 IndexedDB；处理失败或取消保留完成部分。同一指纹重复上传保留校订与阅读记录。DOCX 段落和纯文本再处理按定位避开重复。原始识读与校订文字、引擎、时耗、核验状态分别留存。教师研究草稿不纳入普通原文检索。

NDLOCR-Lite 核心使用 ONNX Runtime Web 单线程 WASM/Worker。先将固定权重放入指定目录，再执行：

```sh
PKU_OCR_MODELS=/path/to/models pnpm preview
```

模型文件及预期 SHA-256 见 src/ndl/models.json；权重不在 Git 和正常构建中。首次按需加载约 147MiB 的本机模型，浏览器缓存后再用。NDL 核心、字符表及许可见 NOTICE.md 和 licenses/。未配置模型则明确报错；没有把 WebGPU 写成已测试能力。

Tesseract.js 使用本机 worker/core，语言数据首次来自其默认 CDN；因此它首次识读可能需要互联网。API 视觉识读独立配置，点击后只发送所选页图像，key 仅在窗口内存，不因支持聊天就假定模型支持图像。

Scribe.js 比较组件另行安装固定 scribe.js-ocr 0.16.1 完整包，通过 PKU_SCRIBE_PACKAGE 指向其目录同源装载；入口 /comparisons/scribe.html。它是 AGPL-3.0 可选组件，未编入核心构建。单独比较文字层提取和 LSTM OCR，限制三页以内。对本次日文扫描样本的结果不适宜作为主线识读。

从课件的“导入材料”按钮打开后，按精确 origin 与 opener 身份完成握手，再把原件 Blob 和项目送回课件。另支持下载完整 ZIP 后恢复/追加；学生不必手写 JSON。第三周导出是平铺记录，未生成向量，须在第三周核对来源及向量模式。

使用浏览器保存不等于永久备份；含原件 ZIP 以 SHA-256 校验恢复。合并状态以PR为准；合并不等于发布。公开工程不包含私人材料或模型凭据。
