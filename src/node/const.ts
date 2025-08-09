import path from 'path';

/**
 * 不需要预构建的静态资源和业务代码
 */
export const EXTERNAL_TYPES = [
  "css",
  "less",
  "sass",
  "scss",
  "styl",
  "stylus",
  "pcss",
  "postcss",
  "vue",
  "svelte",
  "marko",
  "astro",
  "png",
  "jpe?g",
  "gif",
  "svg",
  "ico",
  "webp",
  "avif",
];

/** 裸模块导入 */
export const BARE_IMPORT_RE = /^[\w@][^:]/;
/** 预构建路径：node_modules/.m-vite */
export const PRE_BUNDLE_DIR = path.join('node_modules', '.m-vite')

export const JS_TYPES_RE = /\.(?:j|t)sx?$|\.mjs$/
export const QEURY_RE = /\?.*$/s
export const HASH_RE = /#.*$/s
export const DEFAULT_EXTERSIONS = [".tsx", ".ts", ".jsx", "js"];