#!/usr/bin/env node
// 页表与讲义互锁检查：页表字段完整、编号连续、讲义每个 #term 概念与每张图都有落页、
// 概念表每条都有首次出现页、贯穿页覆盖各检查步骤、建议时长与讲义时长大致相符。
// 用法：node check-page-map.mjs page-map.json 讲义.typ [glossary.json]
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , mapPath, typPath, glossaryPath] = process.argv;
if (!mapPath || !typPath) { console.error('用法：node check-page-map.mjs page-map.json 讲义.typ [glossary.json]'); process.exit(2); }
const pages = JSON.parse(await fs.readFile(mapPath, 'utf8'));
const here = path.dirname(fileURLToPath(import.meta.url));
const outline = JSON.parse(execFileSync(process.execPath, [path.join(here, 'outline-lesson.mjs'), typPath, '--json'], { encoding: 'utf8' }));
const errors = [], warns = [];
const REQUIRED = ['id', 'section', 'title', 'layout', 'transition', 'question', 'student_operation', 'observable_output', 'lesson_evidence', 'mode', 'footer', 'status'];
const LAYOUTS = ['hero', 'flow4', 'diagram', 'workbench', 'through', 'concepts'];
const MODES = ['浏览器实时', '预计算', '保存结果回放', '教学构造', '静态内容', '本地方案'];

const declared=pages.flatMap(p=>[p.id,...(p.aliases||[])]).sort();if(declared.some((id,i)=>id!=='D'+String(i).padStart(2,'0')))errors.push('页号或合并别名缺失／重复');
pages.forEach((p, i) => {
  for (const k of REQUIRED) if (p[k] === undefined || p[k] === '') errors.push(`${p.id || '#' + i}：缺少 ${k}`);
  if (!LAYOUTS.includes(p.layout)) errors.push(`${p.id}：layout 应为 ${LAYOUTS.join('/')}`);
  if (p.layout === 'flow4' && !(p.steps?.length >= 3 && p.steps.length <= 6)) errors.push(`${p.id}：flow4 需要 3—6 个 steps`);
  if (!MODES.some((m) => String(p.mode).includes(m))) errors.push(`${p.id}：mode 需写明实际运行档（${MODES.join('／')}）`);
  for (const k of ['purpose', 'guide', 'mechanism']) if (!p.notes?.[k]) errors.push(`${p.id}：备注缺少 ${k}`);
  if (!String(p.footer).startsWith(p.id)) warns.push(`${p.id}：页脚宜以页号开头`);
  if (/不等于|不是|并非/.test(p.transition)) warns.push(`${p.id}：过渡句含否定表述，宜改为正向表述`);
});

const pageConcepts = new Set(pages.flatMap((p) => p.concepts || []));
const lessonTerms = new Set(outline.sections.flatMap((s) => [s, ...s.subs]).flatMap((n) => n.terms));
for (const t of lessonTerms) if (!pageConcepts.has(t)) errors.push(`讲义概念“${t}”没有落在任何页的 concepts 中`);
const anchors = pages.map((p) => p.anchor || '').join(' ');
const figures = outline.sections.flatMap((s) => [s, ...s.subs]).flatMap((n) => n.figures);
for (const f of figures) if (!anchors.includes(f.label)) warns.push(`讲义图 @${f.label} 没有页面以 anchor 引用（可由相邻页承担，请确认）`);

if (glossaryPath) {
  const g = JSON.parse(await fs.readFile(glossaryPath, 'utf8'));
  const ids = new Set(pages.map((p) => p.id));
  for (const t of g.categories.flatMap((c) => c.terms)) {
    if (!t.first_slide) errors.push(`概念表“${t.term}”没有首次出现页`);
    else if (!ids.has(t.first_slide)) errors.push(`概念表“${t.term}”指向不存在的页 ${t.first_slide}`);
  }
}
const through = pages.find((p) => p.layout === 'through');
if (!through) errors.push('缺少贯穿页（layout=through）');
if (!pages.some((p) => p.layout === 'concepts')) errors.push('缺少概念页（layout=concepts）');
if (through) {
  const stages = new Set(pages.map((p) => p.through).filter(Boolean));
  if (stages.size < 3) warns.push('只有少数讲解页标了 through 字段，贯穿页可能与正文脱节');
}
const planned = pages.reduce((n, p) => n + (p.minutes || 0), 0);
const lesson = outline.sections.filter((s) => !/休息/.test(s.heading)).reduce((n, s) => n + (s.minutes || s.subs.reduce((m, x) => m + x.minutes, 0)), 0);
if (lesson && Math.abs(planned - lesson) > 0) warns.push(`页表建议时长合计 ${planned} 分，讲义标注 ${lesson} 分`);

console.log(`页表 ${pages.length} 页；讲义概念 ${lessonTerms.size} 个；讲义图 ${figures.length} 张；建议时长 ${planned} 分／讲义 ${lesson} 分。`);
warns.forEach((w) => console.log('提示：' + w));
errors.forEach((e) => console.log('错误：' + e));
process.exit(errors.length ? 1 : 0);
