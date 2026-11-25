/* 第十一周演示的计算模块｜候选，未经教师确认｜Claude（lesson-agent，lesson-demo），2026-11-25｜第一步：只有接口，未实现
 * 纯函数，不碰 DOM：浏览器里挂在 window.W11Lib，Node 测试用 require 取用（tests/*.test.mjs）。
 * 接口说明与固定例子见 docs/week11/algorithms.md；测试先写（tests/lib.test.mjs、tests/local.test.mjs），第一批再实现。
 * 第十周移入（以函数为单位，第一批做，保留第十周原测试）：quoteUnits、quoteCheck、splitPages、SequenceMatcher、jaccard、
 *   agreement、gate、fillTemplate、stripSecrets、orderRuns、pickRun、planPreclass。
 * 新模块：borrow-scan、note-rules、outline-rules、recall-pool、edit-stats、style-count、docx（解析与修订抽取）、register、
 *   ledger、declaration、through（w11-through/v1）、preclass（runQueue、checkKeys）。
 */
(function (root) {
  'use strict';
  const TODO = (name) => function () { throw new Error(`未实现（第一批）：${name}`); };
  const NAMES = [
    // 第十周移入
    'quoteUnits', 'quoteCheck', 'splitPages', 'jaccard', 'agreement', 'gate', 'fillTemplate', 'stripSecrets', 'orderRuns', 'pickRun', 'planPreclass',
    // borrow-scan
    'extractQuotes', 'borrowScan', 'quoteCheckAll',
    // docx（异步）
    'parseDocx', 'docxRevisions',
    // note-rules
    'noteRules', 'noteLabel',
    // outline-rules
    'splitSentences', 'outlineRules',
    // recall-pool
    'recallPool',
    // edit-stats
    'editStats',
    // style-count
    'styleCount', 'styleDiff', 'excessWord',
    // register
    'normalizeDecision', 'registerSummary',
    // ledger
    'ledgerSelectable', 'ledgerSnippet',
    // declaration
    'buildDeclaration', 'copyText',
    // through
    'emptyThrough', 'exportThrough', 'importThrough',
    // preclass
    'checkKeys', 'runQueue',
    // bib（D16 两头对）
    'bibCrossCheck',
  ];
  const api = {};
  for (const n of NAMES) api[n] = TODO(n);
  api.IMPLEMENTED = false;
  root.W11Lib = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
