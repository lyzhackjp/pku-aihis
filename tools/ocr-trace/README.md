# PP-OCRv6 行识读网络追踪
候选，未经教师确认。`pp_rec_trace.py` 本轮仅编写与静态检查，未执行。教师另行授权后运行。

固定模型、URL、字节数与 SHA 在 `apps/week06/src/engines/models.json` 的 `pp-rec`。不自动下载。`export_metadata.py` 是另一个只做 ONNX 静态形状推断的构建辅助程序，本轮已运行；发布包只含481个算子的元数据，不含权重。

准备独立 Python 环境并安装 `onnx==1.20.1 onnxruntime==1.24.3 pillow==11.3.0 PyYAML==6.0.2 numpy==2.2.6 opencv-python-headless==4.10.0.84`。在课程授权的本机输入目录准备**一行**图片。用 `pp-rec-graph.json` 中实际的输出 tensor 名称指定 `--nodes`，不要写算子索引。

```bash
python tools/ocr-trace/pp_rec_trace.py /path/to/inference.onnx /path/to/line.png /path/to/new-output --nodes exact_tensor_name
```

输出原行、缩放行、所有指定张量 NPY、每层最强六通道PNG、概率表NPY、含形状/耗时/实际文字/逐字概率的trace.json。模型与图像指纹保留；文件留本机。高宽比≥1.5时按上游cropByPoly逆时针旋转90度；`--no-auto-rotate`可保留原样。脚本采用BGR、48高、最大宽3200、均值/标准差0.5，与浏览器约定相同；按实际RecResizeImg配置保留最小宽度，归一化后以零补齐，OpenCV INTER_LINEAR缩放；原生与WASM数值一致性尚未运行验证。D07导入trace.json及特征图后查看。
