import connect from "connect";
import { blue, green } from "picocolors";
import chokidar, { FSWatcher } from "chokidar";

import { optimizer } from "../optimizer";
import { createPluginContainer, PluginContainer } from "../pluginContainer";
import { Plugin } from "../plugin";
import { resolvePlugins } from "../plugins";
import { indexHtmlMiddware } from "./middlewares/indexHtml";
import { transformMiddleWare } from "./middlewares/transform";
import { staticMiddleWare } from "./middlewares/static";
import { ModuleGraph } from "../ModuleGraph";
import { createWebSocketServer, WSMethods } from "../ws";
import { bindingHMREvents } from "../hmr";

export interface ServerContext {
  /** server 启动的工作目录 */
  root: string;
  /** 插件容器 */
  pluginContainer: PluginContainer;
  /** connect 服务器对象 */
  app: connect.Server;
  /** 服务器插件 */
  plugins: Plugin[];
  /** 依赖图 */
  moduleGraph: ModuleGraph;
  /** HMR 使用的 websocket 连接 */
  ws: WSMethods;
  /** 监听文件变化的监听器 */
  watcher: FSWatcher;
}

export async function startDevServer() {
  const app = connect();
  // 返回当前工作目录（取决于执行命令的目录）
  const root = process.cwd();
  const startTime = Date.now();

  // HMR 资源
  const watcher = chokidar.watch(root, {
    ignored: ["**/node_modules/**", "**/.git/**"],
    ignoreInitial: true,
  });
  const ws = createWebSocketServer();

  // 引入插件
  const plugins = resolvePlugins();
  const pluginContainer = createPluginContainer(plugins);

  // 初始化依赖图
  const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url));

  /** server 的上下文，用来保存一些通用的可能会用到的配置 */
  const serverContext: ServerContext = {
    root: process.cwd(),
    app,
    pluginContainer,
    plugins,
    moduleGraph,
    ws,
    watcher,
  };
  bindingHMREvents(serverContext);

  for (const plugin of plugins) {
    if (plugin.configureServer) {
      await plugin.configureServer(serverContext);
    }
  }
  // 核心编译逻辑（js文件）
  app.use(transformMiddleWare(serverContext));
  // 入口 HTML
  app.use(indexHtmlMiddware(serverContext));
  // 处理具体静态资源的中间件
  app.use(staticMiddleWare());

  app.listen(3000, async () => {
    await optimizer(root);
    console.log(
      green("No-Bundle 服务成功启动！"),
      `耗时: ${Date.now() - startTime}ms`
    ),
      console.log(`> 本地访问路径: ${blue("http://localhost:3000")}`);
  });
}
