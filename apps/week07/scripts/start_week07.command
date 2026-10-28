#!/bin/bash
# 第七周演示原型：在本机回环地址起静态服务并用 Chrome 打开。放在含 prototype/ 与 local-only/ 的第七周目录下双击即可。
# 现场抽取、模型接入、材料导入是 ES 模块与 Web Worker，必须经 HTTP 打开（直接打开 HTML 文件时浏览器不允许载入）。
cd "$(dirname "$0")" || exit 1
PORT=${PORT:-8777}
URL="http://127.0.0.1:$PORT/prototype/index.html"
[ -f local-only/week07-pack.json ] && URL="$URL?pack=../local-only/week07-pack.json"
( sleep 1; open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL" ) &
echo "第七周演示：$URL"
echo "关闭本窗口即停止服务。"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
