import os from "os";
import path from "path";
import { HASH_RE, JS_TYPES_RE, QEURY_RE } from "./node/const";
import picocolors from "picocolors";
import { url } from "inspector";

/** 将字符串中的 \ 替换成 / */
export function slash(p: string): string {
  return p.replace(/\\/g, "/");
}

export const isWindows = os.platform() === "win32";

/** 将.开头的相对路径清理掉.并且清理多余斜杠或将复杂路径简化 */
export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id);
}

/** 请求 .js, .jsx, .ts, .tsx, .mjs 文件 */
export const isJSRequest = (id: string): boolean => {
  id = cleanUrl(id);

  // 扩展名为 .js, .jsx, .ts, .tsx, .mjs
  if (JS_TYPES_RE.test(id)) {
    return true;
  }

  // 没有扩展名 并且结尾不是 /
  if (!path.extname(id) && !id.endsWith("/")) {
    return true;
  }
  return false;
};

/** 去除 url 中的哈希参数和 query 参数 */
export const cleanUrl = (url: string): string => {
  return url.replace(HASH_RE, "").replace(QEURY_RE, "");
};

/** 将传入的 url 转化为 posix 格式的相对路径 */
export function resolveWindowPath(url: string) {
  const relativePath = slash(path.relative(process.cwd(), url));

  //  D:/Developer/mini-vite/playground/src/App.tsx 会被解析成 src/App.tsx，但相对路径必需以/或者.开头
  if (relativePath.startsWith(".") || relativePath.startsWith("/")) {
    return relativePath;
  } else {
    return `/${relativePath}`;
  }
}

export const isCssRequest = (id: string): boolean =>
  cleanUrl(id).endsWith(".css");

export const isImportRequset = (url: string): boolean =>
  url.endsWith("?import");

export const removeImportQuery = (url: string): string => {
  return url.replace(/\?import/, "");
};
