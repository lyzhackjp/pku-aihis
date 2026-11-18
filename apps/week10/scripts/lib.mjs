// 第十周构建、检查与测试共用的小工具（照第九周 scripts/lib.mjs）。
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

// 只在本机材料包中出现的文字：茅海建 2002 两节、稲田 1971 年表与第 3—4 页、井上草案（海後复原）、井上书翰七条的录文片段，
// 课前运行记录的字段，本课判定与草案表的格式名。公开文件里出现即视为外泄。
export const PRIVATE_MARKERS = [
  '第二道密诏很可能是口', '伊藤博文来华与戊戌政', '们观点的同意或基本同', '在这里还要向黄彰健先',
  '奏案として奉呈天皇は', '元田の上奏案修正案に', '育勅語の発布について', '勅語の本論の中に封建',
  '主トシ自ラ愛シテ他ニ', '法ニ遵ヒ一朝事アレハ', 'けざるべからず何とな', 'ハ政事上之臭味を避ケ',
  '"model_returned"', '"prompt_tokens"', 'w10-ref/v1', 'w10-drafts/v1',
];

// 讲义已公开引用、页面带页码出示的短引（茅文结论第七点、黄彰健一句）。本机片段比对时，落在这些短引里的片段不算外泄。
export const PUBLIC_SHORT_QUOTES = [
  '戊戌政变虽未因袁世凯告密而发生，但袁世凯告密的消息传到北京，大大加剧了政变的激烈程度',
  '最初由黄彰健先生1970年著作提出',
];

export async function pageIds(root) {
  const m = JSON.parse(await fs.readFile(path.join(root, 'docs/week10/page-map.json'), 'utf8'));
  return (Array.isArray(m) ? m : m.pages).map(p => p.id);
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
