import { Plugin } from "esbuild";
import { BARE_IMPORT_RE, EXTERNAL_TYPES } from "../const";

/** 从 main 入口开始扫描依赖，将裸模块导入的依赖加入 deps 集合中 */
export default function scanPlugins(deps: Set<string>): Plugin {
  return {
    name: "esbuild:scan-deps",
    setup(build) {
      // ESBuild 插件系统中的一个核心钩子，用于拦截和自定义模块解析过程
      // 在进入入口，以及遇到 import, require 语句时触发这个钩子
      build.onResolve(
        {
          // 忽略静态资源文件类型（不预构建）
          filter: new RegExp(`\\.(${EXTERNAL_TYPES.join("|")})$`),
        },
        (resolveInfo) => {
          return {
            path: resolveInfo.path,
            external: true,
          };
        }
      );
      build.onResolve(
        {
          // 裸模块导入，需要预构建
          filter: BARE_IMPORT_RE,
        },
        (resolveInfo) => {
          const { path: id } = resolveInfo;
          deps.add(id);
          return {
            path: id,
            external: true,
          };
        }
      );
    },
  };
}
