// Candidate. Local Chrome, public saved outputs and isolated fixtures. No model/API calls.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const repo = path.resolve(import.meta.dirname, '../../..');
const out = process.env.WEEK06_VERIFY_DIR || repo + '/docs/week06/verification/round5';
const base = process.env.WEEK06_URL || 'http://127.0.0.1:8776/pku-aihis/week06/';
await fs.mkdir(out + '/layout', { recursive: true });
const report = { date: new Date().toISOString(), checks: [], layouts: [], errors: [], localResourceErrors: [], actualModelInference: false,
  mode: 'Public saved replay in a fresh local Chrome context; synthetic Florence output only in its named regression.' };
const browser = await chromium.launch({ headless: process.env.WEEK06_HEADLESS === '1', executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
report.browser = browser.version();
const context = await browser.newContext({ viewport: { width: 1512, height: 860 } });
await context.route('**/*', route => {
  const u = new URL(route.request().url());
  const local = u.origin === new URL(base).origin;
  if (local && (!u.pathname.startsWith('/local-materials/') || u.pathname.endsWith('/manifest')) && route.request().method() === 'GET') return route.continue();
  return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"round5: external calls and private originals disabled"}' });
});
const page = await context.newPage();
page.on('pageerror', e => report.errors.push(e.message));
page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) report.localResourceErrors.push({ url: r.url().slice(base.length), status: r.status() }); });
const current = () => page.locator('deck-slide.current');
const lab = () => current().locator('week06-lab');
async function settle() {
  await page.waitForFunction(async () => {
    const s = await import('./assets/runtime/storage.js');
    const l = document.querySelector('deck-slide.current week06-lab');
    return s.pendingSaves === 0 && !l?.busy && !l?.activating;
  });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
async function go(id) {
  await page.evaluate(id => document.querySelector('deck-container').go(id), id);
  await page.locator(`deck-slide.current[slide-id="${id}"]`).waitFor();
  await page.waitForFunction(() => document.querySelector('deck-slide.current week06-lab')?.materialReady);
  await settle();
  if (id === 'D04') await page.waitForFunction(() => !!document.querySelector('deck-slide.current week06-lab')?.d04?.traces);
  await page.evaluate(() => Promise.all([...document.querySelectorAll('deck-slide.current img')].map(im => im.decode().catch(() => {}))));
}
async function check(name, fn) {
  try { const detail = await fn(); report.checks.push({ name, result: 'passed', detail }); }
  catch (e) { report.checks.push({ name, result: 'failed', detail: e.stack }); }
  console.log(name + ': ' + report.checks.at(-1).result);
}
async function capture(name) { await settle(); await page.screenshot({ path: `${out}/layout/${name}.png` }); }

try {
  await page.goto(base);
  await page.waitForSelector('deck-container');
  report.environment = await page.evaluate(async () => ({ userAgent: navigator.userAgent, platform: navigator.platform,
    full: await navigator.userAgentData?.getHighEntropyValues(['fullVersionList', 'platform', 'platformVersion', 'architecture']) }));

  await check('D01 defaults to the complete NDL public replay', async () => {
    await go('D01');
    const info = await lab().evaluate(l => ({ preview: l.v.ndlPreview, engine: l.visionRecord?.engine.name, count: l.visionRecord?.regions.length }));
    assert.equal(info.preview, true);
    // D01 uses its own selected-line view; verify the displayed stored record as well.
    assert.ok((await lab().innerText()).includes('ndlocr-lite'));
    const count = await page.evaluate(async () => (await import('./assets/runtime/services.js')).lastRecord('ndlocr-lite').regions.length);
    assert.equal(count, 28);
    const positions = await current().locator('.d01-seg').first().evaluate(p => ({
      image: p.querySelector('.d01-crop').getBoundingClientRect().x,
      text: p.querySelector('.d01-vtext').getBoundingClientRect().x,
    }));
    assert.ok(positions.image < positions.text, 'D01 caption promises original on the left and OCR on the right');
    return info;
  });

  await check('Seven public pages: desktop, two projector sizes and single-column breakpoints', async () => {
    for (const [width, height] of [[1512, 860], [1280, 720], [1024, 768], [899, 860], [390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const id of ['D01', 'D02', 'D04', 'D06', 'D08', 'D11', 'D15']) {
        await go(id);
        if (id === 'D04') await current().locator('[data-vz="fit"]').click();
        const info = await current().evaluate(s => {
          const body = s.querySelector('.slide-body');
          body.scrollTop = 0;
          const panes = [...s.querySelectorAll('.v5-grid > .v5-pane')].map(p => {
            const r = p.getBoundingClientRect(), b = p.querySelector('.v5-pane-body');
            b.scrollTop = 0;
            return { key: p.dataset.pane, x: r.x, y: r.y, width: r.width, height: r.height,
              viewportHeight: b.clientHeight, scrollHeight: b.scrollHeight, overflowY: getComputedStyle(b).overflowY };
          });
          return { overflow: document.documentElement.scrollWidth > innerWidth + 1, bodyHeight: body.clientHeight,
            bodyScrollHeight: body.scrollHeight, error: s.innerText.includes('页面状态错误'), panes };
        });
        report.layouts.push({ id, width, height, ...info });
        await capture(`${width}x${height}-${id}`);
        assert.ok(!info.overflow && !info.error, `${width} ${id}: page overflow/error`);
        assert.equal(info.panes.length, id === 'D02' ? 2 : 3);
        if (width > 900) {
          assert.ok(info.bodyScrollHeight <= info.bodyHeight + 2, `${width} ${id}: page body scrolls`);
          assert.ok(info.panes.every(p => p.height > 180 && p.width >= 140), `${width} ${id}: unusable pane size`);
          assert.ok(info.panes.every(p => Math.abs(p.y - info.panes[0].y) < 2));
        } else {
          assert.ok(info.panes.every(p => p.scrollHeight <= p.viewportHeight + 2), `${width} ${id}: stacked content escapes its pane`);
          for (let i = 1; i < info.panes.length; i++) {
            assert.ok(Math.abs(info.panes[i].x - info.panes[0].x) < 2);
            assert.ok(info.panes[i].y >= info.panes[i - 1].y + info.panes[i - 1].height - 1, `${width} ${id}: panes overlap`);
          }
          // Reach the bottom content in the one-column layout.
          await current().locator('.v5-pane').last().scrollIntoViewIfNeeded();
          await capture(`${width}x${height}-${id}-last-pane`);
        }
      }
    }
  });

  await page.setViewportSize({ width: 1512, height: 860 });
  await check('D11 to D02: loading the dots default must not replace pipeline candidates', async () => {
    await go('D11');
    assert.equal(await page.evaluate(async () => (await import('./assets/runtime/services.js')).lastRecord('dots.ocr').regions.length), 5);
    await go('D02');
    const record = await lab().evaluate(l => ({ engine: l.visionRecord.engine.name,
      positions: l.visionRecord.regions.some(r => r.recognition_trace?.positions?.length > 0) }));
    assert.ok(['ndlocr-lite', 'pp-ocrv6'].includes(record.engine));
    assert.ok(record.positions);
    await current().locator('[data-v5-tab="d02Tab"][data-value="cls"]').click(); await settle();
    assert.ok(await current().locator('.candidate-window select option').count() > 0);
    await capture('D02-after-D11-candidates');
    return record;
  });
  await check('keepScroll: changing a D02 parameter preserves the scrolled task pane', async () => {
    await go('D02');
    await current().locator('[data-v5-tab="d02Tab"][data-value="det"]').click();
    await settle();
    const before = await lab().evaluate(l => [...l.querySelectorAll('.v5-pane-body')].map(p => { p.scrollTop = 120; return p.scrollTop; }));
    assert.ok(before[1] > 0, 'test must actually scroll the task pane');
    const select = current().locator('[data-k="selectedLine"]');
    const ids = await select.locator('option').evaluateAll(xs => xs.map(x => x.value));
    await select.selectOption(ids.at(-1));
    await settle();
    assert.deepEqual(await lab().evaluate(l => [...l.querySelectorAll('.v5-pane-body')].map(p => p.scrollTop)), before);
    assert.equal(await current().locator('.slide-body').evaluate(p => p.scrollTop), 0);
    await capture('keepScroll-D02-after-parameter');
    return { before, changedLine: ids.at(-1) };
  });

  await check('keepScroll: keyed pane and nested horizontal scroll survive reconstruction', async () => {
    const result = await page.evaluate(async () => {
      const { keepScroll } = await import('./assets/runtime/v5/layout.js');
      const body = document.createElement('div');
      body.className = 'slide-body'; body.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:150px;overflow:auto;display:block';
      const host = document.createElement('div'); body.append(host); document.body.append(body);
      const markup = key => `<section data-pane="${key}"><div class="v5-pane-body" style="display:block;height:110px;overflow:auto"><div data-keep-scroll="${key}" style="width:200px;height:90px;overflow:auto"><div style="width:800px;height:800px"></div></div><div style="height:800px"></div></div></section>`;
      try {
        host.innerHTML = markup('a') + markup('b'); body.scrollTop = 40;
        host.querySelector('[data-pane="a"] .v5-pane-body').scrollTop = 70;
        const inner = host.querySelector('[data-keep-scroll="a"]'); inner.scrollTop = 25; inner.scrollLeft = 50;
        keepScroll(host, () => { host.innerHTML = markup('b') + markup('a'); });
        const next = host.querySelector('[data-keep-scroll="a"]');
        return [body.scrollTop, host.querySelector('[data-pane="a"] .v5-pane-body').scrollTop, next.scrollTop, next.scrollLeft];
      } finally { body.remove(); }
    });
    assert.deepEqual(result, [40, 70, 25, 50]);
  });

  await check('D06: click then Up/Down moves and keeps focus; boundary does not flip slides', async () => {
    await go('D06');
    const ids = () => current().locator('[data-d06-item]').evaluateAll(xs => xs.map(x => x.dataset.d06Item));
    const original = await ids();
    const chosen = original[2];
    await current().locator(`[data-d06-item="${chosen}"]`).click();
    await page.keyboard.press('ArrowUp'); await settle();
    assert.equal((await ids())[1], chosen);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.d06Item), chosen);
    await page.keyboard.press('ArrowDown'); await settle();
    assert.deepEqual(await ids(), original);
    await current().locator(`[data-d06-item="${original[0]}"]`).click();
    await page.keyboard.press('ArrowUp'); await settle();
    assert.deepEqual(await ids(), original);
    assert.equal(await current().getAttribute('slide-id'), 'D06');
    assert.equal(await current().getByText('键盘操作', { exact: true }).count(), 0);
  });

  await check('D04: served index, three real traces, three thresholds, heat scores and five stages', async () => {
    await go('D04');
    const index = await page.evaluate(async () => { const r = await fetch('assets/materials/kraken-d04/index.json'); if (!r.ok) throw Error(r.status); return r.json(); });
    assert.equal(index.materials.length, 3);
    for (const { id } of index.materials) {
      await current().locator(`[data-v5-tab="d04Mat"][data-value="${id}"]`).click(); await settle();
      await current().locator('button[data-d04-stage="2"]').click(); await settle();
      for (const threshold of ['0.1', '0.17', '0.3']) {
        await current().locator(`[data-d04-thr="${threshold}"]`).click(); await settle();
        const expected = await lab().evaluate((l, args) => l.d04.traces[args.id].thresholds[args.threshold].lines.length, { id, threshold });
        assert.equal(await current().locator('.d04-svg .d04-base').count(), expected);
      }
    }
    await current().locator('[data-v5-tab="d04Mat"][data-value="p2510-rot"]').click();
    for (const stage of [0, 1, 2, 3, 4]) {
      await current().locator(`button[data-d04-stage="${stage}"]`).click(); await settle();
      await current().locator('[data-vz="fit"]').click();
      if (stage === 1) {
        await page.waitForFunction(() => { const c = document.querySelector('deck-slide.current [data-d04-heat]'); return c && c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some(v => v > 0); });
        await current().locator('[data-d04="ch"]').selectOption('0');
        await current().locator('.v5-viewer-stage').hover();
        await page.waitForFunction(() => document.querySelector('deck-slide.current [data-d04-readout]')?.textContent.includes('该点分数'));
      }
      await capture(`D04-stage-${stage + 1}`);
    }
  });

  await check('Column divider: drag changes widths, double-click restores them', async () => {
    await go('D04');
    const widths = () => current().locator('.v5-pane').evaluateAll(xs => xs.map(x => Math.round(x.getBoundingClientRect().width)));
    const original = await widths();
    const handle = current().locator('.v5-split').first(), box = await handle.boundingBox();
    await page.mouse.move(box.x + 4, box.y + 40); await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y + 40, { steps: 6 }); await page.mouse.up();
    assert.ok((await widths())[0] > original[0] + 40);
    await handle.dblclick(); await settle();
    assert.deepEqual(await widths(), original);
  });

  await check('D11 Florence: no-coordinate output has an explicit reason and preserved raw prefix', async () => {
    await go('D11');
    await page.evaluate(async () => {
      const S = await import('./assets/runtime/services.js'), { makeRecord } = await import('./assets/modules/ocr/record.mjs'), { addRecord } = await import('./assets/runtime/storage.js');
      await addRecord(makeRecord({ generated: '<s>回归夹具：模型只返回文字，没有坐标</s>', fixture: true }, [], S.meta('florence-2', '教学构造', 'round5-no-coordinate-fixture')));
    });
    await settle();
    await current().locator('[data-v5-tab="engineTab"][data-value="florence-2"]').click(); await settle();
    const card = current().locator('.d11-card').filter({ has: page.locator('h4', { hasText: 'Florence-2' }) });
    assert.match(await card.innerText(), /没有返回任何带坐标的区域/);
    assert.match(await card.innerText(), /原始输出开头：回归夹具/);
    assert.equal(await card.locator('.selected-crop').count(), 0);
    assert.ok(!((await card.innerText()).includes('本页尚未运行')));
    await capture('fixture-D11-Florence-no-coordinates');
  });

  await check('D12/D13: Kimi preset, disabled run before vision check, in-place explanation', async () => {
    for (const id of ['D12', 'D13']) {
      await go(id);
      assert.match(await current().locator('.kimi-status').innerText(), /kimi-k3/);
      assert.match(await current().locator('.kimi-status').innerText(), /https:\/\/api.moonshot.cn\/v1/);
      assert.ok(await current().locator('[data-kimi="test"]').isDisabled());
      assert.ok(await current().locator('.kimi > button[data-act]').isDisabled());
      await current().locator('.kimi-why summary').click();
      assert.match(await current().locator('.kimi-why').innerText(), /史德 7141/);
    }
  });

  await check('Refresh and revisit all 26 pages', async () => {
    await page.reload(); await page.waitForSelector('deck-container');
    for (let i = 0; i < 26; i++) {
      const id = 'D' + String(i).padStart(2, '0');
      if (i === 25) { await page.evaluate(() => document.querySelector('deck-container').go('D25')); await current().locator('[data-k="q"]').waitFor(); }
      else await go(id);
      assert.ok(!(await current().innerText()).includes('页面状态错误'), id);
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.localResourceErrors, []);
  });
} catch (e) { report.errors.push(e.stack); }
finally {
  await browser.close();
  await fs.writeFile(out + '/browser-v5.json', JSON.stringify(report, null, 2) + '\n');
  const failed = report.checks.filter(c => c.result === 'failed');
  console.log(JSON.stringify({ checks: report.checks.length, layouts: report.layouts.length, failed, errors: report.errors, resources: report.localResourceErrors }, null, 2));
  if (failed.length || report.errors.length || report.localResourceErrors.length) process.exitCode = 1;
}
