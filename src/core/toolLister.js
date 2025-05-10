import { toolList } from './toolRegistry.js';

export function listAvailableTools(req, res) {
  return res.json({ tools: toolList });
}
