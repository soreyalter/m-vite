import { NextHandleFunction } from "connect";

import createDebug from "debug";

import { cleanUrl, isCssRequest, isImportRequset, isJSRequest } from "../../../utils";
import { ServerContext } from "..";
import debug from "debug";

/**
 * 处理模块转换请求的核心方法
 * 该方法实现了一个完整的模块处理流程：resolve -> load -> transform
 * 
 * @param url - 请求的模块路径（可能包含查询参数和哈希）
 * @param serverContext - 服务器上下文，包含插件容器等核心组件
 * @returns 转换后的模块结果，包含转换后的代码和可能的 sourcemap 等信息
 */
export async function transfromRequest(
  url: string,
  serverContext: ServerContext
) {
  const { pluginContainer } = serverContext;
  
  // 清理 URL，移除查询参数和哈希，得到纯净的模块路径
  url = cleanUrl(url);

  // 第一步：模块解析 (resolve) 将相对/绝对路径或裸模块名解析为具体的文件路径
  // 例如：'./App.tsx' -> '/path/to/src/App.tsx', 
  // 'react' -> '/node_modules/react/index.js'
  const resolveResult = await pluginContainer.resolveId(url);
  
  let transfromResult;
  if (resolveResult?.id) {
    // 第二步：模块加载 (load) 根据解析得到的文件路径读取模块内容
    // 可能从文件系统读取，也可能是插件生成的虚拟模块内容
    let code = await pluginContainer.load(resolveResult.id);
    
    // 处理 load 结果：可能是字符串（直接的代码）或对象（包含额外信息）
    if (typeof code === "object" && code !== null) {
      code = code.code; // 提取对象中的 code 字段
    }
    
    if (code) {
      // 第三步：模块转换 (transform)
      // 对加载的代码进行转换，如 TypeScript 编译、JSX 转换、CSS 预处理等
      transfromResult = await pluginContainer.transform(
        code as string,
        resolveResult.id
      );
    }
  }
  
  return transfromResult;
}

/** 将 GET 泛 js 文件的请求进行转换 */
export function transformMiddleWare(
  serverContext: ServerContext
): NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !req.url) {
      return next()
    }
    const url = req.url
    debug('transformMiddleware: ' + url)

    // 转换 各种请求
    if (isJSRequest(url) || isCssRequest(url) || isImportRequset(url)) {
      let result = await transfromRequest(url, serverContext)
      if (!result) {
        return next()
      }
      if (result && typeof result !== 'string') {
        result = result.code as any
      }

      // 编译完成
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript')
      return res.end(result)
    }
    next()
  }
}
