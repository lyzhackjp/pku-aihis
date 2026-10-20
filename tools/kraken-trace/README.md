# Kraken 分割追踪
候选，未经教师确认。只写未运行；E08 时由教师决定运行。禁止把此文档当成已试跑记录。

固定源码 `mittagessen/kraken@bb487219e7d8289274443d1ad0989efb4924dc2a`，源码中 `blla.compute_segmentation_map/vec_lines`、`segmentation.vectorize_lines/calculate_polygonal_environment` 已核读。脚本检查已安装分发包的 direct_url commit；不自动下载模型。

独立 Python 3.12 环境安装：
```bash
python -m pip install 'kraken @ git+https://github.com/mittagessen/kraken@bb487219e7d8289274443d1ad0989efb4924dc2a'
```
模型取得：BLLA通用分割模型 v1，DOI `10.5281/zenodo.14602569`，在 https://zenodo.org/records/14602569 下载 `blla.mlmodel`，核对网页MD5 `0e3f0e1c5e954c8b673ef5dbd0865058`，再计算并登记SHA256。该模型偏向拉丁文字、简单版面，对倾斜与竖排有限制；不预先宣称适合所有本课材料。

```bash
python tools/kraken-trace/trace.py /path/to/folger-page.png /path/to/blla.mlmodel /path/to/new-trace --model-doi 10.5281/zenodo.14602569 --model-sha256 ACTUAL_SHA256
kraken -x -i /path/to/folger-page.png /path/to/page.xml segment -bl -i /path/to/blla.mlmodel
kraken -x -i /path/to/folger-page.png /path/to/recognized.xml segment -bl -i /path/to/blla.mlmodel ocr -m /path/to/recognition-model.mlmodel
```
最后一条须另行选取适合Folger书体的识读模型，并登记其DOI、版本与指纹；不是用分割模型识字。模型管理可用 `kraken list`、`kraken show DOI`、`kraken get DOI`，本轮不执行。

输出：输入、原始热图NPY与逐通道PNG、trace.json（含通道像素值）、阈值、网络坐标下基线/多边形JSON、原图坐标下统一记录、读序、PAGE-XML、每步耗时、overview.gif。阈值作用于Sato脊线响应（默认0.17），不是把原始sigmoid概率直接阈值化；D04的滑块仅供观察热图，不冒充重跑矢量化。

D04先选择同一Folger图像，再导入PAGE/ALTO或统一记录；trace.json支持热图、基线、逐条多边形与读序。图片/动图留本机，通过文件选择器载入，不进入仓库。
