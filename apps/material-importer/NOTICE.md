# 浏览器 OCR 移植说明

本应用的 `src/ndl/layout-detector.ts`、`text-recognizer.ts`、`reading-order.ts`、`onnx-config.ts`、类型定义和字符表，适配自桥本雄太的 [yuta1984/ndlocrlite-web](https://github.com/yuta1984/ndlocrlite-web)，固定提交 `50216ccc3e600f6d0d152862c5a201fdade78112`，CC BY 4.0。原作者署名及许可声明保留于 `licenses/ndlocrlite-web.txt`。国立国会图书馆 [NDLOCR-Lite](https://github.com/ndl-lab/ndlocr-lite) 的算法与模型另依其 CC BY 4.0 说明。

改动：拆取 OCR 核心；不含原站界面或统计上报；采用其仓库内附的 PARSeq **16px** 模型，而非主分支另引用的 24px 再训练模型；模型按 SHA-256 固定、同源提供并缓存；识读及字符表加载错误明确返回；增加课程材料身份、范围选择、处理记录与跨应用交换。

模型权重位于本机独立目录，不进入 Git 或正常构建。四个权重共约 147MiB，首次推理按需要载入；检测后的行按长度选择 30／50／100 模型。浏览器实际使用 ONNX Runtime Web 1.24.3 的单线程 WASM，在 Worker 中运行；未把 WebGPU 加速列为已验证能力。

其余依赖及许可：PDF.js 5.6.205（Apache-2.0）；Mammoth 1.13.0（BSD-2-Clause）；JSZip 3.10.1（MIT/GPL-3.0 双许可，采用 MIT）；Tesseract.js 7.0.0（Apache-2.0）；ONNX Runtime Web 1.24.3（MIT）；js-yaml 4.1.0（MIT）；Citation.js 0.9.0（MIT）；PapaParse 5.5.3（MIT）。构建和联网资源是否可用，见实际验证记录。


Scribe.js 0.16.1（AGPL-3.0）是独立可选比较组件，经 PKU_SCRIBE_PACKAGE 指向完整 npm 包后同源装载，包含 LICENSE 和完整模块；不编入导入器核心构建。其文字层提取与 LSTM OCR 是分开的动作；日文扫描样本的实测并不支持将它作为默认识读器。课堂处理优先走本机文字层或 NDLOCR-Lite，比较结果不得作为定本。
