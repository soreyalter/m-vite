import path from "path";

import { Plugin } from "../plugin";
import { ServerContext } from "../server";
import { pathExists } from "fs-extra";
import resolve from "resolve";
import { isWindows, resolveWindowPath } from "../../utils";
import { DEFAULT_EXTERSIONS } from "../const";
import picocolors from "picocolors";

/** 返回一个插件，能够根据 importer 的 id 解析得到文件的相对路径 */
export function resolvePlugin(): Plugin {
  let serverContext: ServerContext;
  return {
    name: "m-vite:resolve",
    configureServer(s) {
      // 保存服务端上下文
      serverContext = s;
    },
    async resolveId(id: string, importer?: string) {
      // 绝对路径
      if (path.isAbsolute(id)) {
        if (await pathExists(id)) {
          return { id };
        }

        // 拼上工作路径，处理类似 /src/main.tsx 的情况
        id = path.join(serverContext.root, id);
        // 得到 D:\Developer\mini-vite\playground\src\main.tsx
        if (await pathExists(id)) {
          return { id };
        }
      }
      // 相对路径
      else if (id.startsWith(".")) {
        if (!importer) {
          throw new Error("`importer` should not be undefined.");
        }
        const hasExtension = path.extname(id).length > 1;
        let resolveId: string;
        if (hasExtension) {
          // 路径含有后缀名，直接寻找
          resolveId = resolve.sync(id, { basedir: path.dirname(importer) });
          if (await pathExists(resolveId)) {
            return {
              // "./App" => "/scr/App.tsx" 
              id: isWindows ? resolveWindowPath(resolveId) : resolveId,
            };
          }
        } else {
          // 不包含文件后缀名
          for (const extname of DEFAULT_EXTERSIONS) {
            // 尝试用不同的后缀名来查找对应的模块
            try {
              const withExtension = `${id}${extname}`;

              // 会得到一个 importer 到 id.extname 的绝对路径
              resolveId = resolve.sync(withExtension, {
                basedir: path.dirname(importer),
              });

              if (await pathExists(resolveId)) {
                return {
                  id: isWindows ? resolveWindowPath(resolveId) : resolveId,
                };
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
      return null;
    },
  };
}
