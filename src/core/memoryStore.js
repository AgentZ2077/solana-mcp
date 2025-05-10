import fs from 'fs';
const DB_FILE = './agent-memory.json';

class MemoryStore {
  constructor() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');
    this.db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  }

  async save(agentId, data) {
    if (!this.db[agentId]) this.db[agentId] = [];
    this.db[agentId].push(data);
    fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2));
  }

  async get(agentId) {
    return this.db[agentId] || [];
  }
}

export const memoryStore = new MemoryStore();
