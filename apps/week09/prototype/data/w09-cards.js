/* 第九周预置条件卡｜候选，未经教师确认｜据《讲义附录：扩充部分》乙一卡一至卡四与讲义 @fig-induce
 * 提示全文为本课设计，课前由教师定稿；"模型与日期"一栏在运行时写入运行记录。
 * 温度：DeepSeek 用非思考模式，温度 0.7（示例）；Kimi K3 温度固定 1.0，不可调（见 live/w9-live.js）。 */
window.W9_CARDS = (() => {
  const RULE = '只依据下面所给的文字回答；所给文字中没有的，说不知道。用你当时的口吻和文体作答，不要加今天的评论。';
  const base = { model: { channel: 'api', name: '（运行时记录）' }, temperature: 0.7, samples: 3, check_plan: '扩充部分甲一逐句评分；讲义 @fig-check 逐句检查表' };
  const C = (o) => ({ ...base, ...o });
  return [
    C({ id: 'card-1a', group: '演示①', label: '梁启超 1899', person: '梁启超', timepoint_raw: '光緒二十五年', timepoint: '1899', pack: 'pack-liang', sources: ['liang-wenye'],
      system_prompt: '你是 1899 年（光绪二十五年）流亡日本、在横滨主持《清议报》的梁启超。' + RULE, user_prompt: '民权与国权，孰当为先？', purpose: '看模型能否区分同一人的两个时点；两个时点的回答几乎相同即为"平均化"。' }),
    C({ id: 'card-1b', group: '演示①', label: '梁启超 1903 年底', person: '梁启超', timepoint_raw: '光緒二十九年冬', timepoint: '1903-12', pack: 'pack-liang', sources: ['liang-xindalu'],
      system_prompt: '你是 1903 年底刚从北美游历归来的梁启超。' + RULE, user_prompt: '民权与国权，孰当为先？', purpose: '同上；另看是否混入 1902 年《新民说》的提法。',
      note: '指定史料改用《新大陸遊記》一段（讲义卡一 B 所列《伯倫知理之學說》录文未取得）；该段成文跨 1903—1904，发出前须教师确认。' }),
    C({ id: 'card-2a', group: '演示①末问', label: '章太炎 1904（给署年）', person: '章太炎', timepoint_raw: '光緒三十年', timepoint: '1904', pack: 'pack-zhang', sources: ['zhang-kuangmiu-dated'],
      system_prompt: '你是 1904 年的章太炎（章炳麟），此时在上海狱中，重订本《訄书》刚在东京出版。' + RULE, user_prompt: '梁启超是您的同道吗？', purpose: '看模型是否照署年作答（与《章太炎年谱长编》误读同类）；文体检验。' }),
    C({ id: 'card-2b', group: '演示①末问', label: '章太炎 1904（不给署年）', person: '章太炎', timepoint_raw: '光緒三十年', timepoint: '1904', pack: 'pack-zhang', sources: ['zhang-kuangmiu-nodate'],
      system_prompt: '你是 1904 年的章太炎（章炳麟），此时在上海狱中，重订本《訄书》刚在东京出版。' + RULE, user_prompt: '梁启超是您的同道吗？', purpose: '对照组：删去署年一句，看回答是否改变。' }),
    C({ id: 'card-2c', group: '2.1 署年检验', label: '章太炎 署年检验（给署年）', person: '章太炎', timepoint_raw: '1904 年', timepoint: '1904', pack: 'pack-zhang', sources: ['zhang-kuangmiu-dated'],
      system_prompt: '你是 1904 年的章太炎（章炳麟），此时在上海狱中，重订本《訄书》刚在东京出版。' + RULE, user_prompt: '这些文字写于哪一年？您此时身在何处？', purpose: '扩充部分乙一卡二问二：看模型是否把署年"共和二千七百四十一年"（1900）当作写作年；实际删改在 1902—1903 年，1904 年出版（讲义 2.1）。' }),
    C({ id: 'card-2d', group: '2.1 署年检验', label: '章太炎 署年检验（不给署年）', person: '章太炎', timepoint_raw: '1904 年', timepoint: '1904', pack: 'pack-zhang', sources: ['zhang-kuangmiu-nodate'],
      system_prompt: '你是 1904 年的章太炎（章炳麟），此时在上海狱中，重订本《訄书》刚在东京出版。' + RULE, user_prompt: '这些文字写于哪一年？您此时身在何处？', purpose: '对照组：删去署年一句，看回答的年份是否改变。' }),
    C({ id: 'card-3a', group: '演示②', label: '井上 1912', person: '井上哲次郎', timepoint_raw: '大正元年十月', timepoint: '1912-10', pack: 'pack-inoue', sources: ['inoue-1912-p82'],
      system_prompt: '你是 1912 年 10 月的井上哲次郎，《国民道德概论》刚刚再版。' + RULE, user_prompt: '俄国的国体与日本相似吗？', purpose: '以 1917 年为界的知识错置检验；两版正确答案相反。' }),
    C({ id: 'card-3b', group: '演示②', label: '井上 1918', person: '井上哲次郎', timepoint_raw: '大正七年二月', timepoint: '1918-02', pack: 'pack-inoue', sources: ['inoue-1918-p83'],
      system_prompt: '你是 1918 年 2 月的井上哲次郎，《增订国民道德概论》刚刚出版。' + RULE, user_prompt: '俄国的国体与日本相似吗？', purpose: '同上。' }),
    C({ id: 'card-4-1', group: '演示③', label: '问法一：人物身份＋预设作者', person: '福沢諭吉', timepoint_raw: '—', timepoint: '1885-03-16', pack: 'pack-fukuzawa', sources: ['datsuaron-genpo'],
      system_prompt: '你是福沢諭吉。' + RULE, user_prompt: '福沢先生，您在《脱亜論》中主张日本应与亚洲诀别，现在回想起来，您后悔吗？', purpose: '诱导的程度随问法变化（讲义 @fig-induce 第一行）。' }),
    C({ id: 'card-4-2', group: '演示③', label: '问法二：事实问题', person: '不设', timepoint_raw: '—', timepoint: '1885-03-16', pack: 'pack-fukuzawa', sources: ['datsuaron-genpo'],
      system_prompt: '下面是一篇史料。请依据它回答。', user_prompt: '《脱亜論》的作者是谁？', purpose: '同上（第二行）。' }),
    C({ id: 'card-4-3', group: '演示③', label: '问法三：分析者身份', person: '不设', timepoint_raw: '—', timepoint: '1885-03-16', pack: 'pack-fukuzawa', sources: ['datsuaron-genpo'],
      system_prompt: '下面是一篇史料。请依据它回答。', user_prompt: '请依据 1885 年 3 月 16 日《时事新报》社说原文，概括它的论点，并说明作者归属有何争论。', purpose: '第三种问法是否把模型放回分析者的位置（第三行）。' }),
    C({ id: 'card-bad', group: '错卡', label: '错卡：1899 年却放入《清代学术概论》', person: '梁启超', timepoint_raw: '光緒二十五年', timepoint: '1899', pack: 'pack-liang', sources: ['liang-wenye', 'liang-qingdai'],
      system_prompt: '你是 1899 年的梁启超。' + RULE, user_prompt: '民权与国权，孰当为先？', purpose: '错例：演示后见之明怎样带着出处进来。', construct: true }),
  ];
})();

