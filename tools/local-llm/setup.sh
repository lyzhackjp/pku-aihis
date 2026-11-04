#!/bin/sh
# 课程本地大模型运行环境（可在教师电脑或任何 Linux／macOS 工作区复用）：
#   llama-cpp-python 0.3.36（含 OpenAI 兼容服务）＋ models.json 登记的 GGUF 权重（下载后核对 SHA-256）。
# 权重放在 ${PKU_MODELS:-$HOME/.cache/pku-aihis/models}，不进 Git。用法：sh tools/local-llm/setup.sh [模型键]
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
KEY=${1:-qwen3-4b-instruct-2507}
DIR=${PKU_MODELS:-$HOME/.cache/pku-aihis/models}
mkdir -p "$DIR"
python3 -c "import llama_cpp" 2>/dev/null || CMAKE_ARGS="${CMAKE_ARGS:--DGGML_NATIVE=OFF}" python3 -m pip install "llama-cpp-python[server]==0.3.36" ${PIP_EXTRA:-}
eval "$(python3 - "$HERE/models.json" "$KEY" <<'PY'
import json, sys; m = json.load(open(sys.argv[1]))[sys.argv[2]]
print(f'FILE="{m["file"]}"; URL="{m["url"]}"; SHA="{m["sha256"]}"')
PY
)"
if [ ! -f "$DIR/$FILE" ]; then echo "下载 $FILE …"; curl -L --fail -o "$DIR/$FILE.part" "$URL" && mv "$DIR/$FILE.part" "$DIR/$FILE"; fi
GOT=$(python3 -c "import hashlib,sys;h=hashlib.sha256();f=open(sys.argv[1],'rb');[h.update(b) for b in iter(lambda:f.read(1<<20),b'')];print(h.hexdigest())" "$DIR/$FILE")
[ "$GOT" = "$SHA" ] || { echo "SHA-256 不符：$GOT"; exit 1; }
echo "就绪：$DIR/$FILE（SHA-256 已核对）"
