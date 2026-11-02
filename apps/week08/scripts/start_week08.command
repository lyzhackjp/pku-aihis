#!/bin/bash
# 第八周演示原型：在本机回环地址起静态服务并用 Chrome 打开。放在 apps/week08/ 下（与 prototype/、local-only/ 同级）双击即可。
# 浏览器内模型与“文献导入”是 ES 模块与 Web Worker，必须经 HTTP 打开（直接打开 HTML 文件时浏览器不允许载入）。
# 本机材料包 local-only/week08-pack.json（CBDB 王珪记录、『梅颸日記』、JBDB 查询结果）存在时自动载入；不分发。
cd "$(dirname "$0")" || exit 1
[ -d prototype ] || cd .. || exit 1
PORT=${PORT:-8778}
URL="http://127.0.0.1:$PORT/prototype/index.html"
[ -f local-only/week08-pack.json ] && URL="$URL?pack=../local-only/week08-pack.json"
( sleep 1; open -a "Google Chrome" "$URL" 2>/dev/null || open "$URL" ) &
echo "第八周演示：$URL"
echo "关闭本窗口即停止服务。"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
