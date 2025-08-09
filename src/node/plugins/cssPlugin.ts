import { readFile } from "fs-extra";
import { Plugin } from "../plugin";
import picocolors from "picocolors";

export function cssPlugin(): Plugin {
  return {
    name: "m-vite:css",
    load(id) {
      if (id.endsWith(".css")) {
        return readFile(id, "utf-8");
      }
    },
    async transform(code, id) {
      if (id.endsWith(".css")) {
        // 正确处理CSS字符串：转义单引号和换行符
        const escapedCode = code
          .replace(/\\/g, '\\\\')  // 转义反斜杠
          .replace(/'/g, "\\'")    // 转义单引号
          .replace(/\r\n/g, '\\n') // 转义Windows换行符
          .replace(/\n/g, '\\n')   // 转义Unix换行符
          .replace(/\r/g, '\\n');  // 转义Mac换行符

        const jsContent = `
const css = '${escapedCode}';
const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.innerHTML = css;
document.head.appendChild(style);
export default css;
`.trim();
        return {
          code: jsContent,
        };
      }
      return null;
    },
  };
}
