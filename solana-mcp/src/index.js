import express from 'express';
import { handleMCPRequest } from './core/router.js';

const app = express();
app.use(express.json());
app.post('/mcp', handleMCPRequest);
app.use(express.static('public'));

app.listen(3000, () => {
  console.log("🚀 MCP server running at http://localhost:3000");
});
