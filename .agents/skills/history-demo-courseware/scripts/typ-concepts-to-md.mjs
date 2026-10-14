#!/usr/bin/env node
// 把学生用《概念讲解表》（Typst）转换为课件概念页可导入的 Markdown 与 JSON。
// 用法：node typ-concepts-to-md.mjs 概念讲解表.typ page-map.json 输出目录
// - 不依赖第三方包；只读输入文件，不改原稿。
// - 公式按纯文本近似转写，并在条目里标记 formula:true，供人工复核。
// - 页面回链取自 page-map.json 中各页的 concepts 字段（首次出现页）。
import fs from 'node:fs/promises';
import path from 'node:path';

const [, , typPath, pageMapPath, outDir = '.'] = process.argv;
if (!typPath) {
  console.error('用法：node typ-concepts-to-md.mjs 概念讲解表.typ [page-map.json] [输出目录]');
  process.exit(2);
}

const FIELD_KEYS = {
  '原文与别称': 'alias',
  '出现位置': 'where',
  '它解决什么问题': 'problem',
  '课堂上你会看到': 'classroom',
  '容易混淆': 'confusion',
  '对历史研究意味着什么': 'history',
};

// 读取 #field[标签][内容]，内容中允许出现成对的方括号。
function readBracket(s, i) {
  if (s[i] !== '[') return null;
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '[') depth++;
    else if (s[j] === ']') { depth--; if (depth === 0) return { text: s.slice(i + 1, j), end: j + 1 }; }
  }
  return null;
}

const MATH = [
  [/bold\((\w)\)_(\w|\(\w\+1\))/g, (_, v, sub) => `${v}_${sub.replace(/[()]/g, '')}`],
  [/bold\((\w)\)/g, '$1'],
  [/\binter\b/g, '∩'], [/\bunion\b/g, '∪'], [/!=/g, '≠'], [/\bdot\b/g, '·'],
  [/\btheta\b/g, 'θ'], [/\bsum_(\w)/g, 'Σ_$1'], [/\bPr\b/g, 'Pr'],
  [/\bmin\b/g, 'min'], [/"([^"]*)"/g, '$1'], [/\bquad\b/g, '  '],
  [/\s+/g, ' '],
];
function plainMath(m) {
  let out = m.trim();
  for (const [re, rep] of MATH) out = out.replace(re, rep);
  return out.trim();
}
function inline(text) {
  return text
    .replace(/(^|[^\w$])_([^_$]+)_(?!\w)/g, '$1$2') // Typst 斜体，先于公式处理
    .replace(/\$([^$]+)\$/g, (_, m) => plainMath(m))
    .replace(/#hei\[([^\]]*)\]/g, '$1')
    .replace(/#term\[([^\]]*)\]/g, '$1')
    .trim();
}

function parse(src, conceptPage) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const categories = [];
  const previous = [];
  let intro = '';
  let cat = null, term = null, mode = 'none', para = [];
  const flush = () => {
    if (term && para.length) { term.paragraphs.push(inline(para.join(''))); }
    para = [];
  };
  const finishTerm = () => { flush(); if (term) cat.terms.push(term); term = null; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\/\/|^#let |^#set |^#show |^#align|^#v\(/.test(line) || /^\s+#|^\s+\]$|^\]$/.test(line) && !term) continue;
    if (line.startsWith('= ')) {
      finishTerm();
      const label = line.slice(2).trim();
      if (label === '怎样使用这张表') { mode = 'intro'; cat = null; continue; }
      if (label === '前几周已讲') { mode = 'previous'; cat = null; continue; }
      mode = 'cat'; cat = { label, terms: [] }; categories.push(cat); continue;
    }
    if (mode === 'intro') { if (line.trim()) intro += inline(line); continue; }
    if (mode === 'previous') { if (line.startsWith('- ')) previous.push(inline(line.slice(2))); continue; }
    if (mode !== 'cat') continue;
    if (line.startsWith('== ')) {
      finishTerm();
      const name = line.slice(3).trim();
      term = { term: name, en: '', fields: {}, paragraphs: [], formula: false, first_slide: conceptPage[name] };
      continue;
    }
    if (!term) continue;
    if (line.startsWith('#field[')) {
      flush();
      const a = readBracket(line, 6); const b = a && readBracket(line, a.end);
      if (!a || !b) throw Error('无法解析字段：' + line);
      const key = FIELD_KEYS[a.text] || a.text;
      term.fields[key] = inline(b.text);
      if (key === 'alias') { const parts = b.text.split(/[；;]/).map(x => x.trim()); term.en = parts.find(x => /^[A-Za-z]/.test(x)) || (parts.join(' ').match(/[A-Za-z][A-Za-z -]+/) || [''])[0].trim(); }
      continue;
    }
    if (/^\$ .* \$$/.test(line.trim())) { flush(); term.formula = true; term.paragraphs.push('公式：' + plainMath(line.trim().slice(1, -1))); continue; }
    if (!line.trim()) { flush(); continue; }
    if (line.includes('$')) term.formula ||= /\$[^$]+\$/.test(line);
    para.push(line.trim());
  }
  finishTerm();
  return { intro, categories, previous };
}

function toMarkdown(doc, title) {
  const order = ['alias', 'where', 'problem'];
  const after = ['classroom', 'confusion', 'history'];
  const label = Object.fromEntries(Object.entries(FIELD_KEYS).map(([k, v]) => [v, k]));
  let md = `# ${title}\n\n本文件为课件概念页的可编辑原稿，由概念讲解表转换。格式：## 分组；### 中文术语 | English；页面：Dxx；字段行“标签：内容”；其余为正文段落。公式为纯文本近似，带 ⚠ 的条目请对照原表复核。\n\n`;
  if (doc.intro) md += `> ${doc.intro}\n\n`;
  for (const c of doc.categories) {
    md += `## ${c.label}\n\n`;
    for (const t of c.terms) {
      md += `### ${t.term} | ${t.en}${t.formula ? ' ⚠' : ''}\n\n页面：${t.first_slide || ''}\n\n`;
      for (const k of order) if (t.fields[k]) md += `${label[k]}：${t.fields[k]}\n\n`;
      for (const p of t.paragraphs) md += p + '\n\n';
      for (const k of after) if (t.fields[k]) md += `${label[k]}：${t.fields[k]}\n\n`;
    }
  }
  if (doc.previous.length) md += `## 前几周已讲\n\n` + doc.previous.map(x => `- ${x}`).join('\n') + '\n';
  return md;
}

const src = await fs.readFile(typPath, 'utf8');
const conceptPage = {};
if (pageMapPath) {
  const pages = JSON.parse(await fs.readFile(pageMapPath, 'utf8'));
  for (const p of pages) for (const c of p.concepts || []) conceptPage[c] ??= p.id;
}
const doc = parse(src, conceptPage);
const count = doc.categories.reduce((n, c) => n + c.terms.length, 0);
const missingPage = doc.categories.flatMap(c => c.terms).filter(t => !t.first_slide).map(t => t.term);
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'concepts.md'), toMarkdown(doc, '第五讲概念讲解表（课件版）'));
await fs.writeFile(path.join(outDir, 'glossary.json'), JSON.stringify(doc, null, 1) + '\n');
console.log(`转换 ${count} 条概念，${doc.categories.length} 组；前几周已讲 ${doc.previous.length} 行。`);
if (missingPage.length) console.log('未在页表中找到首次出现页：' + missingPage.join('、'));
