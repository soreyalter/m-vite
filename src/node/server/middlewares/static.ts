import { NextHandleFunction } from "connect";
// 用于加载静态资源的中间件
import sirv from 'sirv'
import { isImportRequset } from "../../../utils";

/** 返回具体的静态资源内容中间件（而不是转译） */
export function staticMiddleWare(): NextHandleFunction {
  const serverFromRoot = sirv("/", {dev: true})
  return async (req, res, next) => {
    if (!req.url) {
      return
    }
    if (isImportRequset(req.url)) {
      return
    }
    serverFromRoot(req, res, next)
  }
}