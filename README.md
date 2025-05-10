# 🧠 solana-mcp

> Modular AI Agent Runtime & Solana MCP Framework — for building on-chain AI-powered games.

---

## 🚀 Overview

This project provides a full implementation of a Model Context Protocol (MCP)-based interaction server, allowing AI agents to communicate securely and transparently with Solana-based smart contracts and game logic modules.

Built to enable the next generation of **AI-powered blockchain games**.

---

## 📦 Features

- 🧠 **Agent Runtime**: supports tool execution, memory persistence, and audit trail
- 🔧 **MCP Toolchain**: plug-and-play tools with schema validation and permission control
- 🔗 **Solana Integration**: real RPC calls, SPL/NFT minting, and Anchor contract execution
- 🧱 **Modular Game Contracts**:
  - `state_module`: Player registration, level-up logic
  - `asset_module`: Mint NFTs or in-game items
  - `behavior_module`: Action evaluation (e.g., attack, damage)

---

## 🛠 Tool APIs

| Tool | Description |
|------|-------------|
| `getBalance` | Get SOL balance from any wallet |
| `sendSol` | Transfer SOL using private key |
| `mintNFT` | Mint NFT via Metaplex on Devnet |
| `registerPlayer` | Initialize player state on-chain |
| `updateLevel` | Modify level of a registered player |
| `gameMintItem` | Call Anchor contract to mint NFT |
| `attack` | Attack a player (reduce HP if valid) |

---

## 🧰 Usage

```bash
pnpm install
pnpm start
```

> Endpoint: `POST /mcp`

Request format:
```json
{
  "tool": "getBalance",
  "params": {
    "pubkey": "..."
  }
}
```

---

## 🔍 Discover Available Tools

```bash
GET /mcp/tools
```

Returns metadata for all registered tools.

---

## 📡 Contracts

Anchor-based programs under:
- `anchor-game-modules/asset-module`
- `anchor-game-modules/state-module`
- `anchor-game-modules/behavior-module`

Deploy using:

```bash
cd anchor-game-modules/asset-module
anchor build && anchor deploy
```

---

## 🧠 Agent Design (High-Level)

Agents can:
- Retrieve context from Solana
- Decide based on on-chain state
- Execute secure transactions via MCP

Memory logs are stored for each agent session.

---

## 🪪 License

MIT

---

Made with ❤️ for decentralized AI gaming.
