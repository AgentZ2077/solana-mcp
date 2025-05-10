# MCP 协议设计草案（Protocol Design Draft）

## 🎯 目标
构建一个 AI Agent 通过 MCP 与链上资源交互的标准框架，服务于多样化游戏场景。

## 📦 协议组成

### 1. Context IO 接口格式
```json
{
  "tool": "getBalance",
  "params": { "pubkey": "..." },
  "agent": "npc_merchant",
  "memoryId": "agent-xyz",
  "signature": "...",
  "context": {
    "time": "2025-05-10T12:00Z",
    "env": "testnet"
  }
}
```

### 2. 权限模型
- 每个 Tool 可设置访问级别（Public / Authenticated / Admin）
- 每个 Agent 在注册时定义其 Tool 权限范围

### 3. 响应格式
```json
{
  "result": { "balance": 3.5 },
  "trace": { "tool": "getBalance", "verified": true }
}
```

