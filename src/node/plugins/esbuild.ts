import path from "path";
import esbuild from "esbuild";

import { readFile } from "fs-extra";
import { isJSRequest } from "../../utils";
import { Plugin } from "../plugin";

/** 生成一个插件，能够读取（load）文件内容并通过 esbuild 转换（transform）为 esnext */
export function esbuildTransformPlugin(): Plugin {
  return {
    name: "m-vite:esbuild-transform",

    async load(id) {
      if (isJSRequest(id)) {
        try {
          const code = await readFile(id, "utf-8");
          return code;
        } catch (e) {
          return null;
        }
      }
    },
    /** 主要是转译为普通 .js 文件 */
    async transform(code, id) {
      if (isJSRequest(id)) {
        const extname = path.extname(id).slice(1);
        const { code: transformCode, map } = await esbuild.transform(code, {
          target: "esnext",
          format: "esm",
          sourcemap: true,
          loader: extname as "js" | "ts" | "jsx" | "tsx",
        });
        return {
          code: transformCode,
          map,
        };
      }
      return null;
    },
  };
}
