import { NextHandleFunction } from "connect";
import path from "path";
import { pathExists, readFile } from "fs-extra";
import { ServerContext } from "..";

/** 入口 HTML 加载中间件 */
export function indexHtmlMiddware(
  serverContext: ServerContext
): NextHandleFunction {
  return async (req, res, next) => {
    if (req.url === "/") {
      const { root } = serverContext;

      // 默认 index.html 入口文件就在 server 的工作目录
      const indexHtmlPath = path.join(root, "index.html");
      if (await pathExists(indexHtmlPath)) {
        const rawHtml = await readFile(indexHtmlPath, "utf-8");
        let html = rawHtml;

        // 如果插件实现了 transformIndexHtml 方法，依次应用
        for (const plugin of serverContext.plugins) {
          if (plugin.transformIndexHtml) {
            html = await plugin.transformIndexHtml(html);
          }
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        return res.end(html);
      }
    }
    return next();
  };
}
