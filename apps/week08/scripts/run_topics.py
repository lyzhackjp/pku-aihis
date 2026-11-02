#!/usr/bin/env python3
"""第八周 D07：在三种语言的语料上实际运行 LDA，保存结果供课件“保存结果回放”。
用法：python3 run_topics.py <语料 JSON> <切分> <K> <种子> <输出 JSON> [--min-df 5]
语料 JSON：[{id, text, date?/year?, ref?, persons?}, …]
切分：en-word（英文按词，去 sklearn 英文停用词）｜zh-char（按字，去虚词与出现在过半文献中的字，照 Miller 2013）｜zh-bigram（相邻二字串）｜
      ja-bigram（相邻二字串，去纯假名串）｜names（只用 persons 栏的人名作词，照山田等 2014）
依赖：scikit-learn（LatentDirichletAllocation，batch 变分推断）。"""
import argparse, collections, datetime, json, re, sys, time
import numpy as np, sklearn
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation

ZH_STOP = set('之乎者也而以其於于為为所即則则亦與与及等曰云矣焉哉耳此彼是不有無无一二三四五六七八九十人日年月')
HAN = r'[㐀-鿿豈-﫿]'
def tok(mode):
    if mode == 'en-word': return dict(analyzer='word', token_pattern=r'(?u)\b[a-zA-Z][a-zA-Z]+\b', lowercase=True, stop_words='english')
    if mode == 'zh-char': return dict(analyzer=lambda s: [c for c in re.findall(HAN, s) if c not in ZH_STOP])
    if mode == 'zh-bigram': return dict(analyzer=lambda s: [a + b for seg in re.findall(HAN + '+', s) for a, b in zip(seg, seg[1:])])
    if mode == 'ja-bigram': return dict(analyzer=lambda s: [x for seg in re.findall(r'[぀-ヿ㐀-鿿々]+', s) for x in (seg[i:i + 2] for i in range(len(seg) - 1)) if re.search(HAN, x)])
    if mode == 'names': return dict(analyzer=lambda s: s.split('\u0001') if s else [])
    raise SystemExit('未知切分：' + mode)

def main():
    a = argparse.ArgumentParser(); a.add_argument('corpus'); a.add_argument('mode'); a.add_argument('k', type=int); a.add_argument('seed', type=int); a.add_argument('out')
    a.add_argument('--min-df', type=int, default=5); a.add_argument('--max-df', type=float, default=0.5); a.add_argument('--iter', type=int, default=25); a.add_argument('--label', default='')
    x = a.parse_args(); docs = json.load(open(x.corpus, encoding='utf-8'))
    texts = ['\u0001'.join(d.get('persons') or []) if x.mode == 'names' else d['text'] for d in docs]
    keep = [i for i, t in enumerate(texts) if t.strip()]
    vec = CountVectorizer(min_df=x.min_df, max_df=x.max_df, **tok(x.mode)); X = vec.fit_transform([texts[i] for i in keep]); vocab = vec.get_feature_names_out()
    t0 = time.time(); lda = LatentDirichletAllocation(n_components=x.k, random_state=x.seed, learning_method='batch', max_iter=x.iter, doc_topic_prior=None, topic_word_prior=None)
    theta = lda.fit_transform(X); secs = round(time.time() - t0, 1)
    phi = lda.components_ / lda.components_.sum(1, keepdims=True)
    topics = []
    for k in range(x.k):
        top = np.argsort(-phi[k])[:15]; docs_k = np.argsort(-theta[:, k])[:5]
        topics.append({'k': k, 'share': round(float(theta[:, k].mean()), 4), 'words': [[vocab[j], round(float(phi[k, j]), 4)] for j in top],
                       'top_docs': [[docs[keep[i]]['id'], round(float(theta[i, k]), 3)] for i in docs_k]})
    # 按年的主题比例（有 date 或 year 时）
    yr = lambda d: (d.get('date') or '')[:4] or d.get('year') or ''
    years = collections.defaultdict(lambda: np.zeros(x.k)); cnt = collections.Counter()
    for i, di in enumerate(keep): y = yr(docs[di]); years[y] += theta[i]; cnt[y] += 1
    by_year = {y: [round(float(v), 4) for v in (years[y] / cnt[y])] for y in sorted(years) if y}
    res = {'kind': 'lda', 'label': x.label, 'date': datetime.datetime.now().astimezone().isoformat(timespec='seconds'), 'corpus': x.corpus.split('/')[-1], 'mode': x.mode, 'k': x.k, 'seed': x.seed,
           'docs': len(keep), 'vocab': len(vocab), 'min_df': x.min_df, 'max_df': x.max_df, 'iter': x.iter, 'alpha': round(float(lda.doc_topic_prior_), 4), 'beta': round(float(lda.topic_word_prior_), 4),
           'perplexity': round(float(lda.perplexity(X)), 1), 'seconds': secs, 'runtime': f'scikit-learn {sklearn.__version__} LatentDirichletAllocation(batch)', 'topics': topics, 'by_year': by_year}
    json.dump(res, open(x.out, 'w', encoding='utf-8'), ensure_ascii=False); print(f'{x.out}: {len(keep)} 篇、词表 {len(vocab)}、{secs} 秒')
if __name__ == '__main__': main()
