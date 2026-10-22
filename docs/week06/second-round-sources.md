# 第二轮来源与读取深度

候选，未经教师确认。核读日：2026-10-20。以下是实现依据，不是模型试跑记录。

| 范围 | 固定来源与读取深度 | 本课据此实现 |
|---|---|---|
| G2/G3/F20 | [NDLOCR-Lite d001dad](https://github.com/ndl-lab/ndlocr-lite/tree/d001dad)：完整读 `src/parseq.py`，`src/ocr.py` 的CONF写出段与调用链、`deim.py` 检测返回段 | argmax→首个0截止→charlist[id−1]；保留叠字；softmax分数标本课计算。`ocr.py` L628–631、674 的 CONF 来自检测框。 |
| F19/D03 | 同一版本 `src/config/ndl.yaml`、`src/ndl_parser.py` 类别清单；另读 [古典籍版3c62c34](https://github.com/ndl-lab/ndlkotenocr-lite/tree/3c62c34) 的parser L50–64、834、845 | 现代NDL17类；古典籍版本自身有15类，不能把它的表直接当17类。名称逐项断言，以随库来源文件回查。 |
| G2/D02/D07 | [PaddleOCR dab3fe3](https://github.com/PaddlePaddle/PaddleOCR/tree/dab3fe3)，已读JS识读预处理与decode段L263–288、检测概率与阈值处理；字表来自固定pp-rec.yml | CTC blank=0，保留字符的最大概率平均；输入BGR归一化、配置最小宽度、右侧零填充。 |
| D02/D10 | [DB arXiv:1911.08947](https://arxiv.org/abs/1911.08947)，v2 §3及3.1 | 概率图与二值化图。短引文在D02页表注明节号；不把后处理阈值图当像素真值。 |
| D04/D07 | [Kraken bb487219e7d8289274443d1ad0989efb4924dc2a](https://github.com/mittagessen/kraken/tree/bb487219e7d8289274443d1ad0989efb4924dc2a)，读 `configs/vgsl.py`、blla完整相关函数、segmentation的vectorize_lines和calculate_polygonal_environment、serialization入口 | 热图插值/sigmoid/padding、Sato阈值0.17、骨架化、基线、多边形、读序；D07识读VGSL形状为推算，保留V-13。最初尝试configs.py返回404，实际文件是configs/vgsl.py。 |
| D04论文与模型 | Kiessling, *A Modular Region and Text Line Layout Analysis System*, ICFHR2020, pp313–318, DOI10.1109/ICFHR2020.2020.00064；题录据[作者模型卡](https://zenodo.org/records/14602569) | 论文全文未取得，未把源码核读写成论文全文阅读。模型卡读到训练与限制，分割模型DOI10.5281/zenodo.14602569；未下载模型。 |
| D07静态ONNX | [PP小型识读模型固定revision](https://huggingface.co/PaddlePaddle/PP-OCRv6_small_rec_onnx/tree/b8f84f0b80c529de40b4fbb3544b84fa7233a513)；SHA5435fd747c9e0efe15a96d0b378d5bd157e9492ed8fd80edf08f30d02fa24634 | 下载到临时目录21,159,378字节，只执行onnx1.20.1静态形状推断，导出481算子元数据；没有建立推理会话。 |
| D10流水线 | [CRNN 1507.05717](https://arxiv.org/abs/1507.05717)摘要，DB §3、PP源码 | 引文为CRNN摘要中的短句；结构图按讲义与模块关系重绘。 |
| D10多任务模型 | [Florence-2 2311.06242](https://arxiv.org/abs/2311.06242)摘要；固定Transformers.js解析接口 | 引文来自摘要；区别OCR和OCR_WITH_REGION。 |
| D10文档模型 | [dots.ocr官方README](https://github.com/rednote-hilab/dots.ocr)固定副本，News2025-07-30、提示及输出格式 | 采用初代1.7b发布条目，不把后续dots.mocr结果归给初代。 |
| D10通用模型 | [PureDocBench 2605.07492](https://arxiv.org/abs/2605.07492)题名及摘要 | 标明读取深度；具体数值沿用已修订讲义的备查区，不声称本轮重跑基准。 |
| D14竞赛 | [CMMHWR官方结果页](https://cmmhwr26.inria.fr/results/)及助教2026-10-17存档PDF | 全文文本核对；目验PDF页序1–3三张表。12队＋Kraken基线＋PERO逾期结果，三任务全部CER；逾期单独标星，名次V-05留待教师。 |
| D16 | 助教提供MEDUSA hal-05744493 PDF，读§5.4、图2及合成流程；既有图7/8来源许可记录 | 原论文流程图CC BY4.0；页面的退化算子是本课仿制，不声称复现论文代码。 |
| D18 | [早期印本竞赛官方页](https://lme.tf.fau.de/competitions/icdar-2025-competition-on-glyph-detection-in-15th-century-european-printed-documents/)全文；[HR-Ciphers接受稿库页](https://ddd.uab.cat/record/325042)题录/摘要/权利说明 | 前者强调精度和稀疏标注；后者权利页未给公共转载许可。要点与原文入口保留，未把论文图复制进发布包。 |
| D19古法文 | [CATMuS general principles](https://catmus-guidelines.github.io/html/guidelines/en/generalites.html) Graphemic transcription与Exemple | 节录BnF fr.412示例第二行；q̃→que为本课展开候选。原页影未复制，避免把未核许可图像当已授权。 |
| D19日文 | [2016年图录](https://hyakugo.pref.kyoto.lg.jp/wordpress_jp/wp-content/uploads/exhib_2016_2.pdf)，编号51，印刷p19／PDF页序21，目验翻刻与边注；[利用条件](https://hyakugo.pref.kyoto.lg.jp/?page_id=1453)全文 | 网站一般CC BY2.1 JP，图录未见非CC声明。仅节录同一句，保留馆署名，读下由本课拟并明确修改；不把边注释字塞入照录正文。原PDF不入仓库，指纹记在示例JSON。 |

G6的12项官方接口文档、图像传入格式、坐标约定和日期逐项保存在 `modules/history-demo/ocr/api-presets.json`。有官方坐标约定的据文档填写；其余明确写“本课提示约定，厂商无通用规范／待核”，不是臆造API保证。未固定未经核验的模型名称，教师输入实际账号可用模型。

D08本轮没有真实识读，因此没有可报告的“与讲义一致”或“不一致”实验结论。三个实验均保存实际输入与输出；待另行授权后，据结果讨论上下文是否影响识读。
