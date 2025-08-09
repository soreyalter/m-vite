import picocolors from "picocolors";
import {
  cleanUrl,
  isWindows,
  normalizePath,
  removeImportQuery,
} from "../../utils";
import { Plugin } from "../plugin";

export function assetsPlugin(): Plugin {
  return {
    name: "m-vite:assets",
    async load(id) {
      const cleanedUrl = removeImportQuery(cleanUrl(normalizePath(id)));

      if (cleanedUrl.endsWith(".svg")) {
        console.log(picocolors.blue("svg"), cleanedUrl)
        return {
          // windows 环境下得把盘符删掉，要不然浏览器会把这个路径用file协议请求
          // http://localhost:3000/Developer/mini-vite/playground/src/logo.svg
          code: isWindows
            ? `export default "${cleanedUrl.replace(/^[A-Z]:/g, "")}"`
            : `export default "${cleanedUrl}"`,
        };
      }
    },
  };
}
