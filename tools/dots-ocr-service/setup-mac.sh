#!/bin/zsh
# 第六周 dots.ocr 本机配置（教师 Mac）。候选，未经教师确认。
# 依次：检查系统与磁盘 → 建立 .venv-dots 并安装固定依赖 → 下载固定版本模型并逐个核对 SHA-256
#       → 启动服务、加载模型 → 用公开的 1926 年本《史德》一块做试跑 → 写配置报告。
# 可重复运行：已装好的依赖、已核对的文件会跳过；下载中断后再运行会续传。
set -u
SERVICE_DIR="${0:A:h}"
COURSE_DIR="${SERVICE_DIR:h:h:h}"
DEMO="$COURSE_DIR/第六周/demo"
VENV="$DEMO/.venv-dots"
MODEL_DIR="$DEMO/模型/dots.ocr"
LOG_DIR="$DEMO/运行记录/dots"
REPORT="$LOG_DIR/配置报告-$(date +%Y%m%d-%H%M%S).md"
PORT="${WEEK06_DOTS_PORT:-8786}"
mkdir -p "$MODEL_DIR" "$LOG_DIR"
exec > >(tee -a "$REPORT") 2>&1

say() { print -P "%B$1%b"; }
fail() { print -P "%F{red}✗ $1%f"; print "报告：$REPORT"; exit 1; }
ok() { print -P "%F{green}✓%f $1"; }

say "# dots.ocr 本机配置 $(date '+%Y-%m-%d %H:%M')"
print "课程目录：$COURSE_DIR"

say "## 1 系统与磁盘"
[[ "$(uname -s)" == Darwin ]] || fail "只适用于 macOS"
ARCH="$(uname -m)"; ok "macOS $(sw_vers -productVersion) · $ARCH"
[[ "$ARCH" == arm64 ]] || print "提醒：不是 Apple 芯片，MPS 不可用，只能用 CPU（很慢）。"
MEM_GB=$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 )); ok "内存 ${MEM_GB} GB"
(( MEM_GB >= 16 )) || print "提醒：内存少于 16 GB，加载模型（约 6 GB）后可能很慢或失败。"
FREE_GB=$(df -g "$DEMO" | awk 'NR==2{print $4}'); ok "可用磁盘 ${FREE_GB} GB"
(( FREE_GB >= 15 )) || fail "可用磁盘不足 15 GB（模型约 6.1 GB，依赖约 2 GB，另需缓存）"

say "## 2 Python 环境"
PY=""
for c in python3.12 python3.11 python3.13 python3.10 python3; do
  if command -v $c >/dev/null && $c -c 'import sys; raise SystemExit(0 if (3,10)<=sys.version_info[:2]<=(3,13) else 1)' 2>/dev/null; then PY=$(command -v $c); break; fi
done
[[ -n "$PY" ]] || fail "找不到 Python 3.10—3.13。可先安装：xcode-select --install，或从 python.org 安装 Python 3.12"
ok "使用 $PY（$($PY -V)）"
if [[ ! -x "$VENV/bin/python" ]]; then "$PY" -m venv "$VENV" || fail "建立 .venv-dots 失败"; fi
"$VENV/bin/python" -m pip install -q --upgrade pip >/dev/null
"$VENV/bin/python" -m pip install -q -r "$SERVICE_DIR/requirements.txt" || fail "安装依赖失败（见上方 pip 输出）"
"$VENV/bin/python" -c "import torch, transformers; print('torch', torch.__version__, '· transformers', transformers.__version__, '· MPS', torch.backends.mps.is_available())" || fail "依赖装好但无法导入"
DEVICE=cpu
"$VENV/bin/python" -c "import torch; raise SystemExit(0 if torch.backends.mps.is_available() else 1)" && DEVICE=mps
ok "运行设备：$DEVICE"

say "## 3 模型文件（固定版本，逐个核对 SHA-256）"
"$VENV/bin/python" - "$SERVICE_DIR/model-manifest.json" "$MODEL_DIR" <<'PY' || fail "模型文件下载或核对失败；再运行一次会续传"
import hashlib, json, os, subprocess, sys
from pathlib import Path
manifest = json.load(open(sys.argv[1])); dest = Path(sys.argv[2])
base = f"https://huggingface.co/{manifest['model']}/resolve/{manifest['revision']}/"
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''): h.update(chunk)
    return h.hexdigest()
