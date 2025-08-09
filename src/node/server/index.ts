import connect from "connect";
import { blue, green } from "picocolors";

import { optimizer } from "../optimizer";
import { createPluginContainer, PluginContainer } from "../pluginContainer";
import { Plugin } from "../plugin";
import { resolvePlugins } from "../plugins";
import { indexHtmlMiddware } from "./middlewares/indexHtml";
import { transformMiddleWare } from "./middlewares/transform";
import { staticMiddleWare } from "./middlewares/static";

export interface ServerContext {
  /** server 启动的工作目录 */
  root: string;
  /** 插件容器 */
  pluginContainer: PluginContainer;
  /** connect 服务器对象 */
  app: connect.Server;
  /** 服务器插件 */
  plugins: Plugin[];
}

export async function startDevServer() {
  const app = connect();
  // 返回当前工作目录（取决于执行命令的目录）
  const root = process.cwd();
  const startTime = Date.now();

  // 引入插件
  const plugins = resolvePlugins();
  const pluginContainer = createPluginContainer(plugins);

  const serverContext: ServerContext = {
    root: process.cwd(),
    app,
    pluginContainer,
    plugins,
  };

  for (const plugin of plugins) {
    if (plugin.configureServer) {
      await plugin.configureServer(serverContext);
    }
  }
  // 核心编译逻辑（js文件）
  app.use(transformMiddleWare(serverContext))
  // 入口 HTML
  app.use(indexHtmlMiddware(serverContext))
  // 处理具体静态资源的中间件
  app.use(staticMiddleWare())

  app.listen(3000, async () => {
    await optimizer(root);
    console.log(
      green("No-Bundle 服务成功启动！"),
      `耗时: ${Date.now() - startTime}ms`
    ),
      console.log(`> 本地访问路径: ${blue("http://localhost:3000")}`);
  });
}
