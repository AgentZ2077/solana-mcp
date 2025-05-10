import { tools } from './toolRegistry.js';
import fs from 'fs';

const exportTools = Object.entries(tools).map(([key, tool]) => ({
  name: key,
  description: tool.description,
  permissions: tool.permissions,
  schema: tool.schema?.toString()
}));

fs.writeFileSync('tools.json', JSON.stringify(exportTools, null, 2));
console.log('✅ tools.json generated');
