# 第六周 dots.ocr 本机服务

候选，未经教师确认。只实现接口与离线加载代码；本次未下载权重、未加载真实模型、未作 CPU/MPS 推理。

服务仅绑定 127.0.0.1:8786。默认启动不加载模型，`GET /health` 返回 `loaded:false`；`POST /parse` 返回真实的 `not_loaded`。通过前端“读取保存记录”回放统一 JSON 或服务日志。D11 勾选“不用 dots.ocr”后，按钮禁用，只显示官方图及“本课未运行”。

```sh
python3 server.py
python3 test_protocol.py
```

测试明确使用 `ProtocolSurrogate`，临时日志在临时目录中，测试数据不由课件构建加载。覆盖缩放后坐标还原、原文保留、非法类别、错误指纹、未加载、日志不含图像、真实 HTTP 路由与 CORS。测试不需要 torch 或 transformers，只需 Pillow。

后续由教师另行指示课前环境工作时：把固定依赖安装到课程 `第六周/demo/.venv-dots`；将 manifest 中所有模型文件放在 `第六周/demo/模型/dots.ocr`。两份权重合计 6,078,431,736 字节（约 6.08 GB / 5.66 GiB），另需依赖、缓存与工作内存。本服务没有下载功能；未备齐文件不会联网补取。

```sh
# 仅供获得课前试跑指示之后使用
python3 server.py --load --device mps --timeout 180
```

`--device cpu|mps` 是候选实现，不是兼容性保证。当前采用 float32、eager attention；模型在单独进程加载后才报告实际 backend/device/dtype。MPS 是否可用、实际显存与内存占用、速度及 OCR 效果均待教师机测试。官方主要采用 vLLM；该官方运行路线不能直接视作 Mac/MPS 支持证明，本实现未采用 vLLM。

模型身份：请求名称 rednote-hilab/dots.ocr，HF 当前转到 dots-studio/dots.ocr；固定 revision `c0111ce6bc07803dbc267932ffef0ae3a51dc951`。文件大小、SHA-256 与代码来源见 `model-manifest.json`。所有模型 Python 文件须在清单内；校验通过后才执行固定 remote code，且设置 HF/Transformers offline 与 local_files_only。

三种提示原样抽取自官方提交 `36d7248878f181c6257dc1cbd799ae940970444f` 的 `dots_ocr/utils/prompts.py`，存 `prompts.json`。`resize.py` 抽取同提交 `image_utils.py` 的 smart_resize 及辅助函数，冻结官方默认参数。提示及所抽取代码按官方 MIT 许可，附 `LICENSE.dots-ocr`。未另装官方仓库。

POST 请求使用 PNG/JPEG base64、可选原图 SHA-256、prompt_mode、page_id、max_new_tokens。输入像素按官方 smart_resize 调整，输出 bbox 从 `[x1,y1,x2,y2]` 转成原图 `[x,y,w,h]`，分别保存横纵缩放比。ocr_only 的纯文本按整页文字记录；其他模式严格解析 JSON，不修补回复。保留解析失败全文、OOM、超时与未加载状态。推理超时会终止子进程，重启服务才能再次加载。

每次 POST 的请求元数据与完整返回保存在课程 `第六周/demo/运行记录/dots/<日期>/`；不另存 base64 图像。前端超时与服务端超时分别设置；只调前端不会延长服务端限制。端口可用 WEEK06_DOTS_PORT 或 --port 修改；若改变端口或预览 origin，须同步前端地址及 ORIGINS。允许的正式 origin 仅用于未来经授权的发布，本次没有部署。
