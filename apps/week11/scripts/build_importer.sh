#!/bin/sh
# 第十一周通用文献导入页。候选，未经教师确认。
set -eu
week=$(cd "$(dirname "$0")/.." && pwd)
cd "$week/../material-importer"
pnpm install --frozen-lockfile --ignore-scripts
stage=$(mktemp -d "$week/.importer-build.XXXXXX")
target="$week/prototype/importer"
cleanup() {
  if [ -d "$stage/previous" ] && [ ! -e "$target" ]; then
    mv "$stage/previous" "$target" || return 1
  fi
  rm -rf "$stage"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
PKU_IMPORTER_BASE=./ pnpm run build --outDir "$stage/new" --emptyOutDir
find "$stage/new" -name '*.map' -delete
python3 - "$stage" "$target" <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import sys

class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and 'src' in attrs:
            self.urls.append(attrs['src'])
        elif tag == 'link' and 'href' in attrs:
            self.urls.append(attrs['href'])

stage, target = map(Path, sys.argv[1:])
root = stage / 'new'
assets = Assets()
assets.feed((root / 'index.html').read_text())
if not assets.urls or any(not url.startswith('./') or not (root / url).is_file()
                          for url in assets.urls):
    sys.exit('导入页入口未引用可用的相对路径资源。')
if target.exists():
    target.rename(stage / 'previous')
root.rename(target)
PY
echo "已构建 apps/week11/prototype/importer/。"
