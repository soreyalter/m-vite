import { PluginContext } from "rollup";
import { init, parse } from "es-module-lexer";
import MagicString from "magic-string";
import path from "path";

import { Plugin } from "../plugin";
import { ServerContext } from "../server";
import { isJSRequest, normalizePath } from "../../utils";
import { BARE_IMPORT_RE, PRE_BUNDLE_DIR } from "../const";

/** 重写 js 文件的 import 路径 */
export function importAnalysisPlugin(): Plugin {
  let serverContext: ServerContext;
  return {
    name: "m-vite:import-analysis",
    configureServer(s) {
      serverContext = s;
    },
    /** 处理import语句 */
    async transform(this: PluginContext, code: string, id: string) {
      if (!isJSRequest(id)) {
        return null;
      }
      await init;
      const [imports] = parse(code);
      const ms = new MagicString(code);

      for (const importInfo of imports) {
        // 比如 const str = `import React from 'react'`
        // str.slice(s, e) => 'react', n === 'react'
        const { s: modeStart, e: modEnd, n: modSource } = importInfo;
        if (!modSource) continue;

        // 第三方库（裸导入）：from 路径重写为预构建产物的路径
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(
            path.join("/", PRE_BUNDLE_DIR, `${modSource}.js`)
          );
          
          ms.overwrite(modeStart, modEnd, bundlePath);
        } else if (modSource.startsWith(".") || modSource.startsWith("/")) {
          // 使用插件上下文的 resolve 方法，自动经过路径解析插件的处理
          const resolved = await this.resolve(modSource, id);

          if (resolved) {
            ms.overwrite(modeStart, modEnd, resolved.id);
          }
        }
      }

      return {
        code: ms.toString(),
        // 生成 SourceMap
        map: ms.generateMap(),
      };
    },
  };
}
