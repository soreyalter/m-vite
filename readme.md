# Mini-vite Notes

## 依赖介绍

### connect 

```
connect 是一个具有中间件机制的轻量级 Node.js 框架。
既可以单独作为服务器，也可以接入到任何具有中间件机制的框架中，如 Koa、Express
```

### path

#### resovle

```js
// 拼合参数为路径，如果遇到绝对路径则重新开始，相对路径则拼起来
// 如果拼合得到一个相对路径，则将 cwd() 拼到开头
path.resolve('a', 'b', 'c') // "cwd()/a/b/c"
path.resolve('a', '/b', 'c')  // "/b/c" 这里 "/b" 是一个绝对路径
```


## Esbuild

### `build()` 配置

esbuild 提供了一个 build 函数来启动构建过程。

```ts
import {build} from 'esbuild'
```

`build` 函数中可以传入一个 `options` 对象，其中一部分字段如下。

```ts
require('esbuild').build({
  entryPoints: ['src/index.ts'],
  write: true,
  bundle: true,
  outfile: 'dist/bundle.js',
  plugins: [...]
  ...
})
```

### EsBuild 的 Plugin 

`plugins` 字段是一个 `Plugin` 类型的数组。其结构如下所示。

```ts
{
  name: 'example-plugin',
  setup(build) {
    // 可以使用 onResolve 拦截模块解析
    build.onResolve(...)
    // 可以使用 onLoad 拦截加载文件内容
    build.onLoad(...)
  }
}
```

#### `onResolve` 钩子

函数签名：`build.onResolve({ filter, namespace? }, callback)`。会在解析**入口**和**解析 `import` 语句**时触发

- `filter` 一个正则表达式，匹配需要拦截的模块 ID（如`'virtual:xxx'`、`'@/utils'`）
- `namespace` 可选，命名空间（默认是 `file` ，用于筛选和隔离模块系统
- `callback(args)` 当 `filter` 匹配时执行的回调函数

##### 回调函数签名

```ts
callback: (args: OnResolveArgs) => 
  (
    OnResolveResult | 
    null | 
    undefined | 
    Promise<OnResolveResult | 
    null | 
    undefined>
  )
```

##### 形参列表

```ts
export interface OnResolveArgs {
  // import 的原始路径，如 'virtual:config'
  path: string
  // import 当前文件的文件
  importer: string
  // 当前命名空间（默认 'file'）
  namespace: string
  // 当前解析目录（用于相对路径解析）
  resolveDir: string
  // 导入类型：'import-statement', 'require-call' 等
  kind: ImportKind
  // 来自上一个钩子传递的数据（如来自 resolve）
  pluginData: any
  with: Record<string, string>
}
```

##### 返回值

```ts
return {
  path: string,           // 解析后的路径（必须）
  external?: boolean,     // 是否标记为外部依赖（不打包）
  namespace?: string,     // 设置命名空间，影响后续 load
  pluginData?: any,       // 传递给 load 钩子的数据
  watchFiles?: string[],  // 文件列表，变化时重新构建
  watchDirs?: string[],   // 目录列表，变化时重新构建
}
```

#### Namespace 的工作机制

模块路径的完整标识.

ESBuild 内部使用 `namespace:path` 的格式来唯一标识一个模块.

```jsonc
// 示例模块标识
// namespace=dep, path=react
"dep:react"                           
// namespace=file, path=/project/src/App.tsx
"file:/project/src/App.tsx"          
// 默认 namespace, path=/project/node_modules/react/index.js
"/project/node_modules/react/index.js" 
```

