import {
  cp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  stat,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, ".."),
  site = path.join(root, "site");
const releases = JSON.parse(
  await readFile(path.join(root, "published-weeks.json")),
);
await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });
for (const week of releases.weeks) {
  if (!/^week\d{2}$/.test(week)) throw Error("Invalid week");
  await cp(
    path.join(root, "apps", week, "www", "pku-aihis", week),
    path.join(site, week),
    { recursive: true, filter: (s) => !s.endsWith(".map") && !s.split(path.sep).some(p=>["local-only","private","inputs"].includes(p)) &&
      !(week === 'week04' && /[/\\]seed[/\\]/.test(s)) },
  );
  if (week === 'week04') {
    const sourceDir=path.join(root,'apps/week04/src/assets/seed');
    const seed=JSON.parse(await readFile(path.join(sourceDir,'native-seed.json')));
    for(const relative of ['native-seed.json',seed.database.path,...seed.pdfs.map(p=>p.path)]) {
      const target=path.join(site,week,'assets/seed',relative);
      await mkdir(path.dirname(target),{recursive:true});await cp(path.join(sourceDir,relative),target);
    }
  }
}
for (const tool of releases.tools || []) {
  if (tool !== 'material-importer') throw Error('Unapproved public tool');
  await cp(path.join(root,'apps',tool,'dist'),path.join(site,tool),{recursive:true,filter:s=>!s.endsWith('.map')});
}
await writeFile(
  path.join(site, "index.html"),
  `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>人工智能赋能历史研究与写作</title><style>body{max-width:960px;margin:10vh auto;padding:30px;background:#f4f3ee;color:#20272e;font-family:system-ui}small{letter-spacing:.1em;color:#164ec7}h1{font-weight:500;font-size:42px;line-height:1.4}a{color:#164ec7;font-size:24px}p{line-height:1.9}article{border-top:1px solid #aab5be;padding:28px 0}</style><small>PKU / AI × HISTORY</small><h1>人工智能赋能<br>历史研究与写作</h1><p>材料、检索与证据之间的可观察过程。</p>${releases.weeks.map((w) => `<article><a href="${w}/">${w === "week03" ? "第三周 · 检索与证据" : "第四周 · 文献整理、学术阅读与个人知识系统"} →</a><p>可交互课堂演示 · 原页定位 · 演讲者视图</p></article>`).join("")}<article><a href="material-importer/">通用材料导入页 →</a><p>PDF、图像、Word与题录：预处理、校订与本机导出</p></article><p><a style="font-size:14px" href="https://github.com/lyzhackjp/pku-aihis">源码、使用说明与协作记录 ↗</a></p></html>`,
);
const inventory = [];
const nativeSeed=JSON.parse(await readFile(path.join(site,'week04/assets/seed/native-seed.json')));
if(nativeSeed.pdfs.length!==4||nativeSeed.rows.items!==4)throw Error('Only four TA originals may be seeded');
const allowedPDFs=new Set(nativeSeed.pdfs.map(p=>'week04/assets/seed/'+p.path));
const ocrManifest=JSON.parse(await readFile(path.join(site,'week04/assets/ocr/models.json')));
const allowedModels=new Set(ocrManifest.models.map(m=>'week04/assets/ocr/'+m.file));
const approvedHashes=new Map([nativeSeed.database,...nativeSeed.pdfs].map(row=>['week04/assets/seed/'+row.path,row.sha256]));
const pinned=['d2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9','48fc40f24f6d2a207a2b1091d3437eb3cc3eb6b676dc3ef9c37384005483683b','e47acedf663230f8863ff1ab0e64dd2d82b838fceb5957146dab185a89d6215c'];
if(ocrManifest.models.length!==3||ocrManifest.models.some((m,i)=>m.sha256!==pinned[i]))throw Error('Unapproved OCR models');
for(const row of ocrManifest.models)approvedHashes.set('week04/assets/ocr/'+row.file,row.sha256);
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    if (e.isDirectory()) await walk(f);
    else {
      const rel = path.relative(site, f);
      if(/\.(sqlite|db)$/i.test(rel)&&rel.replaceAll('\\','/')!=='week04/assets/seed/'+nativeSeed.database.path)
        throw Error('Unexpected database '+rel);
      if (/\.(pdf|docx|typ|onnx|safetensors|zip|env|py)$/i.test(rel) && !allowedPDFs.has(rel.replaceAll("\\","/")) && !allowedModels.has(rel.replaceAll("\\","/")))
        throw Error("Non-public asset " + rel);
      const b = await readFile(f);
      const sha256=createHash("sha256").update(b).digest("hex");
      if(approvedHashes.has(rel)&&approvedHashes.get(rel)!==sha256)throw Error("Public binary changed: "+rel);
      inventory.push({
        path: rel,
        bytes: b.length,
        sha256,
      });
    }
  }
}
await walk(site);
await writeFile(
  path.join(site, "release-manifest.json"),
  JSON.stringify({ weeks: releases.weeks, tools: releases.tools || [], files: inventory }, null, 2),
);
console.log(
  "Classroom site",
  inventory.length,
  "files",
  inventory.reduce((s, x) => s + x.bytes, 0),
  "bytes",
);
