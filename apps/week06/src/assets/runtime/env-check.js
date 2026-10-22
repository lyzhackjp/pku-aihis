// 课前检查 · 本机环境。只读浏览器能报告的信息，再探测本机的几个服务；不改任何设置，"申请持久存储"除外（由教师点击）。
// 结果挂在 window.W6Env，供"导出JSON／Markdown"一并写入报告。
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GB = n => (n / 1024 ** 3).toFixed(1) + ' GB';
const rows = [];
const add = (group, name, status, value, advice = '') => rows.push({ group, name, status, value, advice });

async function probe(url, ms = 2500) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms), cache: 'no-store' });
    let body = null;
    try { body = await r.json(); } catch { /* not JSON */ }
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, error: e.name === 'TimeoutError' ? '超时' : '连不上' };
  }
}

// A one-instruction module using a SIMD opcode; validates only where WebAssembly SIMD is supported.
const SIMD = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

async function collect() {
  rows.length = 0;
  // 浏览器与系统
  let brand = '', full = '', platform = navigator.platform, arch = '';
  try {
    const h = await navigator.userAgentData?.getHighEntropyValues(['fullVersionList', 'platform', 'platformVersion', 'architecture']);
    const b = h?.fullVersionList?.find(x => /Chrome|Chromium/.test(x.brand));
    brand = b?.brand || ''; full = b?.version || ''; platform = (h?.platform || platform) + ' ' + (h?.platformVersion || ''); arch = h?.architecture || '';
  } catch { /* UA-CH unavailable */ }
  const major = parseInt(full, 10);
  add('浏览器与系统', '浏览器', brand && major >= 120 ? 'ok' : 'warn', `${brand || navigator.userAgent} ${full}`, brand ? '' : '建议用授课时实际使用的 Chrome 打开本页。');
  add('浏览器与系统', '系统', 'info', `${platform} ${arch}`.trim());
  add('浏览器与系统', 'CPU 线程', navigator.hardwareConcurrency >= 8 ? 'ok' : 'warn', String(navigator.hardwareConcurrency || '未知'), '少于 8 线程时，浏览器内识读会明显变慢。');
  add('浏览器与系统', '内存（浏览器报告）', 'info', navigator.deviceMemory ? `≥ ${navigator.deviceMemory} GB` : '未报告', 'Chrome 最多只报告到 8 GB，不代表实际内存。');

  // 浏览器内运行模型
  const simd = typeof WebAssembly === 'object' && WebAssembly.validate(SIMD);
  add('浏览器内运行模型', 'WebAssembly SIMD', simd ? 'ok' : 'bad', simd ? '支持' : '不支持', simd ? '' : 'NDLOCR-Lite、PP-OCRv6、Florence-2 都靠它在浏览器里运行。');
  add('浏览器内运行模型', '多线程（跨源隔离）', crossOriginIsolated ? 'ok' : 'info', crossOriginIsolated ? '已开启' : '未开启：按单线程运行', crossOriginIsolated ? '' : '课件的本地预览不发跨源隔离头，模型按单线程运行，结果相同，只是慢一些。');
  let gpu = '不可用';
  try {
    const a = await navigator.gpu?.requestAdapter();
    if (a) gpu = [a.info?.vendor, a.info?.architecture, a.info?.description].filter(Boolean).join(' · ') || '可用';
  } catch { /* no WebGPU */ }
  add('浏览器内运行模型', 'WebGPU', gpu === '不可用' ? 'info' : 'ok', gpu, '本课的浏览器模型默认走 WebAssembly，WebGPU 只作记录。');

  // 存储
  try {
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    const persisted = await navigator.storage.persisted?.();
    add('模型缓存与课堂记录', '可用存储', quota - usage > 2 * 1024 ** 3 ? 'ok' : 'bad', `已用 ${GB(usage)} / 可用上限 ${GB(quota)}`, '模型缓存约 0.4 GB（不含 Florence-2 的 0.27 GB）；不足 2 GB 时请清理浏览器数据或换配置。');
    add('模型缓存与课堂记录', '持久存储', persisted ? 'ok' : 'warn', persisted ? '已获准：浏览器不会自动清掉缓存' : '未申请：磁盘紧张时浏览器可能自动清除已下载的模型', persisted ? '' : 'persist');
  } catch {
    add('模型缓存与课堂记录', '可用存储', 'warn', '浏览器未报告');
  }

  // 屏幕
  const w = innerWidth, h = innerHeight;
  add('屏幕与投影', '窗口大小', w >= 1400 && h >= 820 ? 'ok' : 'warn', `${w}×${h}（屏幕 ${screen.width}×${screen.height}，缩放 ${devicePixelRatio}）`, '三栏页面在 1400×820 以上最舒服；窗口宽度 900 像素及以下自动改成一栏，投影前请在投影分辨率下预览。');

  // 本机服务
  const local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  add('本机服务', '课件预览服务', local ? 'ok' : 'info', local ? location.origin : '当前不是本机预览（' + location.origin + '）', local ? '' : '本机材料与 dots.ocr 只在双击"启动第六周演示"打开的本机预览中可用。');
  if (local) {
    const m = await probe('/local-materials/manifest');
    add('本机服务', '本机材料（教师原件）', m.ok ? 'ok' : 'warn', m.ok ? (m.body || []).map(x => x.id).join('、') + ' 可读' : '读不到', m.ok ? '' : '检查 第六周/demo/codex/fixed-values.json 中的文件路径。');
  }
  const d = await probe('http://127.0.0.1:8786/health');
  if (!d.ok && !d.body) add('本机服务', 'dots.ocr 服务', 'info', '未启动', 'dots');
  else {
    const b = d.body || {};
    add('本机服务', 'dots.ocr 服务', b.loaded ? 'ok' : b.loading ? 'warn' : 'info', b.loaded ? `模型已加载 · ${b.backend} · ${b.dtype}` : b.loading ? '正在加载模型（约 1—3 分钟）' : '服务已启动，模型未加载' + (b.error ? '：' + b.error : ''), 'dots');
  }
  const p = await probe('http://127.0.0.1:8796/health', 1500);
  add('本机服务', 'API 转发（可选）', p.status ? 'ok' : 'info', p.status ? '已启动' : '未启动', '只有当浏览器直连 API 被拦截时才需要；Kimi K3 的接口允许浏览器直连。');
  window.W6Env = { date: new Date().toISOString(), rows: rows.map(r => ({ ...r })) };
  return rows;
}

