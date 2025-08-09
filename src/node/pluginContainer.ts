import type {
  LoadResult,
  PartialResolvedId,
  SourceDescription,
  PluginContext as RollupPluginContext,
  ResolvedId,
} from "rollup";

import { Plugin } from "./plugin";

export interface PluginContainer {
  resolveId(id: string, importer?: string): Promise<PartialResolvedId | null>;
  load(id: string): Promise<LoadResult | null>;
  transform(code: string, id: string): Promise<SourceDescription | null>;
}

/**
 * 将传入的 plugins 装入一个 container 并返回
 */
export const createPluginContainer = (plugins: Plugin[]): PluginContainer => {
  /** 插件上下文类，提供一些公用的方法，这里只 implements 一个方法 */
  // @ts-ignore 这里只实现了接口的一个方法会报错
  class Context implements RollupPluginContext {
    async resolve(id: string, importer?: string) {
      let out = await pluginContainer.resolveId(id, importer);
      if (typeof out === "string") {
        out = { id: out };
      }
      return out as ResolvedId | null;
    }
  }

  // 插件容器
  const pluginContainer: PluginContainer = {
    async resolveId(id: string, importer?: string) {
      const ctx = new Context() as any;
      for (const plugin of plugins) {
        if (plugin.resolveId) {
          // 将 this 绑定，这样在 resolveId 里可以通过 this 访问 context 类的方法
          const newId = await plugin.resolveId.call(ctx as any, id, importer);
          if (newId) {
            id = typeof newId === "string" ? newId : newId.id;
            return { id };
          }
        }
      }
      return null;
    },
    async load(id) {
      const ctx = new Context() as any;
      for (const plugin of plugins) {
        if (plugin.load) {
          const result = await plugin.load.call(ctx, id);
          if (result) {
            return result;
          }
        }
      }
      return null;
    },
    async transform(code, id) {
      const ctx = new Context() as any;
      
      for (const plugin of plugins) {
        if (plugin.transform) {
          // 链式处理，输出的 code 会传递到下一个插件的 transform 方法中
          const result = await plugin.transform.call(ctx, code, id);

          if (!result) continue;
          if (typeof result === "string") {
            code = result;
          } else if (result.code) {
            code = result.code;
          }
        }
      }
      return { code };
    },
  };

  return pluginContainer;
};
