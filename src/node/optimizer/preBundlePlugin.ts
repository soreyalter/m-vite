import { Loader, Plugin } from "esbuild";
// 用于解析 ES 模块的导入导出
import { init, parse } from "es-module-lexer";
import createDebug from "debug";
import fs from "fs-extra";
import path from "path";
// node 路径解析算法库，用于解析模块路径
import resolve from "resolve";
import { BARE_IMPORT_RE } from "../const";
import { normalizePath } from "../../utils";

const debug = createDebug("dev");

export function preBundlePlugin(deps: Set<string>): Plugin {
  return {
    name: "esbuild:pre-bundle",
    setup(build) {
      build.onResolve(
        {
          filter: BARE_IMPORT_RE,
        },
        (resolveInfo) => {
          const { path: id, importer } = resolveInfo;
          const isEntry = !importer;

          if (deps.has(id)) {
            return isEntry
              ? {
                  path: id,
                  namespace: "dep",
                }
              : {
                  // 对于二次依赖，将模块名解析为真实路径，不会将其传递给 load 钩子生成代理模块
                  path: resolve.sync(id, { basedir: process.cwd() }),
                };
          }
        }
      );
      build.onLoad(
        {
          filter: /.*/,
          // 只处理 dep 命名空间
          namespace: "dep",
        },
        async (loadInfo) => {
          // 初始化 ES 模块词法分析器
          await init;
          // 依赖的标识符, 比如 'react'
          const id = loadInfo.path;
          const root = process.cwd();
          // 解析得到依赖文件的路径：'/project/node_modules/react/index.js'
          const entryPath = resolve.sync(id, { basedir: root });
          // 读取这个依赖的文件内容
          const code = await fs.readFile(entryPath, "utf-8");
          // parse 获得 import 和 export 语句的数组，如果是 cjs 则两个变量都为空数组
          const [importer, exports] = await parse(code);

          // 取从工作目录 root 到依赖入口 entryPath 的相对路径，并把反斜杠 \ 换成 /
          // './node_modules/react/index.js'
          let relativePath = normalizePath(path.relative(root, entryPath));

          if (
            !relativePath.startsWith("./") &&
            !relativePath.startsWith("../") &&
            relativePath !== "."
          ) {
            relativePath = `./${relativePath}`;
          }

          // 相当于有一个中转的桶，将所有依赖用 esm 规范导入并导出
          // 所以称之为代理模块
          let proxyModule = [];
          // cjs 规范没有 import 和 export 语句
          if (!importer.length && !exports.length) {
            // 动态获取这个 cjs 模块的导出内容
            // res = { Component: function, createElement: function, ... }
            const res = require(entryPath);
            // 获取依赖中所有的具名导出
            const specifiers = Object.keys(res);
            proxyModule.push(
              // 将所有模块转换成 esm 格式并一并导出，支持具名导入和默认导入
              // 重导出，建立引用关系，告诉 esbuild 这个 react 来自哪里
              `export { ${specifiers.join(",")} } from "${relativePath}"`,
              `export default require("${relativePath}")`
            );
          } else {
            // esm
            if (exports.includes("default" as any)) {
              proxyModule.push(
                `import d from "${relativePath}";export default d`
              );
            }
            proxyModule.push(`export * from "${relativePath}"`);
          }
          debug("代理模块内容: %o", proxyModule.join("\n"));

          // 文件后缀名，与 loader 的名字是一样的
          const loader = path.extname(entryPath).slice(1);
          return {
            loader: loader as Loader,
            contents: proxyModule.join("\n"),
            resolveDir: root,
          };
        }
      );
    },
  };
}
