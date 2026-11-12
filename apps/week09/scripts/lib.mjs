// 第九周构建、检查与测试共用的小工具（照第八周 scripts/lib.mjs）。
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

// 只在本机材料包中出现的文字：《章太炎全集》第三卷《客帝匡謬》录文片段、课前运行记录的字段。公开文件里出现即视为外泄。
export const PRIVATE_MARKERS = ['飾苟且之心', '浸微浸削', '箸之以自劾錄', '"model_returned"', '"prompt_tokens"', 'teacher-live-2026', 'preclass-2026', 'teacher-web-2026'];

export async function pageIds(root) {
  return JSON.parse(await fs.readFile(path.join(root, 'docs/week09/page-map.json'), 'utf8')).map(p => p.id);
}
export async function loadScript(file, name) {
  const ctx = {window: {}};
  vm.runInNewContext(await fs.readFile(file, 'utf8'), ctx);
  return JSON.parse(JSON.stringify(ctx.window[name] ?? null));
}
export async function scriptIds(dir) {
  return (await loadScript(path.join(dir, 'data/data.js'), 'DECK_DATA')).pages.map(p => p.id);
}
export async function slideIds(dir) {
  const html = await fs.readFile(path.join(dir, 'index.html'), 'utf8');
  return [...html.matchAll(/<deck-slide\b[^>]*slide-id="([^"]+)"/g)].map(m => m[1]);
}
export async function walk(dir) {
  const rows = await fs.readdir(dir, {withFileTypes: true});
  return (await Promise.all(rows.map(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat();
}
