# 第七周材料的公开再发布：许可核对（2026-10-29）

教师问题（10-29）：CBDB 等资料用于学术发布（含 GitHub Pages），是否需要对方授权，还是照要求引注即可？能否把这些内容内嵌在课件里，学生打开就能看，不必教师本机导入？

以下按各来源本身公布的条款整理，供教师决定。这不是法律意见；有疑问时以权利方书面答复为准。

| 来源 | 课件中的用途 | 公布的条款 | 能否随课件公开 | 处理 |
|---|---|---|---|---|
| Web NDL Authorities 典拠 JSON | D07、D08、D10、D30 | 注明取自 Web NDL Authorities 即可，无需申请；NDL 书志、典拠数据无偿利用（CC BY 相当） | 可以，注明出处 | **已放入公开材料** |
| NDL 数字收藏页影（『大日本史料』9-1、『新増補浮世絵類考』） | D02、D11、D30 | 公开范围为“インターネット公開（保護期間満了）”的，自由利用，不需申请；请注明出处 | 可以，注明出处 | **已放入公开材料** |
| 维基文库录文（《宋史》卷三一二选段、《續資治通鑑》卷六十八、《建炎以來繫年要錄》卷169、170、175 相关句） | D08、D18、D23、D30 | 底本为公有领域古籍；维基文库录文 CC BY-SA 4.0 | 可以，署名并以相同许可提供 | **已放入公开材料** |
| DDBC／DILA 時間規範資料庫 | D14、D30 | CC BY-SA 3.0 | 可以，署名、相同方式共享 | **已放入公开材料** |
| HIPE-2026 数据（impresso 英文训练集） | D12、D17 | CC BY-NC-SA 4.0 | 非商业的课程网站可以，署名、相同方式共享 | **已放入公开材料** |
| CBDB 接口返回（王珪按名查询、编号 1762、1845、1846、33013、35043、570937） | D01、D04、D07、D09、D12、D18 | 2026-08-20 起的新条款分两档：在当前单机版（CBDB BJ 20260602，649,533 人）发布日期及数据量范围内的数据适用 CC BY-NC-SA 4.0；此后发布或超出该范围的数据不得分发、不得以之作公开访问服务，另需书面授权。接口说明页仍写“API 资料适用 CC BY-NC-SA 4.0”。 | **待定**：课件用的是 2026-10-28 的接口返回，是否全部落在单机版范围内无法从接口判断 | 暂留本机材料包，见下 |
| 教学文件夹原件（讲义 4.2 抽取记录、人工参照转录、NDLOCR-Lite 识读输出、TEI 校验记录）与讲义所录节录 | D02、D06、D11、D23、D24、D27、D28、D30 | 教师自己的材料，无第三方限制；识读与转录的对象是公有领域页影 | 由教师决定 | 暂留本机材料包 |
| D01、D25 课前运行记录 | D01、D25 | D01 记录内含 CBDB 接口返回；D25 记录内含讲义节录 | 随上两项 | 暂留本机材料包 |

## CBDB 的两种做法

1. **改用单机版数据**：从 CBDB BJ 20260602 单机版取出这几个人的记录（同样的字段），按 CC BY-NC-SA 4.0 公开，注明“China Biographical Database，CBDB BJ 20260602，CC BY-NC-SA 4.0”。这样明确落在第一档。代价是要下载单机版（Access 格式），并核对与接口返回的差异；D01 讲“接口返回什么”的部分仍可现场调用接口演示，只是课件里不保存接口原文。
2. **写信取得书面许可**：新条款写明条款之外的使用须事先书面授权，联系人为 Hongsu Wang（hongsuwang [at] fas.harvard.edu）。可说明用途：北京大学课程的非商业公开课件，展示 6 条人物记录与 1 次按名查询的接口返回，注明出处。

在教师决定之前，CBDB 内容仍由教师课堂现场导入。

## 实现

- `apps/week07/scripts/build_public_pack.py` 从本机材料包中只取上表“已放入公开材料”的五类，写成 `prototype/data/public/week07-public-pack.js`（约 4.5 MB），每部分带 `attribution`（许可、出处、链接）。脚本断言不含 CBDB、教学文件夹原件与运行记录。
- 课件启动时自动载入公开材料（`file://` 下也可用），本机材料包导入后与之合并。各页按实际用到的部分判断是否显示导入提示：只用公开材料的 D10、D14、D17 与 D30 默认材料不再需要导入；仍需本机材料包的是 D01、D02、D07、D09、D11、D12、D18、D23 回放、D24、D28。

## 依据

- CBDB Data Licensing Terms：https://cbdb.hsites.harvard.edu/cbdb-data-licensing-terms （2026-08-20 生效）；单机版下载页：https://cbdb.hsites.harvard.edu/download-cbdb-standalone-database ；API 说明：https://input.cbdb.fas.harvard.edu/cbdbapi/index.html
- NDL：Linked Open Data 页 https://www.ndl.go.jp/dlib/standards/lod （Web NDL Authorities 利用条件）；内容转载 https://www.ndl.go.jp/use/reproduction/
- HIPE-2026-data README（License：CC BY-NC-SA 4.0）：https://github.com/hipe-eval/HIPE-2026-data
- DDBC／DILA 時間規範資料庫：材料包记录（CC BY-SA 3.0）
- 维基文库：Wikimedia 使用条款（文本 CC BY-SA 4.0）
