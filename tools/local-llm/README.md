# 本地大模型与最小智能体（各周共用）

为课件准备“保存结果回放”时，在本机实际运行开源模型，并留下可核对的运行记录。第七周（llama-cpp-python 0.3.36 ＋ Qwen3-4B-Instruct-2507 Q4_K_M）与第八周用的是同一套；之后各周直接复用，不必重复部署。

| 文件 | 作用 |
|---|---|
| `models.json` | 登记权重：下载地址、SHA-256、大小、许可。目前只登记 Qwen3-4B-Instruct-2507 Q4_K_M（与第七周讲义 4.2 同一文件）。 |
| `setup.sh` | 安装 `llama-cpp-python[server]==0.3.36`，下载权重到 `$PKU_MODELS`（默认 `~/.cache/pku-aihis/models`）并核对 SHA-256。权重不进 Git。 |
| `serve.sh` | 在 `127.0.0.1:${PORT:-8090}` 起 OpenAI 兼容服务。课件“模型接入”可填 `http://127.0.0.1:8090/v1`。 |
| `llmrun.py` | 调用任一 OpenAI 兼容接口并写运行记录（请求、原样回复、usage、用时、模型 SHA-256；不写密钥）。 |
| `agent.py` | 最小智能体：模型写 Python → 在工作目录子进程运行 → 结果回给模型，直到“最终回答”；每一步写入记录。 |

```sh
sh tools/local-llm/setup.sh
sh tools/local-llm/serve.sh &            # 2 核 CPU 上约每秒 3—4 个词元
python3 tools/local-llm/llmrun.py --prompt-file p.txt --out run.json
python3 tools/local-llm/agent.py --task task.md --workdir data/ --out agent-run.json
```

与课程 Ollama（`local/setup-models.py`，端口 11435，`qwen3:4b-instruct-2507-q4_K_M`）的关系：两者可以并存。Ollama 适合课堂现场接入；这里的 llama.cpp 服务适合课前生成回放，因为它直接用登记过 SHA-256 的 GGUF 文件，记录里能写明“是哪一个文件”。用 Ollama 时设 `LLM_BASE=http://127.0.0.1:11435/v1 LLM_MODEL=qwen3:4b-instruct-2507-q4_K_M`。

2026-11-02 在云端工作区（2 核、7 GB 内存、无 GPU）部署并实测：载入约 20 秒，一句短问答约 19 秒（45 个词元）。
