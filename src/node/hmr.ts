import { resolveWindowPath } from "../utils";
import { ServerContext } from "./server";
import { blue, green } from "picocolors";

export function bindingHMREvents(serverContext: ServerContext) {
  const { watcher, ws } = serverContext;

  watcher.on("change", async (file) => {
    console.log(`${blue("[hmr]")} ${green(file)} changed`);
    const { moduleGraph } = serverContext;
    // 清除依赖图中的缓存
    moduleGraph.invalidateModule(file);
    // 给客户端推送更新
    ws.send({
      type: "update",
      updates: [
        {
          type: "js-update",
          timestamp: Date.now(),
          path: resolveWindowPath(file),
          acceptedPath: resolveWindowPath(file),
        },
      ],
    });
  });
}
