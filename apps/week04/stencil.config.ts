import { Config } from "@stencil/core";
export const config: Config = {
  namespace: "week04",
  globalStyle: "src/global/app.css",
  outputTargets: [
    {
      type: "www",
      serviceWorker: null,
      baseUrl: "/pku-aihis/week04/",
      copy: [{ src: "assets", dest: "assets", keepDirStructure: false }],
    },
  ],
  devServer: { port: 3334, reloadStrategy: "pageReload" },
};
