import { tools } from './toolRegistry.js';

export function handleMCPRequest(req, res) {
  const { tool, params } = req.body;
  const selected = tools[tool];
  if (!selected) {
    return res.status(404).json({ error: 'Tool not found' });
  }

  try {
    const validated = selected.schema.parse(params);
    selected.run(validated).then(result => {
      res.json({ result });
    }).catch(e => {
      res.status(500).json({ error: e.message });
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
