// 第八周构建、检查与测试共用的小工具（照第七周 scripts/lib.mjs）。
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

// 只在本机材料包中出现的标记：CBDB 接口字段、王珪边表出处、『梅颸日記』录文与 JBDB 字段。公开文件里出现即视为外泄。
export const PRIVATE_MARKERS = ['PersonAuthority', 'cbdbapi', 'BasicInfo', 'c_personid', 'PersonKinshipInfo', 'cbdb-wanggui"', '翰林學士王珪等狀',
  'いまいせといふひろ舟', '久太郎生日', 'cEventNotes', 'cPersonid', 'data:image/png;base64'];

export async function pageIds(root) {
  return JSON.parse(await fs.readFile(path.join(root, 'docs/week08/page-map.json'), 'utf8')).map(p => p.id);
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
