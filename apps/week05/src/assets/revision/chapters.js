/* 第五周 D01、D02、D10、D18、D21 的阶段卡数据。
 * 每张卡：讲义原句（照抄，注节次）、本讲材料中的具体例子、简短解释、去往演示页的链接。
 * 讲义原句均摘自《第五讲 知识库检索与有依据的生成》讲义（2026-10-14 稿）；外文论文原句另注出处。
 * D21“三类问题”只录讲义转述，不录未刊稿原文与题名。 */
window.W5_CHAPTERS = {
  "D01": {
    "lead": "RAG 的发展大致可以分成四个阶段；前三个阶段的名称据 Gao 等人的综述，第四阶段据助教概括。",
    "stages": [
      {
        "name": "朴素 RAG",
        "tag": "第三周",
        "short": "索引 → 检索 → 生成",
        "quote": "朴素 RAG 就是上面说的索引—检索—生成，第三周我们走过的就是这一种。",
        "cite": "讲义·导入",
        "subs": [
          {
            "name": "索引",
            "quote": "索引发生在提问之前：系统把我们提供的材料切成一个个片段，把每个片段转换成可以比较的表示（词项统计或向量），再把这些表示组织成便于查找的索引，就像为一批书编好目录和卡片。",
            "cite": "讲义·导入",
            "example": "《史德》上海書店影印本印刷页63—64，按段切成10个片段（S1—S6b）；每段各算一组 BM25 词项权重和一个 384 维 MiniLM 向量。",
            "explain": "索引一旦建好，后面能取回的就只是这些片段。切在哪里、用什么表示，在提问之前已经决定。",
            "links": [
              [
                "D04",
                "切分实验"
              ],
              [
                "D10",
                "表示与度量"
              ]
            ],
            "paper": {
              "en": "Indexing starts with the cleaning and extraction of raw data in diverse formats like PDF, HTML, Word, and Markdown, which is then converted into a uniform plain text format. To accommodate the context limitations of language models, text is segmented into smaller, digestible chunks.",
              "zh": "索引始于对 PDF、HTML、Word、Markdown 等不同格式原始数据的清理与抽取，再转为统一的纯文本格式。为了适应语言模型上下文长度的限制，文本被切分为更小、便于处理的块。",
              "cite": "Gao 等，arXiv:2312.10997v5，§II-A",
              "note": "原文接着说，各块再由嵌入模型编码为向量，存入向量数据库。本讲 D04—D09 讨论的正是这里“切分为块”这一步。"
            }
          },
          {
            "name": "检索",
            "quote": "检索发生在提问之时：问题本身也被转换成同样的表示，系统按相似程度从索引中取回最相近的若干片段，必要时再重新排序。",
            "cite": "讲义·导入",
            "example": "查询“史德與心術”在《史德》十段上做 BM25，排在第一的是含“能具史識者。必知史德”的 S4。",
            "explain": "相似程度由所选表示与度量算出，不是史实可信度；排在前面也只是字面或向量更近。",
            "links": [
              [
                "D10",
                "实际排序"
              ],
              [
                "D15",
                "取回、进入、使用"
              ]
            ],
            "paper": {
              "en": "Upon receipt of a user query, the RAG system employs the same encoding model utilized during the indexing phase to transform the query into a vector representation. It then computes the similarity scores between the query vector and the vector of chunks within the indexed corpus.",
              "zh": "收到用户查询后，RAG 系统用索引阶段所用的同一个编码模型把查询转为向量表示，再计算查询向量与已索引语料中各块向量之间的相似度分数。",
              "cite": "Gao 等，arXiv:2312.10997v5，§II-A",
              "note": "综述以稠密向量为例描述检索；本讲 D10 同时演示 BM25 等稀疏表示。原文下一句：系统取相似度最高的前 K 块，作为提示中扩充的上下文。"
            }
          },
          {
            "name": "生成",
            "quote": "生成发生在最后：取回的片段连同问题一起放进大模型这一次的输入，模型据此写出回答，并标出每句依据哪一段。",
            "cite": "讲义·导入",
            "example": "错例回答：“章學誠、阿克顿與森鴎外都認為歷史敘述必須完全服從史料。”句子流畅，也可以附上三处引文。",
            "explain": "标了引文，只说明它指向了某处；那一处是否支持这句话，要回去读。",
            "links": [
              [
                "D16",
                "三级支持判定"
              ],
              [
                "D17",
                "回到错例"
              ]
            ],
            "paper": {
              "en": "The posed query and selected documents are synthesized into a coherent prompt to which a large language model is tasked with formulating a response.",
              "zh": "所提的查询与选出的文档被合成为一个连贯的提示，由大语言模型据此形成回答。",
              "cite": "Gao 等，arXiv:2312.10997v5，§II-A",
              "note": "原文还指出，模型可以动用自身参数中的知识，也可以只依据所给文档作答——这正是第三节要逐句核查“回答依据哪一段”的原因。"
            }
          }
        ],
        "paper": {
          "en": "The Naive RAG follows a traditional process that includes indexing, retrieval, and generation, which is also characterized as a “Retrieve-Read” framework.",
          "zh": "朴素 RAG 遵循包括索引、检索与生成在内的传统流程，这一流程也被称为“先检索、后阅读”（Retrieve-Read）框架。",
          "cite": "Gao 等，“Retrieval-Augmented Generation for Large Language Models: A Survey”，arXiv:2312.10997v5（2024-03），§II-A Naive RAG",
          "note": "“朴素 RAG”是 Gao 等综述为最早一类做法所取的名称。RAG 一词本身出自 Lewis 等 2020 年的论文（arXiv:2005.11401），原指把预训练模型的“参数记忆”与可检索的“非参数记忆”结合起来。"
        }
      },
      {
        "name": "高级 RAG",
        "tag": "本讲 2.3",
        "short": "检索前改写，检索后重排",
        "quote": "Yunfan Gao 等人 2023 年发布的综述……把前三个阶段概括为“the Naive RAG, the Advanced RAG, and the Modular RAG”（朴素 RAG、高级 RAG 与模块化 RAG）。",
        "cite": "讲义·导入；Gao 等，arXiv:2312.10997",
        "subs": [
          {
            "name": "检索前：查询重写",
            "quote": "高级 RAG 在检索前后各加一道工序：检索前改写查询，检索后重新排序。",
            "cite": "讲义·导入",
            "example": "问题“章學誠怎样看待史家的立场”与原文“謂著書者之心術也”字面几乎没有重合；HyDE 先写一段假想答案，再用它去找真实片段。",
            "explain": "假想答案只作检索线索，用完即弃，不能进入引文位置。",
            "links": [
              [
                "D13",
                "查询重写与 HyDE"
              ]
            ],
            "paper": {
              "en": "While the goal of query optimization is to make the user’s original question clearer and more suitable for the retrieval task. Common methods include query rewriting query transformation, query expansion and other techniques.",
              "zh": "查询优化的目标，则是让用户的原始问题更清楚、更适合检索任务；常见方法包括查询重写、查询变换、查询扩展等。",
              "cite": "Gao 等，arXiv:2312.10997v5，§II-B Pre-retrieval process",
              "note": "原文“query rewriting query transformation”之间缺一个逗号，照录。HyDE（Gao, Ma, Lin, Callan, arXiv:2212.10496）属于其中的查询变换一类。"
            }
          },
          {
            "name": "检索后：重排与去重",
            "quote": "第一步追求“找得全”，从大集合里快速取出几十到上百个候选；第二步追求“排得准”，在少量候选上花更多计算重新排序。",
            "cite": "讲义 2.3",
            "example": "阿克顿演讲 1911 年重印本扫描页（印刷页40—42）与 Gutenberg 电子文本，在机器看来是近似重复。",
            "explain": "去重之前先看两段来自哪两个版本；版本差异可能正是研究对象。",
            "links": [
              [
                "D14",
                "重排与去重"
              ]
            ],
            "paper": {
              "en": "The main methods in post-retrieval process include rerank chunks and context compressing.",
              "zh": "检索后处理的主要方法包括对块重新排序和压缩上下文。",
              "cite": "Gao 等，arXiv:2312.10997v5，§II-B Post-Retrieval Process",
              "note": "综述的重排着眼于把最相关的内容放到提示的两端；本讲 D14 另讨论去重，并提醒去重前先看版本。"
            }
          }
        ],
        "paper": {
          "en": "Advanced RAG introduces specific improvements to overcome the limitations of Naive RAG. Focusing on enhancing retrieval quality, it employs pre-retrieval and post-retrieval strategies.",
          "zh": "高级 RAG 针对朴素 RAG 的局限作了具体改进：着眼于提高检索质量，采用检索前与检索后两类策略。",
          "cite": "Gao 等，arXiv:2312.10997v5，§II-B Advanced RAG",
          "note": "综述所说的“检索前”同时包括优化索引结构与优化原始查询两件事；本讲只取查询一侧（2.3 节的查询重写与 HyDE）。"
        }
      },
      {
        "name": "模块化 RAG",
        "tag": "本讲第四节",
        "short": "各环节拆成可替换的部件",
        "quote": "模块化 RAG 把各个环节拆成可以替换、可以重新组合的部件，同一团队 2024 年的论文形容为“decomposing complex RAG systems into independent modules and specialized operators”（把复杂的 RAG 系统拆成独立的模块和专门的算子）。",
        "cite": "讲义·导入；Gao 等，arXiv:2407.21059",
        "subs": [
          {
            "name": "换掉表示与度量",
            "quote": "前者决定“拿什么去比”，后者决定“怎样算相近”。",
            "cite": "讲义 2.1",
            "example": "同一查询、同一批片段，把 BM25 换成多语句向量，跨语种的阿克顿与森鴎外段落才可能排进来。",
            "explain": "模块可以替换，替换的是哪一块要说清楚：换的是表示，还是度量。",
            "links": [
              [
                "D10",
                "表示与度量"
              ],
              [
                "D11",
                "集合度量"
              ]
            ],
            "paper": {
              "en": "The modular RAG architecture advances beyond the former two RAG paradigms, offering enhanced adaptability and versatility.",
              "zh": "模块化 RAG 架构超越了前两种 RAG 范式，提供了更强的适应性与多用性。",
              "cite": "Gao 等，arXiv:2312.10997v5，§II-C Modular RAG",
              "note": "综述所举的新模块包括搜索、多查询融合（RAG-Fusion）、记忆、路由等；“换掉表示与度量”是本讲为课堂演示所作的具体化。"
            }
          },
          {
            "name": "换掉索引结构",
            "quote": "GraphRAG 是在模块化思路下换掉索引结构的一种做法。",
            "cite": "讲义·导入",
            "example": "《史德》开篇的“劉氏子元”“劉氏”与刘知幾，在图里可以成为一个节点，也可能成为三个互不相干的节点。",
            "explain": "图结构为整批材料的关系问题服务，建图本身又引入实体消解这一新的判断。",
            "links": [
              [
                "D18",
                "GraphRAG"
              ],
              [
                "D19",
                "实体消解"
              ]
            ],
            "paper": {
              "en": "Modular RAG transcends the traditional linear architecture, embracing a more advanced design that integrates routing, scheduling, and fusion mechanisms.",
              "zh": "模块化 RAG 超越了传统的线性架构，采用整合路由、调度与融合机制的更高级设计。",
              "cite": "Gao 等，arXiv:2407.21059v1，摘要",
              "note": "该文没有专论图结构索引；讲义把 GraphRAG 放在“模块化思路下换掉索引结构”的位置，是本讲的归类。"
            }
          }
        ],
        "paper": {
          "en": "By decomposing complex RAG systems into independent modules and specialized operators, it facilitates a highly reconfigurable framework.",
          "zh": "通过把复杂的 RAG 系统拆分为独立的模块与专门的算子，它促成了一种高度可重新配置的框架。",
          "cite": "Gao、Xiong、Wang、Wang，“Modular RAG: Transforming RAG Systems into LEGO-like Reconfigurable Frameworks”，arXiv:2407.21059v1（2024），摘要",
          "note": "同一团队此前的综述（arXiv:2312.10997，§II-C）已把模块化 RAG 列为第三个范式；2024 年这篇专论进一步把常见流程归为线性、条件、分支、循环四种模式。"
        }
      },
      {
        "name": "智能体的基础设施",
        "tag": "本讲第五节",
        "short": "模块打散，作为工具调用",
        "quote": "到了现在，RAG 又成了智能体的基础设施：原来的各个模块被打散，作为工具交给智能体调用，不再是一条独立的流水线。",
        "cite": "讲义·导入（第四阶段据助教概括）",
        "subs": [
          {
            "name": "检索成为工具",
            "quote": "通用智能体则把检索做成可调用的工具之一，由模型在每一步决定下一步做什么，这是目前的主流实现。",
            "cite": "讲义 5.1",
            "example": "同一问题、同一库、同一预算：固定路径检索一次；工具路径由模型自己改写查询、决定检索几次。",
            "explain": "步骤更多、路径每次可能不同；运行记录要逐次保存，才能比较。",
            "links": [
              [
                "D22",
                "对照实践"
              ]
            ],
            "paper": {
              "en": "These agents leverage agentic design patterns reflection, planning, tool use, and multi-agent collaboration to dynamically manage retrieval strategies, iteratively refine contextual understanding, and adapt workflows through operational structures ranging from sequential steps to adaptive collaboration.",
              "zh": "这些智能体运用反思、规划、工具使用与多智能体协作等智能体设计模式，动态管理检索策略，迭代地深化对上下文的理解，并通过从顺序步骤到自适应协作的各种运作结构来调整工作流程。",
              "cite": "Singh 等，arXiv:2501.09136v4，摘要",
              "note": "原文“design patterns”与所列四项之间没有标点，照录。D22 的“工具调用路径”只演示其中的工具使用一项。"
            }
          },
          {
            "name": "围绕共用结构协作",
            "quote": "复杂的学术问题可以交给多个智能体：它们共用同一个知识库和同一份数据结构，各自搜索，把发现写回这份结构，再从中读取别人的发现。",
            "cite": "讲义 5.1（助教的概括）",
            "example": "黑板上依次写下取回的片段、归并的称呼和尚缺的证据；各个知识源只读写黑板。",
            "explain": "每一句都可能有出处，整体框架却不一定来自材料；这是检索和引用标记查不出的错误。",
            "links": [
              [
                "D21",
                "黑板与蚂蚁系统"
              ]
            ],
            "paper": {
              "en": "The first blackboard system was the HEARSAY-II speech understanding system.",
              "zh": "第一个黑板系统是 HEARSAY-II 语音理解系统。",
              "cite": "Nii, “Blackboard Systems”, AI Magazine 7(2), 1986，摘要",
              "note": "讲义 5.1 把“多智能体＋共用数据结构”与黑板架构相联系，这一概括出自助教；黑板模型本身是 1970—80 年代的人工智能架构，详见 D21。"
            }
          }
        ],
        "paper": {
          "en": "Agentic Retrieval-Augmented Generation (Agentic RAG) transcends these limitations by embedding autonomous AI agents into the RAG pipeline.",
          "zh": "智能体式检索增强生成（Agentic RAG）把自主的 AI 智能体嵌入 RAG 流程，从而突破了这些局限。",
          "cite": "Singh 等，“Agentic Retrieval-Augmented Generation: A Survey on Agentic RAG”，arXiv:2501.09136v4（2026-04），摘要",
          "note": "“这些局限”指上一句所说传统 RAG 的静态流程，缺乏多步推理与复杂任务所需的适应性。讲义所说“成为智能体的基础设施”是助教的概括，不是该综述的原话。"
        }
      }
    ]
  },
  "D02": {
    "lead": "错例：“章學誠、阿克顿與森鴎外都認為歷史敘述必須完全服從史料。”要使这句判断成立，至少要分开检查四个部分。",
    "stages": [
      {
        "name": "一　材料入库",
        "tag": "第一节 1.1",
        "short": "库里是不是我们想给它看的那个版本",
        "quote": "其一，我们给AI提供的三份材料是否成功入库，从它包含的各项字段信息来看，它是否就是我们想要给AI看的那个版本？",
        "cite": "讲义·导入",
        "subs": [
          {
            "name": "版本",
            "quote": "换言之，“库里有这篇”并不等于“库里有初刊”，回答中引用的位置，也只能是所收版本中的位置。",
            "cite": "讲义 1.1",
            "example": "森鴎外一文初刊于1915年1月《心の花》；库里收的是筑摩書房1964年《現代文学大系》第4卷的扫描页，印刷页480—482。",
            "explain": "错例里“森鴎外認為”的“認為”，只能落到所收版本的具体位置上。",
            "links": [
              [
                "D03",
                "材料身份"
              ]
            ]
          },
          {
            "name": "范围",
            "quote": "如果某份材料根本没有入库，系统找不到相关内容，只能说明“本库未收”，不能推出“作者没有这样说过”。",
            "cite": "讲义 1.1",
            "example": "阿克顿只收了1911年重印本印刷页40—45；演讲其余部分不在库里。",
            "explain": "“都認為”是对三位作者的全称判断，而库只收了每人的一小段。",
            "links": [
              [
                "D03",
                "材料身份"
              ]
            ]
          }
        ]
      },
      {
        "name": "二　取回片段",
        "tag": "第一节 1.2—1.3",
        "short": "取回的是哪几段，有没有漏掉语境",
        "quote": "其二，机器实际上取回的内容是哪几段文字，有没有漏掉限定语境的上下文，或者漏掉其它有关联的文段？",
        "cite": "讲义·导入",
        "subs": [
          {
            "name": "切点",
            "quote": "如果切分把第三段单独切成一块，系统取回的就只是“不愿改动史料”这一表态，而这一表态针对的是他自己的历史小说，这个对象是在第一段交代的。",
            "cite": "讲义 1.3",
            "example": "森鴎外 M3：“わたくしは史料を調べて見て、其中に窺はれる「自然」を尊重する念を発した。”对象在 M1：“歴史上の人物を取り扱つた作品”。",
            "explain": "错例把一位小说家对自身创作的说明，概括成了对一般历史写作的主张。",
            "links": [
              [
                "D04",
                "切分实验"
              ],
              [
                "D06",
                "语义切分及研究结论"
              ]
            ]
          },
          {
            "name": "证据分布",
            "quote": "回答“章學誠的要求是什么”至少需要 ② 与 ③；说明“为什么要提史德”还需要 ①。",
            "cite": "讲义 1.3 图",
            "example": "《史德》：①“猶未足以盡其理”（对象）②“德者何。謂著書者之心術也”（定义）③“盡其天而不益以人”（要求）。",
            "explain": "只取回 ②，能说“章學誠重视心术”，说不出这一说针对谁、要求什么。",
            "links": [
              [
                "D09",
                "一句回答需要几个片段"
              ]
            ]
          }
        ]
      },
      {
        "name": "三　进入上下文",
        "tag": "第三节 3.1",
        "short": "取回的片段是否真的进了这一次输入",
        "quote": "其三，机器取回的片段是否真正进入并影响了模型这一次的输入？",
        "cite": "讲义·导入",
        "subs": [
          {
            "name": "取回、进入、使用",
            "quote": "因此“取回了”不等于“进入了”，“进入了”也不等于“被用了”。漏检出在哪一步，补救办法就不同。",
            "cite": "讲义 3.1",
            "example": "查询“史德與心術”在《史德》十段上的 BM25 实际排序为 S4、S6b、S5、S6……；上下文预算为3段时，含“盡其天而不益以人”的 S6 排第4，没有进入输入。",
            "explain": "要记录的是实际输入的片段 ID 与原文，而不只是检索结果。",
            "links": [
              [
                "D15",
                "取回、进入、使用"
              ]
            ]
          },
          {
            "name": "检索单位与引用单位",
            "quote": "检索的单位和引用的单位不必相同。",
            "cite": "讲义 3.1",
            "example": "用较小的块检索；取回后补入相邻段；回答中只指向支持判断的那一句。",
            "explain": "三个单位各有用途，分开设计，才能既找得准，又说得清依据。",
            "links": [
              [
                "D08",
                "片段怎样带上上下文"
              ]
            ]
          }
        ]
      },
      {
        "name": "四　概括有据",
        "tag": "第三节 3.2",
        "short": "“都認為”“完全服從”是否有原文支持",
        "quote": "其四，“都认为”“完全服从”这样的概括，是三段原文共同支持的，还是模型在拼接时添加的？",
        "cite": "讲义·导入",
        "subs": [
          {
            "name": "三级判定",
            "quote": "“完全服从”一语在三段材料中都找不到依据。按三级判断，这句话即使附上三处引文，每一处也至多是部分支持。",
            "cite": "讲义 3.2",
            "example": "章學誠要求“盡其天而不益以人”；阿克顿追问所读文字是否出自作者原本；森鴎外说的是写自己的历史小说时不愿随意改动史料。",
            "explain": "三段谈的不是同一件事，“都認為”要求三段各自支持同一个判断。",
            "links": [
              [
                "D16",
                "三级支持判定"
              ],
              [
                "D17",
                "回到错例"
              ]
            ]
          },
          {
            "name": "框架是否来自材料",
            "quote": "每一句都可能有出处，整体框架却不是材料本身的。",
            "cite": "讲义 5.1",
            "example": "“历史叙述必须服从史料”这一框架，在三段原文中都没有以这种形式出现。",
            "explain": "逐句核读之外，还要问整体概括从哪里来。",
            "links": [
              [
                "D21",
                "三类问题"
              ]
            ]
          }
        ]
      }
    ]
  },
  "D10": {
    "lead": "表示，是把文字变成可以比较的对象；度量，是规定怎样比较两个对象，例如余弦。",
    "stages": [
      {
        "name": "稀疏表示",
        "tag": "第三周回顾",
        "short": "认字面：词袋、TF-IDF、BM25",
        "quote": "稀疏表示认字面，写法不同的词毫无共同之处；稠密表示认意思，但对专名和罕见词不如关键词检索精确。",
        "cite": "讲义 2.1",
        "subs": [
          {
            "name": "词袋与 TF-IDF",
            "quote": "从独热编码、词袋、TF-IDF 与 BM25，到 word2vec 的词向量和跨语言映射……",
            "cite": "讲义 2.1",
            "example": "查询“史德與心術”拆成“史、德、與、心、術”五个字；简体“心术”的“术”与原文“術”不算同一个字。",
            "explain": "词袋只数出现次数；TF-IDF 再按全库稀有程度加权。",
            "links": [
              [
                "D11",
                "集合度量"
              ]
            ],
            "paper": {
              "en": "In other words, tf-idf assigns to term t a weight in document d that is highest when t occurs many times within a small number of documents (thus lending high discriminating power to those documents).",
              "zh": "换言之，tf-idf 给文档 d 中词项 t 的权重，在 t 于少数文档中多次出现时最高（从而使这些文档具有很强的区分力）。",
              "cite": "Manning 等，Introduction to Information Retrieval，§6.2.2 Tf-idf weighting",
              "note": "在线版正文中“tf-idf”与 t、d 为公式符号，此处按原文语义补出。逆文档频率的思想通常追溯到 Spärck Jones 1972 年《Journal of Documentation》第 28 卷第 11—21 页的论文。"
            }
          },
          {
            "name": "BM25",
            "quote": "BM25 则是一种打分函数，直接根据词频、词的稀有程度和文档长度给文档打分。",
            "cite": "讲义 2.1",
            "example": "右侧选“BM25”实际计算：每段列出参与打分的字与各自贡献。",
            "explain": "词频有饱和，长段落按平均长度校正；参数 k₁、b 见讲义图“几种相似度度量的比较”。",
            "links": [],
            "paper": {
              "en": "The Probabilistic Relevance Framework (PRF) is a formal framework for document retrieval, grounded in work done in the 1970–1980s, which led to the development of one of the most successful text-retrieval algorithms, BM25.",
              "zh": "概率相关性框架（PRF）是一个形式化的文档检索框架，奠基于 1970—80 年代的工作，并由此发展出最成功的文本检索算法之一 BM25。",
              "cite": "Robertson、Zaragoza，“The Probabilistic Relevance Framework: BM25 and Beyond”，Foundations and Trends in Information Retrieval 3(4), 2009, DOI 10.1561/1500000019，摘要",
              "note": "本页 BM25 取 k₁=1.2、b=0.75，是常用默认值；中文、日文按单字切成词项，没有分词。"
            }
          }
        ],
        "paper": {
          "en": "In this view of a document, known in the literature as the bag of words model, the exact ordering of the terms in a document is ignored but the number of occurrences of each term is material (in contrast to Boolean retrieval).",
          "zh": "在这种看待文档的方式（文献中称为词袋模型）下，词项在文档中的确切顺序被忽略，但每个词项出现的次数是要紧的（这与布尔检索不同）。",
          "cite": "Manning、Raghavan、Schütze，Introduction to Information Retrieval，剑桥大学出版社 2008，§6.2 在线版",
          "note": "同节举例：“Mary is quicker than John”与“John is quicker than Mary”在词袋看来完全相同。稀疏表示由此得名：向量长度等于词表大小，大多数分量为零。"
        }
      },
      {
        "name": "稠密表示",
        "tag": "第三周回顾",
        "short": "认意思：句向量与余弦",
        "quote": "余弦既可以用在词频向量上，也可以用在嵌入向量上。",
        "cite": "讲义 2.1",
        "subs": [
          {
            "name": "句向量",
            "quote": "再到 Sentence-BERT 的句向量、SPLADE 的神经稀疏表示，以及以大语言模型为基础的嵌入。",
            "cite": "讲义 2.1",
            "example": "本页在浏览器里实际运行 paraphrase-multilingual-MiniLM-L12-v2（q8），每段得到 384 维向量。",
            "explain": "向量间的余弦用于排序，不是史实置信度。",
            "links": [
              [
                "D06",
                "断点式语义切分"
              ]
            ],
            "paper": {
              "en": "This reduces the effort for finding the most similar pair from 65 hours with BERT / RoBERTa to about 5 seconds with SBERT, while maintaining the accuracy from BERT.",
              "zh": "这把找出最相似句对所需的工作量，从 BERT／RoBERTa 的 65 小时降到 SBERT 的约 5 秒，同时保持了 BERT 的准确度。",
              "cite": "Reimers、Gurevych，arXiv:1908.10084，摘要",
              "note": "“65 小时”指在一万句中两两比较的情形；句向量可以事先算好、存入索引，检索时只比较向量。"
            }
          }
        ],
        "paper": {
          "en": "In this publication, we present Sentence-BERT (SBERT), a modification of the pretrained BERT network that use siamese and triplet network structures to derive semantically meaningful sentence embeddings that can be compared using cosine-similarity.",
          "zh": "本文提出 Sentence-BERT（SBERT），它改造预训练的 BERT 网络，采用孪生与三元组网络结构，得到有语义意义、可用余弦相似度比较的句子嵌入。",
          "cite": "Reimers、Gurevych，“Sentence-BERT”，EMNLP 2019，arXiv:1908.10084，摘要",
          "note": "原文“that use”照录（主语为 modification，应作 uses）。本页实际运行的 MiniLM 模型即由 sentence-transformers 项目训练发布。"
        }
      },
      {
        "name": "多语表示",
        "tag": "本讲",
        "short": "中文问题能否找到日文、英文材料",
        "quote": "本讲的库同时有中文、日文和英文，嵌入模型是否多语，决定了用中文问题能不能找到日文和英文材料；这种漏检与切分、排序都无关。",
        "cite": "讲义 2.1",
        "subs": [
          {
            "name": "跨语种",
            "quote": "若是拿英文查询去比中文文本，无论按字还是按字二元组，交集都是空的，系数恒为零，这时只能依靠多语嵌入（2.1）。",
            "cite": "讲义 2.2",
            "example": "材料选“本页可用全部材料”，查询“历史叙述与史料的关系”：BM25 只能给含相同汉字的段落打分；多语句向量会给每一段都算出余弦，可在右侧对照两种结果。",
            "explain": "命中之后仍须回到原语、所用版本与印刷页。",
            "links": [],
            "paper": {
              "en": "We demonstrate the effectiveness of our approach for 50+ languages from various language families.",
              "zh": "我们在来自不同语系的五十多种语言上展示了这一方法的有效性。",
              "cite": "Reimers、Gurevych，arXiv:2004.09813，摘要",
              "note": "评测用的是现代语言的平行语料；对古典汉语、候文的效果，需要在本课材料上自己检验。"
            }
          }
        ],
        "paper": {
          "en": "The training is based on the idea that a translated sentence should be mapped to the same location in the vector space as the original sentence.",
          "zh": "训练所依据的想法是：一句话的译文应当被映射到向量空间中与原句相同的位置。",
          "cite": "Reimers、Gurevych，“Making Monolingual Sentence Embeddings Multilingual using Knowledge Distillation”，EMNLP 2020，arXiv:2004.09813，摘要",
          "note": "本页所用 paraphrase-multilingual-MiniLM-L12-v2 正是用这一方法得到的多语模型；“同一位置”是训练目标，不保证文言、候文这类训练中少见的文体也能对齐。"
        }
      },
      {
        "name": "BGE-M3",
        "tag": "本讲补充",
        "short": "一个模型给出三种检索功能",
        "quote": "“can simultaneously accomplish the three common retrieval functionalities”（能同时完成三种常见的检索功能），即稠密检索、多向量检索和稀疏检索。",
        "cite": "讲义 2.1；Chen 等，arXiv:2402.03216",
        "subs": [
          {
            "name": "本页的范围",
            "quote": "同一个模型既给出一个认意思的稠密向量，也给出一组认字面的词项权重，第三周讲的混合检索可以在一个模型内部完成。",
            "cite": "讲义 2.1",
            "example": "本页没有载入 BGE-M3；实际运行的是 MiniLM 多语模型与浏览器内 BM25。",
            "explain": "页面只演示实际运行了的模型，不以 MiniLM 冒称 BGE-M3。",
            "links": [],
            "paper": {
              "en": "It provides a uniform support for the semantic retrieval of more than 100 working languages.",
              "zh": "它为一百多种工作语言的语义检索提供统一支持。",
              "cite": "Chen 等，arXiv:2402.03216v5，摘要",
              "note": "讲义 2.1 引的是同一摘要。"
            }
          }
        ],
        "paper": {
          "en": "It can simultaneously accomplish the three common retrieval functionalities: dense retrieval, multi-vector retrieval, and sparse retrieval.",
          "zh": "它能同时完成三种常见的检索功能：稠密检索、多向量检索与稀疏检索。",
          "cite": "Chen 等，“M3-Embedding”，arXiv:2402.03216v5，摘要",
          "note": "同一摘要称其支持一百多种语言、最长 8,192 词元的输入。本页没有载入 BGE-M3，实际运行的是 MiniLM 与浏览器内 BM25。"
        }
      }
    ]
  },
  "D18": {
    "lead": "线性的 RAG 擅长回答“某处说了什么”，却难以回答面向整批材料的问题，因为它每次只取回与问题最相似的少数几段。",
    "stages": [
      {
        "name": "为什么需要图",
        "tag": "4.1",
        "short": "全局问题不在任何一个片段里",
        "quote": "“RAG fails on global questions directed at an entire text corpus”（RAG 在针对整个语料的全局性问题上会失败）。",
        "cite": "讲义 4.1；Edge 等，arXiv:2404.16130",
        "subs": [
          {
            "name": "全局问题",
            "quote": "可是有些问题的答案不在任何一个片段里，例如“这批材料中反复出现哪些人物和概念，它们之间是什么关系”。",
            "cite": "讲义第四节导语",
            "example": "“三份材料中反复出现哪些人物与概念？”——答案不在《史德》、阿克顿或森鴎外的任何一段里。",
            "explain": "向量检索只取最相似的几段，回答不了“整批材料讲了什么”。",
            "links": [],
            "paper": {
              "en": "Baseline RAG struggles with queries that require aggregation of information across the dataset to compose an answer.",
              "zh": "基线 RAG 难以处理那些需要汇总整个数据集中的信息才能作答的查询。",
              "cite": "Microsoft GraphRAG 官方文档，Query › Global Search（microsoft.github.io/graphrag/query/global_search/）",
              "note": "文档举的例子是“What are the top 5 themes in the data?”；原因是向量检索只按与问题的相似度取片段，“问题里没有任何东西把它引向正确的信息”。"
            }
          }
        ],
        "paper": {
          "en": "However, RAG fails on global questions directed at an entire text corpus, such as “What are the main themes in the dataset?”, since this is inherently a query-focused summarization (QFS) task, rather than an explicit retrieval task.",
          "zh": "然而，对于面向整个文本语料的全局性问题，例如“数据集的主要主题是什么？”，RAG 会失败，因为这类问题本质上是一项面向查询的摘要（QFS）任务，而不是一项明确的检索任务。",
          "cite": "Edge 等，“From Local to Global: A Graph RAG Approach to Query-Focused Summarization”，arXiv:2404.16130v2，摘要",
          "note": "讲义 4.1 只引了前半句。“面向查询的摘要”是信息检索中的一类任务：针对一个问题，对一批文档作有选择的概括。"
        }
      },
      {
        "name": "建索引",
        "tag": "4.1",
        "short": "抽实体与关系 → 社区 → 社区摘要",
        "quote": "“to derive an entity knowledge graph from the source documents, then to pregenerate community summaries”（先从原始文档中导出实体知识图谱，再预先生成社区摘要）。",
        "cite": "讲义 4.1；Edge 等",
        "subs": [
          {
            "name": "实体与关系",
            "quote": "建索引时，先用大语言模型从每个块中抽取人物、地点、概念等实体及其关系，构成一张知识图谱。",
            "cite": "讲义 4.1",
            "example": "右侧可实际在选中原文上建共现图；配置共用模型后，也可让模型抽取带逐字证据的关系。",
            "explain": "每条边要能回到片段 ID 与原话；共现不是史实关系。",
            "links": [
              [
                "D19",
                "实体消解"
              ]
            ],
            "paper": {
              "en": "In this step, the LLM is prompted to extract instances of important entities and the relationships between the entities from a given chunk.",
              "zh": "在这一步，大语言模型被提示从给定的块中抽取重要实体的实例及实体之间的关系。",
              "cite": "Edge 等，arXiv:2404.16130v2，§3.1.2",
              "note": "同节下文：“our analysis uses exact string matching for entity matching”（本文分析用精确字符串匹配来做实体匹配，§3.1.3）——这就是 D19 讨论实体消解的出发点。"
            }
          },
          {
            "name": "社区与摘要",
            "quote": "再用社区发现算法把图中联系紧密的实体分成若干群落，为每个群落预先写一份社区摘要。",
            "cite": "讲义 4.1",
            "example": "课堂图用标签传播实际划分社区；原实现用层级 Leiden 社区。",
            "explain": "摘要由模型写成，仍须回到最初所用片段核读。",
            "links": [],
            "paper": {
              "en": "In our pipeline, we use Leiden community detection (Traag et al., 2019) in a hierarchical manner, recursively detecting sub-communities within each detected community until reaching leaf communities that can no longer be partitioned.",
              "zh": "在我们的流程中，以层级方式使用 Leiden 社区发现算法（Traag 等，2019），在每个已发现的社区内递归地再找子社区，直到无法再划分的叶社区为止。",
              "cite": "Edge 等，arXiv:2404.16130v2，§3.1.4",
              "note": "本页右侧用的是更简单的标签传播算法，只划分一层，不是 Leiden 层级社区。"
            }
          }
        ],
        "paper": {
          "en": "Our approach uses an LLM to build a graph index in two stages: first, to derive an entity knowledge graph from the source documents, then to pregenerate community summaries for all groups of closely related entities.",
          "zh": "我们的方法用大语言模型分两个阶段建立图索引：先从原始文档中导出实体知识图谱，再为所有联系紧密的实体群组预先生成社区摘要。",
          "cite": "Edge 等，arXiv:2404.16130v2，摘要",
          "note": "“社区”是图论术语，指图中彼此连接紧密、与外部连接较少的一组节点。"
        }
      },
      {
        "name": "查询",
        "tag": "4.1",
        "short": "全局、局部、基本三种方式",
        "quote": "全局检索在所有社区摘要上分头作答再汇总，适合“主要议题是什么”一类问题，但消耗很大；局部检索从相关实体出发，把图中的关系与原文片段结合起来，适合关于具体人物或概念的问题；基本检索则就是普通的向量 RAG，用来对照。",
        "cite": "讲义 4.1",
        "subs": [
          {
            "name": "全局与局部",
            "quote": "全局检索在所有社区摘要上分头作答再汇总……局部检索从相关实体出发，把图中的关系与原文片段结合起来。",
            "cite": "讲义 4.1",
            "example": "局部：从“劉知幾”节点出发，取回与它相连的“史德”“心術”所在片段。",
            "explain": "选哪种方式取决于问题类型，见 D20。",
            "links": [
              [
                "D20",
                "何时值得用图"
              ]
            ],
            "paper": {
              "en": "The local search method combines structured data from the knowledge graph with unstructured data from the input documents to augment the LLM context with relevant entity information at query time.",
              "zh": "局部检索方法把知识图谱中的结构化数据与输入文档中的非结构化数据结合起来，在查询时用相关实体的信息扩充大语言模型的上下文。",
              "cite": "Microsoft GraphRAG 官方文档，Query › Local Search",
              "note": "文档说它适合需要理解文档中具体实体的问题；全局检索则“in a map-reduce fashion”遍历全部社区报告，耗费大（Query Engine 总览页）。"
            }
          }
        ],
        "paper": {
          "en": "Finally, GraphRAG answers queries through map-reduce processing of community summaries; in the map step, the summaries are used to provide partial answers to the query independently and in parallel, then in the reduce step, the partial answers are combined and used to generate a final global answer.",
          "zh": "最后，GraphRAG 通过对社区摘要的 map-reduce 处理来回答查询：在 map 步，各摘要被独立、并行地用来给出对查询的部分回答；在 reduce 步，部分回答被合并，用来生成最终的全局回答。",
          "cite": "Edge 等，arXiv:2404.16130v2，§1",
          "note": "这是论文所说的全局检索。官方文档另列局部检索（从相关实体出发，结合原文块）、DRIFT 与基本检索，见 microsoft.github.io/graphrag 的 Query Engine 一页。"
        }
      },
      {
        "name": "代价",
        "tag": "4.1、4.3",
        "short": "反复调用大模型",
        "quote": "抽取实体和写社区摘要都要反复调用大模型。",
        "cite": "讲义 4.1",
        "subs": [
          {
            "name": "成本与评价",
            "quote": "为播客数据集建图花了 281 分钟。……论文所说的“更好”，是让大模型成对比较两种方法的回答在全面性、多样性等方面的优劣，而不是在历史研究中检验过的效果。",
            "cite": "讲义 4.1",
            "example": "本页的预跑结果与 API 试跑都只覆盖《史德》或所选片段，不是全量索引。",
            "explain": "在小范围上先看清每一步产出，再决定是否值得建图。",
            "links": [
              [
                "D20",
                "何时值得用图"
              ]
            ],
            "paper": {
              "en": "Our results highlight the distinct strengths of RAG and GraphRAG across different tasks and evaluation perspectives.",
              "zh": "我们的结果显示 RAG 与 GraphRAG 在不同任务和评价角度上各有所长。",
              "cite": "Han 等，“RAG vs. GraphRAG: A Systematic Evaluation and Key Insights”，arXiv:2502.11371v3（2026-03），摘要",
              "note": "讲义 4.3 引同一句。Edge 等论文中的“更好”是由大模型成对评判全面性、多样性等得出（§3.3、§4），不是在历史研究中检验过的效果。"
            }
          }
        ],
        "paper": {
          "en": "Graph indexing with a 600 token window (explained in Section A.2) took 281 minutes for the Podcast dataset, running on a virtual machine … and using a public OpenAI endpoint for gpt-4-turbo (2M TPM, 10k RPM).",
          "zh": "以 600 词元的窗口建立图索引，在播客数据集上用了 281 分钟；运行于一台虚拟机……并使用 OpenAI 公开接口调用 gpt-4-turbo（每分钟两百万词元、一万次请求）。",
          "cite": "Edge 等，arXiv:2404.16130v2，§4.1.3 Configuration",
          "note": "省略号处为虚拟机配置。播客与新闻两个测试数据集各约一百万词元。"
        }
      }
    ]
  },
  "D21": {
    "lead": "讲义 5.1：多个各有专长的部件围绕一块共享的“黑板”协作；蚂蚁系统则让许多简单个体通过路线上的信息素协作。两者的区别在于共享的是什么。",
    "stages": [
      {
        "name": "Blackboard System",
        "tag": "Nii 1986",
        "short": "knowledge sources · blackboard · control",
        "quote": "“There is a global database called the blackboard, and there are logically independent sources of knowledge called the knowledge sources. The knowledge sources respond to changes on the blackboard.”（有一个称为“黑板”的全局数据库，以及若干在逻辑上相互独立、称为“知识源”的知识来源；知识源对黑板上的变化作出响应。）",
        "cite": "H. P. Nii, “Blackboard Systems”, AI Magazine 7(2), 1986, p. 39, Figure 1 图注",
        "subs": [
          {
            "name": "The knowledge sources",
            "quote": "“The knowledge needed to solve the problem is partitioned into knowledge sources, which are kept separate and independent.”（解题所需的知识被分成若干知识源，彼此分开、相互独立。）",
            "cite": "Nii 1986, p. 39",
            "example": "本页三个知识源：KS1 关键词检索（写回片段）；KS2 异称归并（写回人物）；KS3 证据检查（写回缺口）。",
            "explain": "知识源之间不直接调用，也不知道彼此的存在。",
            "links": []
          },
          {
            "name": "The blackboard data structure",
            "quote": "“The problem-solving state data are kept in a global database, the blackboard. … Communication and interaction among the knowledge sources take place solely through the blackboard.”（解题过程的状态数据保存在全局数据库即黑板中……知识源之间的交流与互动只通过黑板进行。）",
            "cite": "Nii 1986, p. 39",
            "example": "黑板分三层：片段层、人物与概念层、论断与缺口层；每条写入都带片段 ID。",
            "explain": "讲义 5.1：黑板上写的是明确的中间结论，读黑板的人能看懂别人写了什么。",
            "links": []
          },
          {
            "name": "Control",
            "quote": "“The knowledge sources respond opportunistically to changes in the blackboard.”（知识源随黑板上的变化伺机响应。）脚注：“There is no control component specified in the blackboard model.”（黑板模型本身并未规定控制部件。）",
            "cite": "Nii 1986, p. 39 及注6",
            "example": "本页的控制：每一步看黑板上最新的变化，挑一个前提已满足的知识源执行；没有可执行者时停止。",
            "explain": "控制放在哪里，是具体黑板系统的设计选择，不是模型本身规定的。",
            "links": []
          },
          {
            "name": "第一个黑板系统与近年用法",
            "quote": "“The first blackboard system was the HEARSAY-II speech understanding system.”（第一个黑板系统是 HEARSAY-II 语音理解系统。）",
            "cite": "Nii 1986，摘要；近年用法见 Salemi 等，arXiv:2510.01285（2025）",
            "example": "2025 年 Salemi 等把黑板用于大模型多智能体：中心智能体“posts requests to a shared blackboard”，其他智能体“volunteer to respond based on their capabilities”。",
            "explain": "近年论文的图另列，标明年代；本页“API 试跑”采用的是这一近年做法的课堂适配。",
            "links": []
          }
        ]
      },
      {
        "name": "The Ant System",
        "tag": "Dorigo 等 1996",
        "short": "transition probability · trail · evaporation",
        "quote": "“The main characteristics of this model are positive feedback, distributed computation, and the use of a constructive greedy heuristic.”（这一模型的主要特点是正反馈、分布式计算，以及使用一种构造性的贪心启发式。）",
        "cite": "Dorigo, Maniezzo, Colorni, IEEE TSMC-B 26(1), 1996，摘要",
        "subs": [
          {
            "name": "转移概率",
            "quote": "“it chooses the town to go to with a probability that is a function of the town distance and of the amount of trail present on the connecting edge”（它按一个概率选择下一座城市，这个概率取决于城市间的距离和连接边上的信息素量。）",
            "cite": "Dorigo 等 1996，第3节",
            "example": "本页把检索取回的若干片段当作“城市”，片段间距离 d = 1 − 字二元组杰卡德系数。",
            "explain": "p_ij ∝ τ_ijᵅ · η_ijᵝ，η_ij = 1/d_ij（原文称 visibility）；已走过的点记入 tabu list，不再访问。",
            "links": [
              [
                "D11",
                "集合度量"
              ]
            ]
          },
          {
            "name": "信息素沉积与挥发",
            "quote": "“ρ is a coefficient such that (1 − ρ) represents the evaporation of trail between time t and t+n”（ρ 是一个系数，1 − ρ 表示从 t 到 t+n 之间信息素的挥发。）",
            "cite": "Dorigo 等 1996，第3节，式(1)—(3)",
            "example": "每只蚂蚁走完一圈后，在所经边上沉积 Q/L_k；路线越短，沉积越多。",
            "explain": "τ_ij(t+n) = ρ·τ_ij(t) + Δτ_ij。共享的只是边上的数量化痕迹，好路线在多次往返中涌现。",
            "links": []
          },
          {
            "name": "放到检索上",
            "quote": "前者像多位研究者在同一份研究笔记上分工补充，后者像许多次检索的结果不断加权某些材料之间的联系。",
            "cite": "讲义 5.1",
            "example": "本页的任务：在取回的片段上找一条首尾衔接最紧（总距离最短）的阅读顺序，即原文所解的旅行商问题。",
            "explain": "求出的是阅读顺序，不是历史关系；信息素多的边只说明字面衔接更紧。",
            "links": []
          }
        ]
      },
      {
        "name": "三类问题",
        "tag": "讲义 5.1",
        "short": "检索和引用标记查不出的错误",
        "quote": "智能体检索得再勤，模型也会用自己“知道得太多”的那部分通用知识去组织材料，而这恰恰是检索和引用标记都查不出来的错误：每一句都可能有出处，整体框架却不是材料本身的。",
        "cite": "讲义 5.1",
        "subs": [
          {
            "name": "演进趋势的形式化",
            "quote": "只在形式上把各种主题的研究按时间顺序填进一条发展趋势，不顾各领域同步发展的实态。",
            "cite": "讲义 5.1 转述",
            "example": "把三位作者排成“从章學誠到阿克顿再到森鴎外”的一条演进线，而三文分属不同传统、不同体裁。",
            "explain": "看回答有没有为了描述转变而制造转变。",
            "links": [
              [
                "D22",
                "对照实践"
              ]
            ]
          },
          {
            "name": "时间意识上的趋新化",
            "quote": "片面地以“新”为“好”，忽视学术史追溯渊源的要求，把多数领域的发展节点延后。",
            "cite": "讲义 5.1 转述",
            "example": "只因阿克顿在 1895 年、森鴎外在 1915 年，就把“史料批判”的起点放到他们身上。",
            "explain": "看回答有没有忽视渊源，把节点往后推。",
            "links": []
          },
          {
            "name": "知识结构上的严重偏颇",
            "quote": "用西方学术话语掩盖了日本学界自身的语境……用了一个语料原文中根本没有出现过的概念给相关研究归类。",
            "cite": "讲义 5.1 转述",
            "example": "用“客观主义史学”一类材料中没有出现的概念，统括三段原文。",
            "explain": "看回答所用的分类概念，是否在材料原文里出现过。",
            "links": []
          }
        ]
      }
    ]
  }
};
