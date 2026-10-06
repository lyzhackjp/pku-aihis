# 来源与可选组件

四栏布局和课件容器从本仓库第三周助教 PR #6 的 main 版本适配；页面内容、项目合同及第四周功能独立实现。deck-slide、教师视图和键盘规则继承第三周，并使用第四周独立频道。

PDF.js 5.6.205（Apache-2.0）；JSZip 3.10.1（MIT/GPL-3.0 双许可，采用 MIT）；Stencil 4.45.0（MIT）。依赖版本固定于 pnpm-lock.yaml，生成资源不入 Git。

Zotero Reader 是可选的独立本机比较构建，固定官方提交 692c28989629acf920fadb683747e18e5506b214，AGPL-3.0，完整源码及 COPYING 保留在单独的本机检出中。课件只在配置了同源比较目录时装载它，没有将其打包进公开课件构建。移植范围为 PDF 阅读、按附件保存批注及转为来源笔记；没有实现完整 Zotero 库同步、标签弹窗、旋转和原件编辑。未配置时明确显示不可用。

本机比较构建补装了源码引用的 raw-loader 4.0.2，官方固定版本语言文件自行缓存，PDF.js 子模块按其 generic-legacy/minified-legacy 产物组装。源码没有伪装成课程自研阅读器。版本、构建步骤和实测限制见 docs/week04/development.md。
