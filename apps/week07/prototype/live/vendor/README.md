# live/vendor：随原型复制的第三方或共用文件

| 文件 | 来源 | 说明 |
|---|---|---|
| `api.mjs`、`api-presets.json` | 本仓库 `modules/history-demo/ocr/`（提交 c9d599c，原样复制） | 第六周模型接入页用的协议适配与服务预设。原型不经构建、不能跨目录引用，故复制；移植到 Stencil 时改为直接引用原文件。 |
| `langextract-1.7.1+3a68580-py3-none-any.whl` | google/langextract 提交 3a68580（v1.7.1 后 8 个提交），`pip wheel . --no-deps` 自源码构建 | 与 D25 课前实跑同一提交；PyPI 的 1.7.1 少了 resolver 等 8 个提交，故不用。SHA-256 13bb646de19e23d230430d6bafbc6c8724e5c1741224d4e7e56f2eefeb85f348。许可 Apache-2.0，见 `LICENSE.langextract`。 |

运行时另从 CDN 取固定版本（不入库）：transformers.js 3.8.1、gliner 0.0.19、onnxruntime-web 1.19.2（jsdelivr），Pyodide 0.28.3（jsdelivr）及其包、PyPI 上的 absl-py／more-itertools／tqdm／typing-extensions；模型权重来自 Hugging Face（onnx-community/Qwen3-0.6B／1.7B／4B-ONNX、onnx-community/gliner_multi-v2.1 的 fp16）。
