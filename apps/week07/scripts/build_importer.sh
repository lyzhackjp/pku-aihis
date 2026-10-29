#!/bin/sh
# 把通用导入页（apps/material-importer）构建后复制到 apps/week07/prototype/importer/，供原型顶栏“材料导入”打开。
# 构建产物不入 Git（.gitignore）。需要 Node>=22 与 pnpm；不下载 OCR 模型。
set -e
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT/apps/material-importer"
pnpm install --frozen-lockfile --ignore-scripts
PKU_IMPORTER_BASE=./ pnpm build
rm -rf "$ROOT/apps/week07/prototype/importer"
cp -R dist "$ROOT/apps/week07/prototype/importer"
find "$ROOT/apps/week07/prototype/importer" -name '*.map' -delete
echo "已复制到 apps/week07/prototype/importer/"
