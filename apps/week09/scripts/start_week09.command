#!/bin/bash
# 第九周演示原型：在本机回环地址起静态服务并用 Chrome 打开。放在 apps/week09/ 下（与 prototype/、local-only/ 同级）双击即可。
# 模型接入（live/w9-live.js）是 ES 模块，必须经 HTTP 打开；直接打开 HTML 文件时现场调用不可用，页面改显预存回放。
# 本机材料包 local-only/week09-pack.json（梁启超、章太炎全集录文等教师材料，以及课前运行记录）存在时自动载入；不分发。
cd "$(dirname "$0")" || exit 1
[ -d prototype ] || cd .. || exit 1
PORT=${PORT:-8779}
URL="http://127.0.0.1:$PORT/prototype/index.html"
[ -f local-only/week09-pack.json ] && URL="$URL?pack=../local-only/week09-pack.json"
( sleep 1; open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL" ) &
echo "第九周演示：$URL"
[ -d prototype/importer ] || echo "提示：顶栏“文献导入”用的通用导入页尚未构建（运行 scripts/build_importer.sh）；其余功能不受影响。"
echo "关闭本窗口即停止服务。"
# 不让浏览器缓存课件文件：更新代码后刷新即用新版本（否则 Chrome 可能把新旧文件混在一起，页面停在“公开材料载入中”）
exec python3 -c 'import sys, http.server as h
class H(h.SimpleHTTPRequestHandler):
    def end_headers(self): self.send_header("Cache-Control", "no-store"); super().end_headers()
h.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()' "$PORT"