const DOTS_HELP = `<details class="env-dots"><summary>怎样在这台 Mac 上配置 dots.ocr</summary>
<ol>
  <li>双击 <code>第六周/demo/配置dots.ocr.command</code>。它会检查系统与磁盘、建立独立的 Python 环境（<code>.venv-dots</code>）、安装固定版本的依赖，并从 Hugging Face 下载固定版本的模型（约 6.1 GB，可断点续传），逐个核对 SHA-256。</li>
  <li>脚本最后会自动启动服务、加载模型，并用公开的 1926 年本《史德》一小块做一次试跑，把结果写进 <code>第六周/demo/运行记录/dots/</code>。</li>
  <li>以后上课前只需双击 <code>启动dots服务.command</code>（已默认加载模型、使用 Apple 芯片的 MPS），再回到本页点"重新检测"。</li>
</ol>
<p>dots.ocr 在 Mac 上不是官方支持的运行方式（官方用 vLLM 和 NVIDIA 显卡）。本课的服务用 transformers 在 MPS 上以 bfloat16 运行，速度与效果以本机实测为准；跑不动就在 D11 勾选"教师机不用 dots.ocr"。</p></details>`;

const ICON = { ok: '✓', warn: '!', bad: '✗', info: '·' };

export async function renderEnv(root) {
  root.innerHTML = '<p>正在检测本机环境……</p>';
  await collect();
  const groups = [...new Set(rows.map(r => r.group))];
  root.innerHTML = `<div class="env-head"><h2>本机环境</h2><button data-env="again">重新检测</button></div>
  ${groups.map(g => `<section class="env-group"><h3>${E(g)}</h3><table><tbody>${rows.filter(r => r.group === g).map(r => `<tr class="env-${r.status}">
    <td class="env-icon">${ICON[r.status]}</td><td>${E(r.name)}</td><td>${E(r.value)}</td>
    <td>${r.advice === 'persist' ? '<button data-env="persist">申请持久存储</button>' : r.advice === 'dots' ? DOTS_HELP : E(r.advice)}</td></tr>`).join('')}</tbody></table></section>`).join('')}`;
  root.onclick = async e => {
    const b = e.target.closest('[data-env]');
    if (!b) return;
    if (b.dataset.env === 'persist') await navigator.storage.persist?.();
    await renderEnv(root);
  };
}
