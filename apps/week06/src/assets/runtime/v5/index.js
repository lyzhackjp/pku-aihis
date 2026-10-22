// v5 pages: side-by-side panes. A page listed here bypasses the older top-to-bottom body().
import { renderD01, hydrateD01 } from './d01.js';
import { renderD02, hydrateD02 } from './d02.js';
import { renderD04, hydrateD04 } from './d04.js';
import { renderD06, hydrateD06 } from './d06.js';
import { renderD07, hydrateD07 } from './d07.js';
import { renderD08, hydrateD08 } from './d08.js';
import { renderD11, hydrateD11 } from './d11.js';
import { renderD12, hydrateD12 } from './d12.js';
import { renderD13, hydrateD13 } from './d13.js';
import { renderD15, hydrateD15 } from './d15.js';

const PAGES = {
  D01: { render: renderD01, hydrate: hydrateD01 },
  D02: { render: renderD02, hydrate: hydrateD02 },
  D04: { render: renderD04, hydrate: hydrateD04 },
  D06: { render: renderD06, hydrate: hydrateD06 },
  D07: { render: renderD07, hydrate: hydrateD07 },
  D08: { render: renderD08, hydrate: hydrateD08 },
  D11: { render: renderD11, hydrate: hydrateD11 },
  D12: { render: renderD12, hydrate: hydrateD12 },
  D13: { render: renderD13, hydrate: hydrateD13 },
  D15: { render: renderD15, hydrate: hydrateD15 },
};

export const isV5 = id => id in PAGES;
export const renderV5 = l => PAGES[l.p.id].render(l);
export const hydrateV5 = l => PAGES[l.p.id].hydrate(l);
