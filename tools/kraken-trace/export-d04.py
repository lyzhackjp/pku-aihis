"""Export the D04 classroom trace: Kraken BLLA segmentation on one public page, at three thresholds.

Candidate, not yet confirmed by the teacher.

Output (one folder per page, under apps/week06/src/assets/materials/kraken-d04/<id>/):
  trace-web.json   image size, channel list, lines at thresholds 0.1 / 0.17 / 0.3, timings, model fingerprint
  heat-<i>.png     each heatmap channel as 8-bit greyscale, resized to the display size

The heatmaps are the network output (sigmoid, network scale), taken from compute_segmentation_map.
Baselines and polygons are Kraken's own final output in source-image pixels.
The threshold is the one vectorize_lines applies to the Sato ridge response, not to the raw heatmap.

Usage:
  python export-d04.py IMAGE MODEL OUT_DIR --id tamagaki --label '…' --rights '…' --direction vertical-rl
Install: pip install 'kraken @ git+https://github.com/mittagessen/kraken@bb487219e7d8289274443d1ad0989efb4924dc2a'
Model:   BLLA base model, DOI 10.5281/zenodo.14602569, MD5 0e3f0e1c5e954c8b673ef5dbd0865058.
"""
import argparse, hashlib, json, time, datetime, importlib.metadata
from pathlib import Path

PIN = 'bb487219e7d8289274443d1ad0989efb4924dc2a'
THRESHOLDS = ['0.1', '0.17', '0.3']
LABELS = {
    ('aux', '_start_separator'): '行首（起点分隔符）',
    ('aux', '_end_separator'): '行尾（终点分隔符）',
    ('baselines', 'default'): '基线',
}
DIRECTIONS = {
    'horizontal-lr': '横排左起', 'horizontal-rl': '横排右起',
    'vertical-lr': '竖排左起', 'vertical-rl': '竖排右起',
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('image', type=Path)
    ap.add_argument('model', type=Path)
    ap.add_argument('out', type=Path)
    ap.add_argument('--id', required=True)
    ap.add_argument('--label', required=True)
    ap.add_argument('--rights', required=True)
    ap.add_argument('--direction', default='horizontal-lr', choices=list(DIRECTIONS))
    ap.add_argument('--display-width', type=int, default=1400)
    ap.add_argument('--rotate', action='store_true',
                    help='Turn the page 90° counter-clockwise before segmenting (vertical columns become horizontal lines), '
                         'then map every result back onto the upright page.')
    a = ap.parse_args()

    import numpy as np
    from PIL import Image
    from kraken import blla
    from kraken.lib import vgsl

    direct = importlib.metadata.distribution('kraken').read_text('direct_url.json')
    if not direct or json.loads(direct).get('vcs_info', {}).get('commit_id') != PIN:
        raise RuntimeError('Install the pinned Kraken revision (see docstring).')

    a.out.mkdir(parents=True, exist_ok=True)
    im = Image.open(a.image).convert('RGB')
    W, H = im.size
    work = im.rotate(90, expand=True) if a.rotate else im
    # rotate(90) sends (x, y) to (y, W-1-x); undo that for every output point.
    back = (lambda p: [round(W - 1 - p[1]), round(p[0])]) if a.rotate else (lambda p: [round(p[0]), round(p[1])])
    model = vgsl.TorchVGSLModel.load_model(a.model)
    captured = {}
    original_map = blla.compute_segmentation_map
    original_vec = blla.vectorize_lines

    def capture_map(*args, **kw):
        value = original_map(*args, **kw)
        captured.setdefault('map', value)
        return value

    results, timings = {}, {}
    blla.compute_segmentation_map = capture_map
    try:
        for thr in THRESHOLDS:
            blla.vectorize_lines = lambda *args, _t=float(thr), **kw: original_vec(*args, **{**kw, 'threshold': _t})
            start = time.perf_counter()
            seg = blla.segment(work, model=model, text_direction=a.direction, device='cpu')
            timings[thr] = (time.perf_counter() - start) * 1000
            results[thr] = [{
                'baseline': [back(p) for p in line.baseline],
                'polygon': [back(p) for p in line.boundary],
            } for line in seg.lines]
    finally:
        blla.compute_segmentation_map = original_map
        blla.vectorize_lines = original_vec

    heat = captured['map']['heatmap']
    heat = heat.numpy() if hasattr(heat, 'numpy') else np.asarray(heat)
    cls_map = captured['map']['cls_map']
    scale = round(a.display_width / im.width, 6)
    size = (a.display_width, round(im.height * scale))
    names = {}
    for group, items in cls_map.items():
        for name, idx in items.items():
            names[idx] = LABELS.get((group, name), f'区域：{name}' if group == 'regions' else f'{group}/{name}')
    channels = []
    for i, ch in enumerate(heat):
        file = f'heat-{i}.png'
        img = Image.fromarray(np.uint8(np.clip(ch, 0, 1) * 255))
        if a.rotate:
            img = img.rotate(-90, expand=True)
        img.resize(size, Image.BILINEAR).save(a.out / file, optimize=True)
        channels.append({'index': i, 'file': file, 'label': names.get(i, f'通道 {i}'), 'max': round(float(ch.max()), 3)})

    model_bytes = a.model.read_bytes()
    trace = {
        'candidate': True,
        'id': a.id,
        'revision': PIN,
        'model': {'doi': '10.5281/zenodo.14602569', 'file': a.model.name,
                  'md5': hashlib.md5(model_bytes).hexdigest(), 'sha256': hashlib.sha256(model_bytes).hexdigest()},
        'image': {'file': a.image.name, 'label': a.label, 'rights': a.rights, 'width': im.width, 'height': im.height,
                  'sha256': hashlib.sha256(a.image.read_bytes()).hexdigest()},
        'direction': a.direction,
        'rotated': a.rotate,
        'direction_label': ('整页先逆时针转 90°，再按' if a.rotate else '按') + DIRECTIONS[a.direction],
        'heat_net_size': [int(heat.shape[2]), int(heat.shape[1])],
        'heat_size': list(size),
        'channels': channels,
        'default_channel': next((c['index'] for c in channels if c['label'] == '基线'), 0),
        'thresholds': {thr: {'lines': results[thr]} for thr in THRESHOLDS},
        'run': {'date': datetime.date.today().isoformat(), 'elapsed_ms': round(timings['0.17']),
                'timings_ms': {f'segment @ {k}': round(v) for k, v in timings.items()},
                'kraken': importlib.metadata.version('kraken'), 'torch': importlib.metadata.version('torch')},
    }
    (a.out / 'trace-web.json').write_text(json.dumps(trace, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(a.id, {k: len(v) for k, v in results.items()}, [c['label'] for c in channels])


if __name__ == '__main__':
    main()
