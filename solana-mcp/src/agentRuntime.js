// AI Agent Runtime: 决策逻辑引擎
import { tools } from './core/toolRegistry.js';

export class AgentRuntime {
  constructor(agentId, memoryStore) {
    this.agentId = agentId;
    this.memoryStore = memoryStore;
  }

  async run(toolName, params, context = {}) {
    const tool = tools[toolName];
    if (!tool) throw new Error("Tool not found");

    const parsed = tool.schema.parse(params);
    const result = await tool.run(parsed, { agent: this.agentId, context });
    await this.memoryStore.save(this.agentId, { toolName, params, result });

    return result;
  }
}
