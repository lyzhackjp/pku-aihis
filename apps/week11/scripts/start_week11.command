#!/bin/bash
# 第十一周演示原型：在本机回环地址起静态服务并用 Chrome 打开。放在 apps/week11/ 下（与 prototype/、local-only/ 同级）双击即可。
# 模型接入（live/w10-live.js）是 ES 模块，必须经 HTTP 打开；直接打开 HTML 文件时现场调用不可用，页面改显预存回放。
# 本机材料包 local-only/week11-pack.json（茅、郭、刘原文与页影、4.3 答案，以及课前运行记录）存在时自动载入；不分发。
cd "$(dirname "$0")" || exit 1
[ -d prototype ] || cd .. || exit 1
PORT=${PORT:-8781}
URL="http://127.0.0.1:$PORT/prototype/index.html"
[ -f local-only/week11-pack.json ] && URL="$URL?pack=../local-only/week11-pack.json"
[ -f prototype/importer/index.html ] || echo "顶栏“文献导入”尚未构建。请从课件仓库根目录运行 apps/week11/scripts/build_importer.sh。"
exec python3 - "$PORT" "$URL" <<'PYTHON'
import errno
import http.server
from pathlib import Path
import subprocess
import sys
from urllib.request import ProxyHandler, build_opener

port, url = int(sys.argv[1]), sys.argv[2]

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

def open_chrome():
    print(f"本机演示：{url}", flush=True)
    if subprocess.run(["open", "-a", "Google Chrome", url]).returncode:
        print("Chrome 未能自动打开，可在 Chrome 地址栏粘贴上面的网址。", flush=True)

try:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
except OSError as err:
    if err.errno != errno.EADDRINUSE:
        sys.exit(f"未能启动本机课件服务：{err}")
    entry = Path("prototype/index.html").read_bytes()
    try:
        with build_opener(ProxyHandler({})).open(url, timeout=2) as response:
            same_deck = response.read(len(entry) + 1) == entry
    except OSError:
        same_deck = False
    if not same_deck:
        sys.exit(f"端口 {port} 已被其他服务占用，请改用 PORT=8782 再启动。")
    print("已找到运行中的第十一周课件。", flush=True)
    open_chrome()
else:
    with server:
        open_chrome()
        print("关闭本窗口即停止服务。", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
PYTHON
