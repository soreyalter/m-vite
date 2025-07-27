### Namespace 的工作机制

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