total = sum(f['size'] for f in manifest['files'])
print(f"共 {len(manifest['files'])} 个文件，{total/1e9:.2f} GB；来源 {base}")
for f in manifest['files']:
    p = dest / f['path']
    if p.exists() and p.stat().st_size == f['size'] and sha(p) == f['sha256']:
        print('  已核对', f['path']); continue
    print('  下载', f['path'], f"{f['size']/1e6:.1f} MB", flush=True)
    part = p.with_suffix(p.suffix + '.part')
    r = subprocess.run(['curl', '-fL', '--retry', '5', '--retry-delay', '3', '-C', '-', '-o', str(part), base + f['path']])
    if r.returncode not in (0, 33): sys.exit(f"下载失败：{f['path']}（curl {r.returncode}）")
    if part.stat().st_size != f['size'] or sha(part) != f['sha256']:
        part.unlink(); sys.exit(f"核对不符，已删除：{f['path']}；请再运行一次")
    os.replace(part, p); print('  ✓', f['path'])
extra = [x for x in dest.rglob('*.py') if str(x.relative_to(dest)) not in {f['path'] for f in manifest['files']}]
if extra: sys.exit('模型目录中有未登记的 Python 文件：' + ', '.join(map(str, extra)))
print('全部核对通过')
PY
ok "模型文件齐全"

say "## 4 启动服务并加载模型（设备 $DEVICE · bfloat16）"
if curl -s --max-time 2 "http://127.0.0.1:$PORT/health" >/dev/null; then
  print "端口 $PORT 上已有服务在运行；先关闭它（关掉"启动dots服务"的终端窗口）再运行本脚本。"; fail "端口被占用"
fi
"$VENV/bin/python" "$SERVICE_DIR/server.py" --load --device "$DEVICE" --timeout 600 --port "$PORT" > "$LOG_DIR/service-setup.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
STATE=""
for i in {1..180}; do
  sleep 5
  STATE=$(curl -s --max-time 2 "http://127.0.0.1:$PORT/health" | "$VENV/bin/python" -c 'import json,sys
try: h=json.load(sys.stdin)
except Exception: print("starting"); raise SystemExit
print("loaded" if h.get("loaded") else "loading" if h.get("loading") else "failed:"+str(h.get("error")))' 2>/dev/null)
  [[ "$STATE" == loaded ]] && break
  [[ "$STATE" == failed:* ]] && fail "模型加载失败：${STATE#failed:}（日志 $LOG_DIR/service-setup.log）"
  (( i % 6 == 0 )) && print "  仍在加载……（$((i*5)) 秒）"
done
[[ "$STATE" == loaded ]] || fail "15 分钟内未加载完成（日志 $LOG_DIR/service-setup.log）"
ok "模型已加载"

say "## 5 公开图试跑（1926 年本《史德》标题与正文首行一块，ocr_only）"
"$VENV/bin/python" - "$COURSE_DIR/pku-aihis/apps/week06/src/assets/materials/shide-1926-p141.png" "$PORT" <<'PY' || fail "试跑失败（日志 $LOG_DIR/service-setup.log）"
import base64, hashlib, io, json, sys, time, urllib.request
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB').crop((580, 220, 740, 1070))
buf = io.BytesIO(); im.save(buf, format='PNG'); data = buf.getvalue()
req = {'image_b64': base64.b64encode(data).decode(), 'image_sha256': hashlib.sha256(data).hexdigest(),
       'prompt_mode': 'ocr_only', 'page_id': 'setup-public-shide', 'max_new_tokens': 512}
start = time.time()
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
r = opener.open(urllib.request.Request(f'http://127.0.0.1:{sys.argv[2]}/parse', json.dumps(req).encode(), {'Content-Type': 'application/json'}), timeout=900)
out = json.load(r)
text = ''.join(x.get('text') or '' for x in out.get('regions', []))
print(f"用时 {time.time()-start:.1f} 秒；ok={out.get('ok')}；输出：{text[:120]}")
print('包含"史德"：', '是' if '史德' in text.replace(' ', '') else '否（仅供参考）')
PY
ok "试跑完成；请求与回复已存入 $LOG_DIR"

say "## 完成"
print "以后上课前双击 第六周/demo/启动dots服务.command（会自动加载模型、使用 $DEVICE），再到课件的"课前检查"页点"重新检测"。"
print "报告：$REPORT"
