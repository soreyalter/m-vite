import { build } from "esbuild";
import path from "path";
import scanPlugins from "./scanPlugins";
import { green } from "picocolors";
import { PRE_BUNDLE_DIR } from "../const";
import { preBundlePlugin } from "./preBundlePlugin";

export async function optimizer(root: string) {
  // 1. 预构建入口，这里假设是 /src/main.tsx
  const entry = path.resolve(root, "src/main.tsx");
  // 2. 从入口处扫描依赖
  const deps = new Set<string>();
  await build({
    entryPoints: [entry],
    // 开启打包，才会递归分析依赖，否则只会解析入口文件
    bundle: true,
    // 产物不写入磁盘，因为只是依赖扫描，并不是要依赖打包
    write: false,
    plugins: [scanPlugins(deps)],
  });

  console.log(
    `${green("dpes needed to pre-build")}: \n${[...deps]
      .map(green)
      .map((item) => `  ${item}`)
      .join(`\n`)}`
  );
  // 3. 预构建依赖
  await build({
    entryPoints: [...deps],
    write: true,
    bundle: true,
    format: 'esm',
    splitting: true,
    outdir: path.resolve(root, PRE_BUNDLE_DIR),
    plugins: [preBundlePlugin(deps)],
  })
}
