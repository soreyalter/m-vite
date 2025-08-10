console.log("[vite] connecting...")

export interface Update {
  type: 'js-update' | 'css-update'
}

// 创建客户端 ws 实例
// 在 transform 时再转换 __HMR_PORT__ 为真实数值
const socket = new WebSocket(`ws://localhost:__HMR_PORT__`, 'vite-hmr')

socket.addEventListener('message', async({data}) => {
  handleMessage(JSON.parse(data))
})

async function handleMessage(payload: any) {
  switch (payload.type) {
    case 'connected':
      console.log(`[vite] connected`)
      // 心跳检测
      setInterval(() => socket.send('ping'), 1000)
      break
    case 'update':
      // Module 更新
      payload.updates.forEach((update: Update) => {
        if (update.type === 'js-update') {
          // todo
        }
      });
      break;
  }
}