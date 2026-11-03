#!/bin/sh
# 在本机回环地址起 OpenAI 兼容服务（/v1/chat/completions）。课件“模型接入”与 run.py、agent.py 都可连它。
# 用法：sh tools/local-llm/serve.sh [模型键]；环境变量 PORT（默认 8090）、N_CTX（默认 4096）、N_BATCH（默认 128）、THREADS（默认全部核）。
# 内存：经 server_lowmem.py 关闭权重重排副本后，4B Q4_K_M 在 N_CTX=4096 时常驻约 3.1 GB（含映射的权重文件；不关时约 4.9 GB）；N_CTX=8192 时在 7 GB 内存、并开浏览器的环境里曾被内存上限杀掉（2026-11-03）。
HERE=$(cd "$(dirname "$0")" && pwd)
KEY=${1:-qwen3-4b-instruct-2507}
DIR=${PKU_MODELS:-$HOME/.cache/pku-aihis/models}
FILE=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]]['file'])" "$HERE/models.json" "$KEY")
exec python3 "$HERE/server_lowmem.py" --model "$DIR/$FILE" --model_alias "$KEY" --host 127.0.0.1 --port "${PORT:-8090}" --n_ctx "${N_CTX:-4096}" --n_batch "${N_BATCH:-128}" --n_ubatch "${N_BATCH:-128}" ${THREADS:+--n_threads $THREADS}
