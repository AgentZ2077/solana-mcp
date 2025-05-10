import { tools } from './toolRegistry.js';
import fs from 'fs';
import { ToolError } from './error.js';

const logFile = 'tool-execution-log.json';

export function handleMCPRequest(req, res) {
  const { tool, params } = req.body;
  const selected = tools[tool];

  if (!selected) {
    return res.status(404).json({ error: { code: 'TOOL_NOT_FOUND', message: 'Tool not found' } });
  }

  try {
    const validated = selected.schema.parse(params);
    const start = Date.now();
    selected.run(validated).then(result => {
      const record = {
        tool,
        params,
        result,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - start
      };
      fs.appendFileSync(logFile, JSON.stringify(record) + '\n');
      res.json({ result, timestamp: record.timestamp });
    }).catch(e => {
      const error = e instanceof ToolError
        ? { code: e.code, message: e.message }
        : { code: 'EXEC_ERROR', message: e.message };
      res.status(500).json({ error });
    });
  } catch (e) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: e.message } });
  }
}
