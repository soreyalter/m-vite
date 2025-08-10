import { PartialResolvedId, TransformResult } from "rollup";
import { cleanUrl } from "../utils";

export class ModuleNode {
  constructor(url: string) {
    this.url = url;
  }
  /** 资源访问（原始请求） url */
  url: string;
  /** 资源绝对路径（即经过 resolveId 钩子得到的结果） */
  id: string | null = null;
  /** 该模块的引用方 */
  importers = new Set<ModuleNode>();
  /** 该模块所依赖的模块 */
  importedModules = new Set<ModuleNode>();
  /** 经过 transform 钩子后的编译结果 */
  transformResult: TransformResult | null = null;
  /** 上一次热更新的时间戳 */
  lastHMRTimestamp = 0;
}

export class ModuleGraph {
  /** 请求资源 url 到 Module 模块节点的映射 */
  urlToModuleMap = new Map<string, ModuleNode>();

  /** 模块 id 到模块节点的映射 */
  idToModuleMap = new Map<string, ModuleNode>();

  /** 从外部取得 resolveId 方法 */
  constructor(
    private resolveId: (url: string) => Promise<PartialResolvedId | null>
  ) {}

  getModuleById(id: string): ModuleNode | undefined {
    return this.idToModuleMap.get(id);
  }

  async getModuleByUrl(rawUrl: string): Promise<ModuleNode | undefined> {
    const { url } = await this._resolve(rawUrl);
    return this.urlToModuleMap.get(url);
  }

  /** 根据资源请求 url 获取模块，没有则新建一个 ModuleNode 注册到依赖图中并返回 */
  async ensureEntryFromUrl(rawUrl: string): Promise<ModuleNode> {
    const { url, resolvedId } = await this._resolve(rawUrl);
    // 取缓存
    if (this.urlToModuleMap.has(url)) {
      return this.urlToModuleMap.get(url) as ModuleNode;
    }
    // 缓存未命中
    const mod = new ModuleNode(url);
    mod.id = resolvedId;
    this.urlToModuleMap.set(url, mod);
    this.idToModuleMap.set(resolvedId, mod);
    return mod;
  }

  /**
   * 根据传入的新依赖信息 `importedModules` 更新 `mod.importedModules`
   * @param mod 需要更新信息的模块节点
   * @param importedModules 当前模块的新依赖，集合中可能是模块的相对路径或模块本身
   */
  async updateModuleInfo(
    mod: ModuleNode,
    importedModules: Set<string | ModuleNode>
  ) {
    const prevImports = mod.importedModules;

    // 遍历传入的 Modules 集合，尝试将其添加到 mod 的依赖中
    for (const curImport of importedModules) {
      const dep =
        typeof curImport === "string"
          ? await this.ensureEntryFromUrl(cleanUrl(curImport))
          : curImport;
      if (dep) {
        // 双向链接
        mod.importedModules.add(dep);
        dep.importers.add(mod);
      }
    }

    // 清除已经不再被引用的依赖
    for (const prevImport of prevImports) {
      if (!importedModules.has(prevImport.url)) {
        // 这里为什么不清除对模块的引用？
        // prevImports.delete(prevImport)
        // 断开下游对 mod 的单向引用关系
        prevImport.importers.delete(mod)
      }
    }

  }

  /** HMR 热更新时清除缓存 */
  invalidateModule (file: string) {
    const mod = this.idToModuleMap.get(file)
    if (mod) {
      mod.lastHMRTimestamp = Date.now()
      // 清除之前的转换结果
      mod.transformResult = null
      // 递归地对上游引用自身的 Module 更新
      mod.importers.forEach((importer) => {
        this.invalidateModule(importer.id!)
      })
    }
  }

  /** 调用构造时传递的 resolveId 方法解析请求 url */
  private async _resolve(
    url: string
  ): Promise<{ url: string; resolvedId: string }> {
    const resolved = await this.resolveId(url);
    const resolvedId = resolved?.id || url;
    return { url, resolvedId };
  }
}
