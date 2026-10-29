# 第七周 10-29（二）：材料公开范围与教师 Mac 实测

教师决定（10-29 11:09）：CBDB 仍课堂导入，导入时显示引注“CBDB BJ 20260602，CC BY-NC-SA 4.0”；其他所有材料公开，学生打开即可看。

## 修改

- 公开材料改为 CBDB 以外的全部材料：在 NDL、维基文库、DDBC、HIPE 之外，加上教学文件夹原件、讲义所录节录、人工参照转录与 D25 课前运行记录。构建脚本断言不含 CBDB 接口返回。
- 不导入时仍需导入的页只剩用到 CBDB 的 D01、D07、D09、D12、D18；D04 的 CBDB 一栏导入后显示。
- 导入 CBDB 材料包后，顶栏显示“CBDB 材料已导入（CBDB BJ 20260602，CC BY-NC-SA 4.0）”；D01、D04、D07、D09、D12、D18 页脚显示完整引注，并注明“本课件所用记录经 CBDB API 于 2026-10-28 取得”。

## 教师 Mac 实测（Claude 应用自带浏览器，Chrome 152 内核，WebGPU 可用；Ollama 0.40.13）

| 项 | 结果 | 记录 |
|---|---|---|
| 本机服务（双击 `启动第七周演示.command`） | 正常；`?pack=` 自动导入 CBDB 材料包，顶栏与页脚引注正确 | — |
| 浏览器内 Qwen3-4B（WebGPU q4f16） | 跑通。首次下载 2.84 GB；B 型、『大日本史料』第 1 页：154 秒、2048 词元达上限截断，容错读出 44 条 mention | `browser-qwen3-4b-B-dnsr.json` |
| Ollama + Qwen3-4B-Instruct-2507 Q4_K_M（讲义同款模型，Ollama 官方库文件） | 跑通。同一提示与 JSON Schema：32 秒，2239 词元，合法 JSON，22 条 mention、6 条 event；6 条 event 的公元年全写成 1467（应为 1508） | `ollama-qwen3-4b-B-dnsr.json` |
| 课件页 → Ollama | **未测通**：Claude 应用自带浏览器拦截网页对本机其他端口的请求（ERR_BLOCKED_BY_CLIENT），属于该浏览器面板的限制；上面的 Ollama 实跑是从 Ollama 自身地址发出、请求体与课件相同 | — |

在 Chrome 中验证“课件页 → Ollama”：

1. 打开 `http://127.0.0.1:8777/prototype/index.html#D23`，点顶栏“模型接入”。
2. 选“本机 Ollama／LM Studio”配置，API 型号填 `qwen3:4b-instruct-2507-q4_K_M`，输出约束选 JSON Schema。
3. 点“发送一句公开测试文字”。

本机页面访问本机 Ollama 属同源地址段，Chrome 不弹本地网络权限；Ollama 默认放行 127.0.0.1 的任意端口。

## 容器内回归

主验收 82／82，补充验收 26／26，现场运行 15／15。`file://` 不导入时只有 D01、D07、D09、D12、D18 提示导入。
