# 第五轮后教师试用修正 · 验收索引

候选，未经教师确认。2026-10-22，分支 `feat/week06-courseware`，验收代码提交 `6809d42`。只本机提交，不推送。

## 证据性质

| 位置 | 性质 | 数量／结果 |
|---|---|---|
| `main/browser-round2.json`、`main/screenshots/` | 本机Chrome主回归，已有公开实跑回放与明确标注的教学／协议夹具混合；未作新模型推理 | 15组通过，75张截图；54个桌面／窄屏页面状态包含D13旧链接到D12的重定向 |
| `regression.json`、本目录截图 | 本次专项，API和OCR均由测试替身返回；不是模型质量证据 | 7组通过，11张截图；含5页390宽检查 |
| `real/report.json`、`real/*.json.gz`、`real/*.png` | 本机Google Chrome 155.0.8059.85使用固定NDL／PP缓存的新推理；仅公开《史德》 | 8条完整运行记录，5张截图，无pageerror |
| `user-api-feedback.json` | 教师本对话反馈，非自动抓取 | Kimi看图测试“已通过”；未取得原始响应或截图，DeepSeek待反馈 |
| `build.txt`、`check.txt`、`test.txt` | 最终构建／类型／公开隔离／单元测试日志 | 71通过、8私有材料项跳过；无失败 |
| `public-build.json` | 公开产物检查 | 25实体页、D13别名、359个文件；无权重／密钥 |

总计91张公开截图；`SHA256SUMS`列出本目录归档指纹。没有复制教师原件或Key。

## 重点截图与记录

- `fixture-D12-merged.png`：合并页、差异标签；其中“甲乙／甲丙”等为回归夹具。
- `fixture-D12-404.png`：保留HTTP404原文与实际型号提示；故意返回的协议错误。
- `fixture-D21-deepseek.png`：DeepSeek请求流程替身，不是实际DeepSeek输出。
- `D22-matching-record.png`：仅列当前页影记录、成功导入；测试插入的异页记录已排除。
- `fixture-D17-pp-vertical.png`、`fixture-D18-latest.png`：调用路径及重复运行显示数量，文字明确为回归夹具。
- `real/D17-PP-vertical.png`、`real/D17-PP-three-conditions.png`：三条件实际输出，原样为空，手动／自动旋转文字相同。
- `real/D17-PP-page.png`：整页识读表的可见部分；完整13区域在 `D17-PP-full.json.gz`，截图不承担展示全部文字的作用。
- `real/D18-latest-1.png`、`real/D18-latest-2.png`：两次实际运行后的页面；每次仅两引擎最新一组，完整文字见四份D18压缩记录。

## 复跑

在 `apps/week06`，已构建且本地预览8776运行时：

```sh
WEEK06_VERIFY_DIR=../../docs/week06/verification/20261022-followup/main node scripts/check-browser.mjs
node scripts/check-teacher-followup.mjs
node scripts/check-followup-real.mjs
```

最后一个脚本启动独立的可见Chrome配置 `local-only/week06-round3-chrome`，只读取其中已有的固定NDL／PP缓存；缺缓存会失败，不会改用别的模型或从网络下载。脚本阻止外部请求和本机私有材料接口。前两个浏览器检查的API替身与真实Key完全无关。

主检查与专项的完成等待均显式等待页面激活、记录保存和结果出现；实际整页PP检查断言无单行实验标识且区域数大于1，防止把前一条单行结果当整页结果。第五轮35组版式矩阵保留历史结果，本次未重跑。
