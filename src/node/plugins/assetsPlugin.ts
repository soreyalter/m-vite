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

/**
 * 在 React 组件中:
 * import logoUrl from './logo.svg'  // logoUrl = "/src/logo.svg"
 * 
 * function App() {
 *   return <img src={logoUrl} alt="logo" />  // src="/src/logo.svg"
 * }
 * 
 * 为了支持这种 import svg 文件并设置为src的写法
 * 要把 import 的这个 logoUrl 转换成 svg 文件的路径
 * 那么这个插件会把 './logo.svg' 加载（load）成 export default "/src/logo.svg"
 * 也就是 import logo from './logo.svg' => import logo from {default: "/src/logo.svg"}
 * 从而 logo = "/src/logo.svg"
 * 从而 <img src={logoUrl} alt="logo" /> => <img src="/src/logo.svg" alt="logo" />
 * 将 img 标签转换成原生也就是浏览器支持的写法（src = 字符串）
 */
