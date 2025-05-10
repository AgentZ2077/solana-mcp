import { tools } from './core/toolRegistry.js';
import { memoryStore } from './core/memoryStore.js';

export class AgentRuntime {
  constructor(agentId) {
    this.agentId = agentId;
  }

  async execute(toolName, params) {
    const tool = tools[toolName];
    if (!tool) throw new Error('Tool not found');

    if (tool.permissions && !tool.permissions.includes('public')) {
      // Extend this with JWT/session checks later
      throw new Error('Permission denied');
    }

    const validated = tool.schema.parse(params);
    const result = await tool.run(validated);
    await memoryStore.save(this.agentId, {
      tool: toolName,
      params,
      result,
      timestamp: new Date().toISOString()
    });
    return result;
  }
}
