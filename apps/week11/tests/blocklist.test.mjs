// 未刊稿拦截检查本身的测试｜候选，2026-11-25（第一步）。用临时目录与虚构的拦截词，不涉及任何真实稿件。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, '../scripts/check-blocklist.mjs');
const run = (args, env) => spawnSync(process.execPath, [script, ...args], { env: { ...process.env, ...env }, encoding: 'utf8' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w11-block-'));
const list = path.join(tmp, 'list.txt'); fs.writeFileSync(list, '# 测试用\n虚构拦截词甲\n');
test('拦截词文件不存在时退出码 2（未生效，不当作通过）', () => {
  const r = run([tmp], { W11_BLOCKLIST: path.join(tmp, 'none.txt') });
  assert.equal(r.status, 2); assert.match(r.stderr, /未生效/);
});
test('纯文本命中：退出码 1，日志不出现拦截词全文', () => {
  const d = path.join(tmp, 'a'); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'x.json'), '{"t":"……虚构拦截词甲……"}');
  const r = run([d], { W11_BLOCKLIST: list });
  assert.equal(r.status, 1); assert.ok(!r.stderr.includes('虚构拦截词甲')); assert.match(r.stderr, /虚＊/);
});
test('.docx 内命中（夹具副本中混入拦截词）也能查出', () => {
  const d = path.join(tmp, 'b'); fs.mkdirSync(d);
  const src = fs.readFileSync(path.join(here, 'fixtures/jia_draft.docx'));
  fs.writeFileSync(path.join(d, 'clean.docx'), src);
  assert.equal(run([d], { W11_BLOCKLIST: list }).status, 0, '干净的夹具通过');
  const py = spawnSync('python3', ['-I', '-c', `import zipfile,sys
z=zipfile.ZipFile(sys.argv[1]);o=zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED)
for i in z.infolist():
    b=z.read(i.filename)
    if i.filename=='word/document.xml': b=b.replace('此后学者各有论说'.encode(),'虚构拦截词甲'.encode())
    o.writestr(i,b)
o.close()`, path.join(d, 'clean.docx'), path.join(d, 'dirty.docx')]);
  assert.equal(py.status, 0, String(py.stderr));
  const r = run([d], { W11_BLOCKLIST: list });
  assert.equal(r.status, 1); assert.match(r.stderr, /dirty\.docx#word\/document\.xml/);
});
