#!/usr/bin/env python3
"""候选。Read only the course's registered local pages; write outside the repository."""
import hashlib
import json
import pathlib
import struct
import sys
import xml.etree.ElementTree as ET

import fitz

course, output = map(lambda s: pathlib.Path(s).resolve(), sys.argv[1:3])
repo = pathlib.Path(__file__).resolve().parents[3]
if output.is_relative_to(repo):
    raise SystemExit('本机材料不能写进仓库')
output.mkdir(parents=True, exist_ok=True)
fixed = json.loads((course / '第六周/demo/codex/fixed-values.json').read_text())['files']
sources = {s['id']: s for s in json.loads((repo / 'apps/week06/src/assets/materials/sources.json').read_text())}
check = course / '第五周/demo/修订_20261013/核验'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for value in fixed.values():
    if value.get('sha256') and sha(course / value['path']) != value['sha256']:
        raise SystemExit('已登记材料指纹不符：' + value['path'])

pages = []


def page(id, source_id, path, systems, xml=None, provenance=None):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('需要 PNG')
    width, height = struct.unpack('>II', data[16:24])
    if xml:
        xml_page = ET.parse(xml).find('.//PAGE')
        if xml_page is None or (int(xml_page.attrib['WIDTH']), int(xml_page.attrib['HEIGHT'])) != (width, height):
            raise ValueError('XML 与页影尺寸不对应：' + id)
    source = sources[source_id]
    pages.append({'id': id, 'sourceId': source_id, 'title': source['title'],
                  'identity': source['identity'] + ' · ' + '；'.join(f'{k} {v}' for k, v in systems.items()),
                  'page_systems': systems, 'width': width, 'height': height,
                  'imagePath': str(path), 'xmlPath': str(xml) if xml else None,
                  'provenance': provenance or {'method': '第五周已有页影，字节未改动',
                                              'source_path': str(path.relative_to(course))}})


page('shide', 'shide', check / 'shide-78.png', sources['shide']['page_systems'], check / 'shide-ocr/shide-78.xml')
page('ogai', 'ogai', check / 'ogai.png', {'教师PDF页序': '1', '印刷页': '所属文章 480—482；本页逐页对应待核'}, check / 'ogai-ocr/ogai.xml')
page('ogai-page2', 'ogai', check / 'ogai-page2.png', {'教师PDF页序': '2', '印刷页': '所属文章 480—482；本页逐页对应待核'}, check / 'ogai2-ocr/ogai-page2.xml')
page('acton', 'acton', check / 'acton-page48.png', {'PDF页序': '48', '1911重印本印刷页': '40'})

pdf_dir = course / '第六周/材料/敦煌_法藏图版_教师提供'
for number in range(68, 80):
    pdf = pdf_dir / f'法藏敦煌西域文献01_1995_页{number}.pdf'
    target = output / f'dunhuang-1995-p{number}.png'
    with fitz.open(pdf) as document:
        if len(document) != 1:
            raise ValueError('登记为单页 PDF，实际页数不同')
        document[0].get_pixmap(dpi=200, colorspace=fitz.csRGB, alpha=False).save(target)
    page('dunhuang_1995' if number == 68 else f'dunhuang-1995-p{number}', 'dunhuang_1995', target,
         {'原PDF页序': str(number), '拆分文件PDF页序': '1', '印刷页或图版号': '见原图图注，逐图对应待核'},
         provenance={'method': '本机 PDF 页渲染，RGB 200 dpi；未裁切、未识读',
                     'renderer': f'PyMuPDF {fitz.VersionBind}', 'dpi': 200,
                     'source_path': str(pdf.relative_to(course)), 'source_pdf_sha256': sha(pdf)})
    print(f'已准备敦煌 PDF 页序 {number}', flush=True)

(output / 'pages.json').write_text(json.dumps(pages, ensure_ascii=False, indent=2) + '\n')
