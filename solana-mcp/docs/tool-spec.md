# Tool 模块规范（Tool Specification）

## 工具结构定义
```ts
export interface MCPTool {
  name: string;
  description: string;
  schema: z.ZodSchema<any>;
  run: (params: any, context: ToolContext) => Promise<any>;
  permissions?: ("public" | "authenticated" | "admin")[];
}
```

## 注册方式
所有工具需导出一个符合 `MCPTool` 接口的对象并注册至 `toolRegistry`

