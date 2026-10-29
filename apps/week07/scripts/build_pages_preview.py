#!/usr/bin/env python3
"""按 GitHub Pages 的目录形状组装第七周原型的预览站点（不发布）：<输出>/pku-aihis/week07/。
只复制 prototype/（含公开材料 data/public/ 与已构建的 importer/），不含 local-only、材料包、运行记录。
用于在本机检查“不经启动脚本、不导入本机材料包”时学生能用到什么。用法：python3 build_pages_preview.py <输出目录>"""
import os, shutil, sys
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'prototype')
OUT = os.path.join(sys.argv[1], 'pku-aihis', 'week07')
shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(SRC, OUT, ignore=shutil.ignore_patterns('*.map', 'local-only', '*.zip', '*.tgz', 'week07-pack.json'))
if not os.path.isdir(os.path.join(OUT, 'importer')): print('提示：importer/ 尚未构建（scripts/build_importer.sh），“材料导入”在预览中不可用')
bad = [os.path.join(r, f) for r, _, fs in os.walk(OUT) for f in fs if f.endswith(('.typ', '.gguf', '.onnx', '.zip')) or f == 'week07-pack.json']
assert not bad, bad
n = sum(len(fs) for _, _, fs in os.walk(OUT)); size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
print(OUT, n, '个文件', round(size / 1e6, 1), 'MB')
