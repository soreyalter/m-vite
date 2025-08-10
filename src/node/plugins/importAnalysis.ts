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

      // 在 transformRequest 时已经注册过新的 ModuleNode 这里必然能 get 到
      const { moduleGraph } = serverContext;
      const curMod = moduleGraph.getModuleById(id)!;
      const importedModules = new Set<string>();

      for (const importInfo of imports) {
        // 比如 const str = `import React from 'react'`
        // str.slice(s, e) => 'react', n === 'react'
        const { s: modeStart, e: modEnd, n: modSource } = importInfo;
        if (!modSource) continue;

        // 给 .svg 导入路径结尾加上一个 "?import" 标记
        if (modSource.endsWith(".svg")) {
          // 求一个标准化的相对路径
          const resolvedUrl = normalizePath(
            path.relative(
              path.dirname(id),
              path.resolve(path.dirname(id), modSource)
            )
          );
          ms.overwrite(modeStart, modEnd, `./${resolvedUrl}?import`);
          continue;
        }

        // 第三方库（裸导入）：from 路径重写为预构建产物的路径
        if (BARE_IMPORT_RE.test(modSource)) {
          const bundlePath = normalizePath(
            path.join("/", PRE_BUNDLE_DIR, `${modSource}.js`)
          );
          importedModules.add(bundlePath);

          ms.overwrite(modeStart, modEnd, bundlePath);
        }
        // 非裸导入，一般是业务代码文件
        else if (modSource.startsWith(".") || modSource.startsWith("/")) {
          // 使用插件容器上下文的 pluginContainer.resolve 方法，路径解析插件处理
          const resolved = await this.resolve(modSource, id);
          
          if (resolved) {
            ms.overwrite(modeStart, modEnd, resolved.id);
            importedModules.add(resolved.id)
          }
        }
      }

      moduleGraph.updateModuleInfo(curMod, importedModules)

      return {
        code: ms.toString(),
        // 生成 SourceMap
        map: ms.generateMap(),
      };
    },
  };
}
