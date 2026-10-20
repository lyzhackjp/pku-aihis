# 可选本机 API 转发器

候选，未经教师确认。2026-10-20。浏览器直连遇到跨域限制时，由教师启动；开发验收未调用外部模型。

用 Python 标准库运行，只监听 127.0.0.1。每次启动明确列出允许转发的官方完整地址，例如：

```sh
python3 tools/llm-proxy/server.py --allow https://api.anthropic.com/v1/messages --allow https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```

网页“模型接入”中勾选本机转发器。代理检查网页 Origin、精确目标与官方端点白名单，不跟随重定向，不记录请求、回复或 Key。Key 随本次请求临时转发；网页仍只在内存保存 Key，模型回复日志会脱敏当前配置中的 Key。请求体上限 32 MiB。

默认页面源为 http://127.0.0.1:8776，若使用不同端口，另填 `--origin`。不代理自定义服务或本机模型；这些服务在网页中直接连接。预设地址来源见 `modules/history-demo/ocr/api-presets.json`。
