# solana-mcp

> ✨ AI × Web3 × Solana：一个模块化的链上 AI 协议框架，用于构建下一代 AI 驱动游戏

## 🔧 项目组成

- `src/`：MCP Server 主体（Express + Solana Web3）
- `docs/`：协议设计说明、工具规范、AI 语义调用结构
- `anchor-game-contracts/`：Rust 写的可部署合约模块（基于 Anchor）
- `public/`：简单前端测试页面
- `agentRuntime.js`：AI Agent 决策引擎
- `MemoryStore`：链下记忆存储，未来可迁移到链上 PDA

## 🚀 快速启动

```bash
pnpm install
pnpm start
```

访问：http://localhost:3000 查看前端页面

## 🛠️ 链上真实工具

- `getBalance`: 查询 Solana 钱包余额
- `mintNFT`: 使用私钥在 Devnet 上真实铸造 NFT

## 📦 合约说明

Rust 合约代码位于 `anchor-game-contracts/`，基于 Anchor 框架构建。
你可以使用 `scripts/deploy.sh` 一键部署到 Devnet。

## 🤝 授权协议

MIT License
