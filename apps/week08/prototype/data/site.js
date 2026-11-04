/* 课堂本机版的站点设置。公开发布构建（scripts/assemble.mjs）会改写为 public: true，并由环境变量 WEEK08_TIANDITU_TK、WEEK08_TIANDITU_GS 填入天地图密钥与审图号。
 * public: true 时 D16—D19 不画 Natural Earth 海岸线（无审图号的底图不公开发布），只在有天地图密钥时提供“在天地图上看”。
 * 本机试用天地图：在浏览器控制台运行 localStorage.setItem('w8/tdt-tk', '你的浏览器端密钥')、localStorage.setItem('w8/tdt-gs', '审图号')。 */
window.W8_SITE = { public: false, tianditu: { tk: '', gs: '' } };
