# 10-29 下午：浏览器内 Qwen3 载入失败排查与修订

## 教师报告

Chrome，GitHub Pages，WebGPU 可用。先载入 Qwen3-1.7B（`webgpu/q4f16`），再载入 4B，两次都报“失败：Aborted(). Build with -sASSERTIONS for more info”。刷新后单独载入 4B 正常完成。当时 Ollama 开着。

## 排查（容器，Chromium 无 WebGPU，走 WASM）

| 顺序（同一线程） | 结果 |
|---|---|
| 1.7B（wasm/q8，单文件 1.74 GB） | 下载 1752／1752 MB 完成后 81 秒报 `Aborted()` |
| 接着 0.6B | 26 秒即报 `Aborted()`（被上一次连带） |
| 新页面单独 0.6B | 32 秒载入成功 |

Hugging Face 上 onnx-community 三个仓库自 10-13 起未更新。WebGPU 所用文件：0.6B 为单文件 0.57 GB；1.7B 为单文件 1.43 GB（权重内嵌）；4B 为 60 MB 结构图加两个外部权重文件（2.10 GB、0.68 GB）。判断：单个大文件须整份拷进 WASM 内存（上限约 4 GB）再解析，内存紧时中止；WebGPU 下的这一步未能在容器中直接复现。

## 修订

- 浏览器内 Qwen3 只留 0.6B 与 4B（教师 14:06 决定）；旧设置中的 1.7B 自动改为 0.6B。
- 模型线程任何一次失败后自动关闭，下次新开，不必刷新；失败提示写明运行方式与处理办法。

## 验收

`verify_week07_qwen_reset.py`：6／6（`verification-qwen-reset.json`）。第一次载入时拦截权重请求使其失败，提示为“失败（wasm/q8）：Failed to fetch。模型线程已自动重置，可直接重试。”；放开后不刷新再点一次，30.5 秒载入成功。回归：主验收 82／82、补充 26／26、现场 15／15，`pnpm test` 7／7。

## 未测

Chrome + WebGPU 下“失败后重试”与 4B 实际载入，须在教师 Mac 上复核。
