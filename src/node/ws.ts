import connect from "connect";
import { WebSocketServer } from "ws";
import { HMR_PORT } from "./const";
import { red } from "picocolors";

export interface WSMethods {
  /** WebSocket 广播 */
  send: (payload: Object) => void;
  /** 关闭 WebSocket 连接 */
  close: () => void;
}

/** 创建一个 ws 连接，并返回一个广播方法和关闭方法 */
export function createWebSocketServer(): WSMethods {
  let wss: WebSocketServer = new WebSocketServer({ port: HMR_PORT });
  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "connected" }));
  });
  wss.on("error", (e: Error & { code: string }) => {
    if (e.code !== "EADDRINUSE") {
      // 给定的地址已经被使用
      console.error(red(`WebSocket server error:\n${e.stack || e.message}`));
    }
  });

  return {
    send(payload: Object) {
      const stringified = JSON.stringify(payload);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(stringified);
        }
      });
    },
    close() {
      wss.close();
    },
  };
}