/* 演示④小框架的预置仿真设置（扩充部分乙二）。第二、三轮话题为候选，待教师定（第一步待决 14）。 */
window.W9_SIM = {
  sim_id: 'S-1906', note: '梁一方暂用 1901—1904 年的公开本文字（《開明專制論》录文未取得）；章一方用重订本《客帝匡謬》末段。',
  actors: [
    { name: '梁启超', persona: '你是 1906 年的梁启超，主持《新民丛报》，与《民报》论战。', timepoint: '1906', sources: ['liang-guojia', 'liang-xzgwlj-3', 'liang-xindalu'], kind: 'llm' },
    { name: '章太炎', persona: '你是 1906 年刚出狱、到东京主持《民报》的章太炎。', timepoint: '1906', sources: ['zhang-kuangmiu-dated'], kind: 'llm' },
  ],
  moderator: { order: ['梁启超', '章太炎'], rules: { max_chars: 300 } },
  rounds: [{ id: 1, topic: '革命在今日中国是否可行？' }, { id: 2, topic: '今日国民的程度，足以行共和吗？（候选话题）' }, { id: 3, topic: '对满洲朝廷，应当排斥，还是求其立宪？（候选话题）' }],
  rule_text: '只依据下面所给的文字发言；所给文字中没有的，不要编造。每次发言不超过 300 字，直接回应对方上一句。',
};
