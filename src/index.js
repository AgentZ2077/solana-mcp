import express from 'express';
import { handleMCPRequest } from './core/handler.js';
import { listAvailableTools } from './core/toolLister.js';

const app = express();
app.use(express.json());

app.post('/mcp', handleMCPRequest);
app.get('/mcp/tools', listAvailableTools);

app.listen(3000, () => {
  console.log('✅ MCP server is running at http://localhost:3000');
});
