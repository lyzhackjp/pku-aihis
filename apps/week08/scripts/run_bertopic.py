#!/usr/bin/env python3
"""第八周 D07 进阶：同一语料上的 BERTopic，结果格式与 run_topics.py 相同，便于页面并排对照。
用法：python3 run_bertopic.py <语料 JSON> <切分> <嵌入模型> <种子> <输出 JSON> [--min-cluster 40]
切分：en-word｜zh-char｜ja-bigram（第④步分词计数用；第①步嵌入直接读原文）。
依赖：bertopic、sentence-transformers、umap-learn、hdbscan（课前环境 bertopic 0.17.4、torch CPU）。嵌入模型从 Hugging Face 下载，缓存不入 Git。"""
import argparse, collections, datetime, json, re, time
import numpy as np

HAN = r'[㐀-鿿豈-﫿]'
ZH_STOP = set('之乎者也而以其於于為为所即則则亦與与及等曰云矣焉哉耳此彼是不有無无一二三四五六七八九十人日年月')
def analyzer(mode):
    if mode == 'zh-char': return lambda s: [c for c in re.findall(HAN, s) if c not in ZH_STOP]
    if mode == 'ja-bigram': return lambda s: [x for seg in re.findall(r'[぀-ヿ㐀-鿿々]+', s) for x in (seg[i:i + 2] for i in range(len(seg) - 1)) if re.search(HAN, x)]
    return None

def main():
    a = argparse.ArgumentParser(); a.add_argument('corpus'); a.add_argument('mode'); a.add_argument('model'); a.add_argument('seed', type=int); a.add_argument('out')
    a.add_argument('--min-cluster', type=int, default=40); a.add_argument('--selection', default='eom'); a.add_argument('--label', default='')
    x = a.parse_args()
    from bertopic import BERTopic
    from sentence_transformers import SentenceTransformer
    from sklearn.feature_extraction.text import CountVectorizer
    from umap import UMAP
    from hdbscan import HDBSCAN
    import bertopic, sentence_transformers
    docs = [d for d in json.load(open(x.corpus, encoding='utf-8')) if d['text'].strip()]
    texts = [d['text'] for d in docs]
    import hashlib, pathlib
    cache = pathlib.Path(x.out).with_suffix('.emb.npy'); t0 = time.time()
    if cache.exists(): emb = np.load(cache)
    else: emb = SentenceTransformer(x.model, device='cpu').encode(texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True); np.save(cache, emb)
    t_emb = time.time() - t0
    an = analyzer(x.mode)
    vec = CountVectorizer(analyzer=an) if an else CountVectorizer(stop_words='english', token_pattern=r'(?u)\b[a-zA-Z][a-zA-Z]+\b')  # BERTopic 按类合并后再计数，类数少，不能设 min_df
    model = BERTopic(embedding_model=None, umap_model=UMAP(n_neighbors=15, n_components=5, min_dist=0.0, metric='cosine', random_state=x.seed),
                     hdbscan_model=HDBSCAN(min_cluster_size=x.min_cluster, metric='euclidean', cluster_selection_method=x.selection, prediction_data=True),
                     vectorizer_model=vec, calculate_probabilities=False, verbose=False, language='english' if x.mode == 'en-word' else 'multilingual')  # 'english' 时预处理会删去非 ASCII 字符
    t1 = time.time(); topics, _ = model.fit_transform(texts, emb); t_fit = time.time() - t1
    topics = np.array(topics); ids = sorted(t for t in set(topics.tolist()) if t != -1)
    cent = {t: emb[topics == t].mean(0) for t in ids}
    out = []
    for t in ids:
        idx = np.where(topics == t)[0]; sim = emb[idx] @ cent[t]; rep = idx[np.argsort(-sim)[:5]]
        out.append({'k': int(t), 'share': round(float(len(idx) / len(docs)), 4), 'n': int(len(idx)), 'words': [[w, round(float(v), 4)] for w, v in model.get_topic(t)[:15]],
                    'top_docs': [[docs[i]['id'], round(float(emb[i] @ cent[t]), 3)] for i in rep]})
    yr = lambda d: str(d.get('date') or '')[:4] or str(d.get('year') or '')
    years = collections.defaultdict(lambda: np.zeros(len(ids))); cnt = collections.Counter(); pos = {t: j for j, t in enumerate(ids)}
    for d, t in zip(docs, topics):
        y = yr(d)
        if not y: continue
        cnt[y] += 1
        if t != -1: years[y][pos[t]] += 1
    by_year = {y: [round(float(v), 4) for v in years[y] / cnt[y]] for y in sorted(cnt)}
    res = {'kind': 'bertopic', 'label': x.label, 'date': datetime.datetime.now().astimezone().isoformat(timespec='seconds'), 'corpus': x.corpus.split('/')[-1], 'mode': x.mode,
           'k': len(ids), 'seed': x.seed, 'docs': len(docs), 'vocab': len(model.vectorizer_model.get_feature_names_out()), 'outliers': int((topics == -1).sum()),
           'embedding_model': x.model, 'min_cluster_size': x.min_cluster, 'seconds': round(t_emb + t_fit, 1), 'seconds_embed': round(t_emb, 1),
           'runtime': f'BERTopic {bertopic.__version__}（sentence-transformers {sentence_transformers.__version__}，{x.model}；UMAP 5 维 random_state={x.seed}；HDBSCAN min_cluster_size={x.min_cluster}、{x.selection}；嵌入{"取自缓存" if t_emb < 5 else "现场计算"}）',
           'topics': out, 'by_year': by_year, 'by_year_note': '各年中归入该主题的条目比例（BERTopic 每条只归一个主题，离群条目不计入任何主题）'}
    json.dump(res, open(x.out, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{x.out}: {len(docs)} 篇，{len(ids)} 个主题，离群 {res["outliers"]}，嵌入 {t_emb:.0f} 秒，聚类 {t_fit:.0f} 秒')
if __name__ == '__main__': main()
