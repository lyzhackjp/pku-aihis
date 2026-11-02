#!/bin/sh
# 在本机回环地址起 OpenAI 兼容服务（/v1/chat/completions）。课件“模型接入”与 run.py、agent.py 都可连它。
# 用法：sh tools/local-llm/serve.sh [模型键]；环境变量 PORT（默认 8090）、N_CTX（默认 8192）、THREADS（默认全部核）。
HERE=$(cd "$(dirname "$0")" && pwd)
KEY=${1:-qwen3-4b-instruct-2507}
DIR=${PKU_MODELS:-$HOME/.cache/pku-aihis/models}
FILE=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]]['file'])" "$HERE/models.json" "$KEY")
exec python3 -m llama_cpp.server --model "$DIR/$FILE" --model_alias "$KEY" --host 127.0.0.1 --port "${PORT:-8090}" --n_ctx "${N_CTX:-8192}" ${THREADS:+--n_threads $THREADS}
