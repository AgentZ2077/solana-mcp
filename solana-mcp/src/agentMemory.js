// Local Memory Store - can be replaced by on-chain PDA later
import fs from 'fs';
const DB_FILE = './agent-memory.json';

export class MemoryStore {
  constructor() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');
    this.memory = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }

  async save(agentId, record) {
    if (!this.memory[agentId]) this.memory[agentId] = [];
    this.memory[agentId].push({ ...record, timestamp: new Date().toISOString() });
    fs.writeFileSync(DB_FILE, JSON.stringify(this.memory, null, 2));
  }

  async get(agentId) {
    return this.memory[agentId] || [];
  }
}
