#!/usr/bin/env python3
"""llama_cpp.server 的低内存启动：关闭 CPU 权重重排的额外缓冲（llama_model_params.use_extra_bufts），
否则 Q4_K 权重会在常驻内存里再存一份重排后的副本（约等于权重文件大小）。参数与 python3 -m llama_cpp.server 相同。
llama-cpp-python 0.3.36 的 Llama() 未开放此项，这里在载入前改默认参数。速度可能略降。"""
import sys
import llama_cpp.llama_cpp as L
_orig = L.llama_model_default_params
def _params():
    p = _orig(); p.use_extra_bufts = False; return p
L.llama_model_default_params = _params
from llama_cpp.server.__main__ import main
if __name__ == '__main__':
    sys.argv[0] = 'llama_cpp.server'; main()
