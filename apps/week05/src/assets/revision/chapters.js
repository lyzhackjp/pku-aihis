/* 第五周 D01、D02、D10、D18、D21 的阶段卡数据。
 * 每张卡：讲义原句（照抄，注节次）、本讲材料中的具体例子、简短解释、去往演示页的链接。
 * 讲义原句均摘自《第五讲 知识库检索与有依据的生成》讲义（2026-10-14 稿）；外文论文原句另注出处。
 * D21“三类问题”只录讲义转述，不录未刊稿原文与题名。 */
window.W5_CHAPTERS = {
  D01: {
    lead: "RAG 的发展大致可以分成四个阶段；前三个阶段的名称据 Gao 等人的综述，第四阶段据助教概括。",
    stages: [
      {
        name: "朴素 RAG", tag: "第三周", short: "索引 → 检索 → 生成",
        quote: "朴素 RAG 就是上面说的索引—检索—生成，第三周我们走过的就是这一种。", cite: "讲义·导入",
        subs: [
          { name: "索引", quote: "索引发生在提问之前：系统把我们提供的材料切成一个个片段，把每个片段转换成可以比较的表示（词项统计或向量），再把这些表示组织成便于查找的索引，就像为一批书编好目录和卡片。", cite: "讲义·导入",
            example: "《史德》上海書店影印本印刷页63—64，按段切成10个片段（S1—S6b）；每段各算一组 BM25 词项权重和一个 384 维 MiniLM 向量。",
            explain: "索引一旦建好，后面能取回的就只是这些片段。切在哪里、用什么表示，在提问之前已经决定。", links: [["D04", "切分实验"], ["D10", "表示与度量"]] },
          { name: "检索", quote: "检索发生在提问之时：问题本身也被转换成同样的表示，系统按相似程度从索引中取回最相近的若干片段，必要时再重新排序。", cite: "讲义·导入",
            example: "查询“史德與心術”在《史德》十段上做 BM25，排在第一的是含“能具史識者。必知史德”的 S4。",
            explain: "相似程度由所选表示与度量算出，不是史实可信度；排在前面也只是字面或向量更近。", links: [["D10", "实际排序"], ["D15", "取回、进入、使用"]] },
          { name: "生成", quote: "生成发生在最后：取回的片段连同问题一起放进大模型这一次的输入，模型据此写出回答，并标出每句依据哪一段。", cite: "讲义·导入",
            example: "错例回答：“章學誠、阿克顿與森鴎外都認為歷史敘述必須完全服從史料。”句子流畅，也可以附上三处引文。",
            explain: "标了引文，只说明它指向了某处；那一处是否支持这句话，要回去读。", links: [["D16", "三级支持判定"], ["D17", "回到错例"]] },
        ],
      },
      {
        name: "高级 RAG", tag: "本讲 2.3", short: "检索前改写，检索后重排",
        quote: "Yunfan Gao 等人 2023 年发布的综述……把前三个阶段概括为“the Naive RAG, the Advanced RAG, and the Modular RAG”（朴素 RAG、高级 RAG 与模块化 RAG）。", cite: "讲义·导入；Gao 等，arXiv:2312.10997",
        subs: [
          { name: "检索前：查询重写", quote: "高级 RAG 在检索前后各加一道工序：检索前改写查询，检索后重新排序。", cite: "讲义·导入",
            example: "问题“章學誠怎样看待史家的立场”与原文“謂著書者之心術也”字面几乎没有重合；HyDE 先写一段假想答案，再用它去找真实片段。",
            explain: "假想答案只作检索线索，用完即弃，不能进入引文位置。", links: [["D13", "查询重写与 HyDE"]] },
          { name: "检索后：重排与去重", quote: "第一步追求“找得全”，从大集合里快速取出几十到上百个候选；第二步追求“排得准”，在少量候选上花更多计算重新排序。", cite: "讲义 2.3",
            example: "阿克顿演讲 1911 年重印本扫描页（印刷页40—42）与 Gutenberg 电子文本，在机器看来是近似重复。",
            explain: "去重之前先看两段来自哪两个版本；版本差异可能正是研究对象。", links: [["D14", "重排与去重"]] },
        ],
      },
      {
        name: "模块化 RAG", tag: "本讲第四节", short: "各环节拆成可替换的部件",
        quote: "模块化 RAG 把各个环节拆成可以替换、可以重新组合的部件，同一团队 2024 年的论文形容为“decomposing complex RAG systems into independent modules and specialized operators”（把复杂的 RAG 系统拆成独立的模块和专门的算子）。", cite: "讲义·导入；Gao 等，arXiv:2407.21059",
        subs: [
          { name: "换掉表示与度量", quote: "前者决定“拿什么去比”，后者决定“怎样算相近”。", cite: "讲义 2.1",
            example: "同一查询、同一批片段，把 BM25 换成多语句向量，跨语种的阿克顿与森鴎外段落才可能排进来。",
            explain: "模块可以替换，替换的是哪一块要说清楚：换的是表示，还是度量。", links: [["D10", "表示与度量"], ["D11", "集合度量"]] },
          { name: "换掉索引结构", quote: "GraphRAG 是在模块化思路下换掉索引结构的一种做法。", cite: "讲义·导入",
            example: "《史德》开篇的“劉氏子元”“劉氏”与刘知幾，在图里可以成为一个节点，也可能成为三个互不相干的节点。",
            explain: "图结构为整批材料的关系问题服务，建图本身又引入实体消解这一新的判断。", links: [["D18", "GraphRAG"], ["D19", "实体消解"]] },
        ],
      },
      {
        name: "智能体的基础设施", tag: "本讲第五节", short: "模块打散，作为工具调用",
        quote: "到了现在，RAG 又成了智能体的基础设施：原来的各个模块被打散，作为工具交给智能体调用，不再是一条独立的流水线。", cite: "讲义·导入（第四阶段据助教概括）",
        subs: [
          { name: "检索成为工具", quote: "通用智能体则把检索做成可调用的工具之一，由模型在每一步决定下一步做什么，这是目前的主流实现。", cite: "讲义 5.1",
            example: "同一问题、同一库、同一预算：固定路径检索一次；工具路径由模型自己改写查询、决定检索几次。",
            explain: "步骤更多、路径每次可能不同；运行记录要逐次保存，才能比较。", links: [["D22", "对照实践"]] },
          { name: "围绕共用结构协作", quote: "复杂的学术问题可以交给多个智能体：它们共用同一个知识库和同一份数据结构，各自搜索，把发现写回这份结构，再从中读取别人的发现。", cite: "讲义 5.1（助教的概括）",
            example: "黑板上依次写下取回的片段、归并的称呼和尚缺的证据；各个知识源只读写黑板。",
            explain: "每一句都可能有出处，整体框架却不一定来自材料；这是检索和引用标记查不出的错误。", links: [["D21", "黑板与蚂蚁系统"]] },
        ],
      },
    ],
  },
  D02: {
    lead: "错例：“章學誠、阿克顿與森鴎外都認為歷史敘述必須完全服從史料。”要使这句判断成立，至少要分开检查四个部分。",
    stages: [
      {
        name: "一　材料入库", tag: "第一节 1.1", short: "库里是不是我们想给它看的那个版本",
        quote: "其一，我们给AI提供的三份材料是否成功入库，从它包含的各项字段信息来看，它是否就是我们想要给AI看的那个版本？", cite: "讲义·导入",
        subs: [
          { name: "版本", quote: "换言之，“库里有这篇”并不等于“库里有初刊”，回答中引用的位置，也只能是所收版本中的位置。", cite: "讲义 1.1",
            example: "森鴎外一文初刊于1915年1月《心の花》；库里收的是筑摩書房1964年《現代文学大系》第4卷的扫描页，印刷页480—482。",
            explain: "错例里“森鴎外認為”的“認為”，只能落到所收版本的具体位置上。", links: [["D03", "材料身份"]] },
          { name: "范围", quote: "如果某份材料根本没有入库，系统找不到相关内容，只能说明“本库未收”，不能推出“作者没有这样说过”。", cite: "讲义 1.1",
            example: "阿克顿只收了1911年重印本印刷页40—45；演讲其余部分不在库里。",
            explain: "“都認為”是对三位作者的全称判断，而库只收了每人的一小段。", links: [["D03", "材料身份"]] },
        ],
      },
      {
        name: "二　取回片段", tag: "第一节 1.2—1.3", short: "取回的是哪几段，有没有漏掉语境",
        quote: "其二，机器实际上取回的内容是哪几段文字，有没有漏掉限定语境的上下文，或者漏掉其它有关联的文段？", cite: "讲义·导入",
        subs: [
          { name: "切点", quote: "如果切分把第三段单独切成一块，系统取回的就只是“不愿改动史料”这一表态，而这一表态针对的是他自己的历史小说，这个对象是在第一段交代的。", cite: "讲义 1.3",
            example: "森鴎外 M3：“わたくしは史料を調べて見て、其中に窺はれる「自然」を尊重する念を発した。”对象在 M1：“歴史上の人物を取り扱つた作品”。",
            explain: "错例把一位小说家对自身创作的说明，概括成了对一般历史写作的主张。", links: [["D04", "切分实验"], ["D07", "按意思切"]] },
          { name: "证据分布", quote: "回答“章學誠的要求是什么”至少需要 ② 与 ③；说明“为什么要提史德”还需要 ①。", cite: "讲义 1.3 图",
            example: "《史德》：①“猶未足以盡其理”（对象）②“德者何。謂著書者之心術也”（定义）③“盡其天而不益以人”（要求）。",
            explain: "只取回 ②，能说“章學誠重视心术”，说不出这一说针对谁、要求什么。", links: [["D09", "一句回答需要几个片段"]] },
        ],
      },
      {
        name: "三　进入上下文", tag: "第三节 3.1", short: "取回的片段是否真的进了这一次输入",
        quote: "其三，机器取回的片段是否真正进入并影响了模型这一次的输入？", cite: "讲义·导入",
        subs: [
          { name: "取回、进入、使用", quote: "因此“取回了”不等于“进入了”，“进入了”也不等于“被用了”。漏检出在哪一步，补救办法就不同。", cite: "讲义 3.1",
            example: "查询“史德與心術”在《史德》十段上的 BM25 实际排序为 S4、S6b、S5、S6……；上下文预算为3段时，含“盡其天而不益以人”的 S6 排第4，没有进入输入。",
            explain: "要记录的是实际输入的片段 ID 与原文，而不只是检索结果。", links: [["D15", "取回、进入、使用"]] },
          { name: "检索单位与引用单位", quote: "检索的单位和引用的单位不必相同。", cite: "讲义 3.1",
            example: "用较小的块检索；取回后补入相邻段；回答中只指向支持判断的那一句。",
            explain: "三个单位各有用途，分开设计，才能既找得准，又说得清依据。", links: [["D08", "片段怎样带上上下文"]] },
        ],
      },
      {
        name: "四　概括有据", tag: "第三节 3.2", short: "“都認為”“完全服從”是否有原文支持",
        quote: "其四，“都认为”“完全服从”这样的概括，是三段原文共同支持的，还是模型在拼接时添加的？", cite: "讲义·导入",
        subs: [
          { name: "三级判定", quote: "“完全服从”一语在三段材料中都找不到依据。按三级判断，这句话即使附上三处引文，每一处也至多是部分支持。", cite: "讲义 3.2",
            example: "章學誠要求“盡其天而不益以人”；阿克顿追问所读文字是否出自作者原本；森鴎外说的是写自己的历史小说时不愿随意改动史料。",
            explain: "三段谈的不是同一件事，“都認為”要求三段各自支持同一个判断。", links: [["D16", "三级支持判定"], ["D17", "回到错例"]] },
          { name: "框架是否来自材料", quote: "每一句都可能有出处，整体框架却不是材料本身的。", cite: "讲义 5.1",
            example: "“历史叙述必须服从史料”这一框架，在三段原文中都没有以这种形式出现。",
            explain: "逐句核读之外，还要问整体概括从哪里来。", links: [["D21", "三类问题"]] },
        ],
      },
    ],
  },
  D10: {
    lead: "表示，是把文字变成可以比较的对象；度量，是规定怎样比较两个对象，例如余弦。",
    stages: [
      {
        name: "稀疏表示", tag: "第三周回顾", short: "认字面：词袋、TF-IDF、BM25",
        quote: "稀疏表示认字面，写法不同的词毫无共同之处；稠密表示认意思，但对专名和罕见词不如关键词检索精确。", cite: "讲义 2.1",
        subs: [
          { name: "词袋与 TF-IDF", quote: "从独热编码、词袋、TF-IDF 与 BM25，到 word2vec 的词向量和跨语言映射……", cite: "讲义 2.1",
            example: "查询“史德與心術”拆成“史、德、與、心、術”五个字；简体“心术”的“术”与原文“術”不算同一个字。",
            explain: "词袋只数出现次数；TF-IDF 再按全库稀有程度加权。", links: [["D11", "集合度量"]] },
          { name: "BM25", quote: "BM25 则是一种打分函数，直接根据词频、词的稀有程度和文档长度给文档打分。", cite: "讲义 2.1",
            example: "右侧选“BM25”实际计算：每段列出参与打分的字与各自贡献。",
            explain: "词频有饱和，长段落按平均长度校正；参数 k₁、b 见讲义图“几种相似度度量的比较”。", links: [] },
        ],
      },
      {
        name: "稠密表示", tag: "第三周回顾", short: "认意思：句向量与余弦",
        quote: "余弦既可以用在词频向量上，也可以用在嵌入向量上。", cite: "讲义 2.1",
        subs: [
          { name: "句向量", quote: "再到 Sentence-BERT 的句向量、SPLADE 的神经稀疏表示，以及以大语言模型为基础的嵌入。", cite: "讲义 2.1",
            example: "本页在浏览器里实际运行 paraphrase-multilingual-MiniLM-L12-v2（q8），每段得到 384 维向量。",
            explain: "向量间的余弦用于排序，不是史实置信度。", links: [["D06", "断点式语义切分"]] },
        ],
      },
      {
        name: "多语表示", tag: "本讲", short: "中文问题能否找到日文、英文材料",
        quote: "本讲的库同时有中文、日文和英文，嵌入模型是否多语，决定了用中文问题能不能找到日文和英文材料；这种漏检与切分、排序都无关。", cite: "讲义 2.1",
        subs: [
          { name: "跨语种", quote: "若是拿英文查询去比中文文本，无论按字还是按字二元组，交集都是空的，系数恒为零，这时只能依靠多语嵌入（2.1）。", cite: "讲义 2.2",
            example: "材料选“本页可用全部材料”，查询“历史叙述与史料的关系”：BM25 只能给含相同汉字的段落打分；多语句向量会给每一段都算出余弦，可在右侧对照两种结果。",
            explain: "命中之后仍须回到原语、所用版本与印刷页。", links: [] },
        ],
      },
      {
        name: "BGE-M3", tag: "本讲补充", short: "一个模型给出三种检索功能",
        quote: "“can simultaneously accomplish the three common retrieval functionalities”（能同时完成三种常见的检索功能），即稠密检索、多向量检索和稀疏检索。", cite: "讲义 2.1；Chen 等，arXiv:2402.03216",
        subs: [
          { name: "本页的范围", quote: "同一个模型既给出一个认意思的稠密向量，也给出一组认字面的词项权重，第三周讲的混合检索可以在一个模型内部完成。", cite: "讲义 2.1",
            example: "本页没有载入 BGE-M3；实际运行的是 MiniLM 多语模型与浏览器内 BM25。",
            explain: "页面只演示实际运行了的模型，不以 MiniLM 冒称 BGE-M3。", links: [] },
        ],
      },
    ],
  },
  D18: {
    lead: "线性的 RAG 擅长回答“某处说了什么”，却难以回答面向整批材料的问题，因为它每次只取回与问题最相似的少数几段。",
    stages: [
      {
        name: "为什么需要图", tag: "4.1", short: "全局问题不在任何一个片段里",
        quote: "“RAG fails on global questions directed at an entire text corpus”（RAG 在针对整个语料的全局性问题上会失败）。", cite: "讲义 4.1；Edge 等，arXiv:2404.16130",
        subs: [
          { name: "全局问题", quote: "可是有些问题的答案不在任何一个片段里，例如“这批材料中反复出现哪些人物和概念，它们之间是什么关系”。", cite: "讲义第四节导语",
            example: "“三份材料中反复出现哪些人物与概念？”——答案不在《史德》、阿克顿或森鴎外的任何一段里。",
            explain: "向量检索只取最相似的几段，回答不了“整批材料讲了什么”。", links: [] },
        ],
      },
      {
        name: "建索引", tag: "4.1", short: "抽实体与关系 → 社区 → 社区摘要",
        quote: "“to derive an entity knowledge graph from the source documents, then to pregenerate community summaries”（先从原始文档中导出实体知识图谱，再预先生成社区摘要）。", cite: "讲义 4.1；Edge 等",
        subs: [
          { name: "实体与关系", quote: "建索引时，先用大语言模型从每个块中抽取人物、地点、概念等实体及其关系，构成一张知识图谱。", cite: "讲义 4.1",
            example: "右侧可实际在选中原文上建共现图；配置共用模型后，也可让模型抽取带逐字证据的关系。",
            explain: "每条边要能回到片段 ID 与原话；共现不是史实关系。", links: [["D19", "实体消解"]] },
          { name: "社区与摘要", quote: "再用社区发现算法把图中联系紧密的实体分成若干群落，为每个群落预先写一份社区摘要。", cite: "讲义 4.1",
            example: "课堂图用标签传播实际划分社区；原实现用层级 Leiden 社区。",
            explain: "摘要由模型写成，仍须回到最初所用片段核读。", links: [] },
        ],
      },
      {
        name: "查询", tag: "4.1", short: "全局、局部、基本三种方式",
        quote: "全局检索在所有社区摘要上分头作答再汇总，适合“主要议题是什么”一类问题，但消耗很大；局部检索从相关实体出发，把图中的关系与原文片段结合起来，适合关于具体人物或概念的问题；基本检索则就是普通的向量 RAG，用来对照。", cite: "讲义 4.1",
        subs: [
          { name: "全局与局部", quote: "全局检索在所有社区摘要上分头作答再汇总……局部检索从相关实体出发，把图中的关系与原文片段结合起来。", cite: "讲义 4.1",
            example: "局部：从“劉知幾”节点出发，取回与它相连的“史德”“心術”所在片段。",
            explain: "选哪种方式取决于问题类型，见 D20。", links: [["D20", "何时值得用图"]] },
        ],
      },
      {
        name: "代价", tag: "4.1、4.3", short: "反复调用大模型",
        quote: "抽取实体和写社区摘要都要反复调用大模型。", cite: "讲义 4.1",
        subs: [
          { name: "成本与评价", quote: "为播客数据集建图花了 281 分钟。……论文所说的“更好”，是让大模型成对比较两种方法的回答在全面性、多样性等方面的优劣，而不是在历史研究中检验过的效果。", cite: "讲义 4.1",
            example: "本页的预跑结果与 API 试跑都只覆盖《史德》或所选片段，不是全量索引。",
            explain: "在小范围上先看清每一步产出，再决定是否值得建图。", links: [["D20", "何时值得用图"]] },
        ],
      },
    ],
  },
  D21: {
    lead: "讲义 5.1：多个各有专长的部件围绕一块共享的“黑板”协作；蚂蚁系统则让许多简单个体通过路线上的信息素协作。两者的区别在于共享的是什么。",
    stages: [
      {
        name: "Blackboard System", tag: "Nii 1986", short: "knowledge sources · blackboard · control",
        quote: "“There is a global database called the blackboard, and there are logically independent sources of knowledge called the knowledge sources. The knowledge sources respond to changes on the blackboard.”（有一个称为“黑板”的全局数据库，以及若干在逻辑上相互独立、称为“知识源”的知识来源；知识源对黑板上的变化作出响应。）", cite: "H. P. Nii, “Blackboard Systems”, AI Magazine 7(2), 1986, p. 39, Figure 1 图注",
        subs: [
          { name: "The knowledge sources", quote: "“The knowledge needed to solve the problem is partitioned into knowledge sources, which are kept separate and independent.”（解题所需的知识被分成若干知识源，彼此分开、相互独立。）", cite: "Nii 1986, p. 39",
            example: "本页三个知识源：KS1 关键词检索（写回片段）；KS2 异称归并（写回人物）；KS3 证据检查（写回缺口）。",
            explain: "知识源之间不直接调用，也不知道彼此的存在。", links: [] },
          { name: "The blackboard data structure", quote: "“The problem-solving state data are kept in a global database, the blackboard. … Communication and interaction among the knowledge sources take place solely through the blackboard.”（解题过程的状态数据保存在全局数据库即黑板中……知识源之间的交流与互动只通过黑板进行。）", cite: "Nii 1986, p. 39",
            example: "黑板分三层：片段层、人物与概念层、论断与缺口层；每条写入都带片段 ID。",
            explain: "讲义 5.1：黑板上写的是明确的中间结论，读黑板的人能看懂别人写了什么。", links: [] },
          { name: "Control", quote: "“The knowledge sources respond opportunistically to changes in the blackboard.”（知识源随黑板上的变化伺机响应。）脚注：“There is no control component specified in the blackboard model.”（黑板模型本身并未规定控制部件。）", cite: "Nii 1986, p. 39 及注6",
            example: "本页的控制：每一步看黑板上最新的变化，挑一个前提已满足的知识源执行；没有可执行者时停止。",
            explain: "控制放在哪里，是具体黑板系统的设计选择，不是模型本身规定的。", links: [] },
          { name: "第一个黑板系统与近年用法", quote: "“The first blackboard system was the HEARSAY-II speech understanding system.”（第一个黑板系统是 HEARSAY-II 语音理解系统。）", cite: "Nii 1986，摘要；近年用法见 Salemi 等，arXiv:2510.01285（2025）",
            example: "2025 年 Salemi 等把黑板用于大模型多智能体：中心智能体“posts requests to a shared blackboard”，其他智能体“volunteer to respond based on their capabilities”。",
            explain: "近年论文的图另列，标明年代；本页“API 试跑”采用的是这一近年做法的课堂适配。", links: [] },
        ],
      },
      {
        name: "The Ant System", tag: "Dorigo 等 1996", short: "transition probability · trail · evaporation",
        quote: "“The main characteristics of this model are positive feedback, distributed computation, and the use of a constructive greedy heuristic.”（这一模型的主要特点是正反馈、分布式计算，以及使用一种构造性的贪心启发式。）", cite: "Dorigo, Maniezzo, Colorni, IEEE TSMC-B 26(1), 1996，摘要",
        subs: [
          { name: "转移概率", quote: "“it chooses the town to go to with a probability that is a function of the town distance and of the amount of trail present on the connecting edge”（它按一个概率选择下一座城市，这个概率取决于城市间的距离和连接边上的信息素量。）", cite: "Dorigo 等 1996，第3节",
            example: "本页把检索取回的若干片段当作“城市”，片段间距离 d = 1 − 字二元组杰卡德系数。",
            explain: "p_ij ∝ τ_ijᵅ · η_ijᵝ，η_ij = 1/d_ij（原文称 visibility）；已走过的点记入 tabu list，不再访问。", links: [["D11", "集合度量"]] },
          { name: "信息素沉积与挥发", quote: "“ρ is a coefficient such that (1 − ρ) represents the evaporation of trail between time t and t+n”（ρ 是一个系数，1 − ρ 表示从 t 到 t+n 之间信息素的挥发。）", cite: "Dorigo 等 1996，第3节，式(1)—(3)",
            example: "每只蚂蚁走完一圈后，在所经边上沉积 Q/L_k；路线越短，沉积越多。",
            explain: "τ_ij(t+n) = ρ·τ_ij(t) + Δτ_ij。共享的只是边上的数量化痕迹，好路线在多次往返中涌现。", links: [] },
          { name: "放到检索上", quote: "前者像多位研究者在同一份研究笔记上分工补充，后者像许多次检索的结果不断加权某些材料之间的联系。", cite: "讲义 5.1",
            example: "本页的任务：在取回的片段上找一条首尾衔接最紧（总距离最短）的阅读顺序，即原文所解的旅行商问题。",
            explain: "求出的是阅读顺序，不是历史关系；信息素多的边只说明字面衔接更紧。", links: [] },
        ],
      },
      {
        name: "三类问题", tag: "讲义 5.1", short: "检索和引用标记查不出的错误",
        quote: "智能体检索得再勤，模型也会用自己“知道得太多”的那部分通用知识去组织材料，而这恰恰是检索和引用标记都查不出来的错误：每一句都可能有出处，整体框架却不是材料本身的。", cite: "讲义 5.1",
        subs: [
          { name: "演进趋势的形式化", quote: "只在形式上把各种主题的研究按时间顺序填进一条发展趋势，不顾各领域同步发展的实态。", cite: "讲义 5.1 转述",
            example: "把三位作者排成“从章學誠到阿克顿再到森鴎外”的一条演进线，而三文分属不同传统、不同体裁。",
            explain: "看回答有没有为了描述转变而制造转变。", links: [["D22", "对照实践"]] },
          { name: "时间意识上的趋新化", quote: "片面地以“新”为“好”，忽视学术史追溯渊源的要求，把多数领域的发展节点延后。", cite: "讲义 5.1 转述",
            example: "只因阿克顿在 1895 年、森鴎外在 1915 年，就把“史料批判”的起点放到他们身上。",
            explain: "看回答有没有忽视渊源，把节点往后推。", links: [] },
          { name: "知识结构上的严重偏颇", quote: "用西方学术话语掩盖了日本学界自身的语境……用了一个语料原文中根本没有出现过的概念给相关研究归类。", cite: "讲义 5.1 转述",
            example: "用“客观主义史学”一类材料中没有出现的概念，统括三段原文。",
            explain: "看回答所用的分类概念，是否在材料原文里出现过。", links: [] },
        ],
      },
    ],
  },
};
