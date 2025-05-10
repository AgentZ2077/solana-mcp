import { getBalance } from '../tools/getBalance/index.js';
import { sendSol } from '../tools/sendSol/index.js';
import { mintNFT } from '../tools/mintNFT/index.js';
import { registerPlayer } from '../tools/registerPlayer/index.js';
import { updateLevel } from '../tools/updateLevel/index.js';
import { gameMintItem } from '../tools/gameMintItem/index.js';
import { attack } from '../tools/attack/index.js';

export const tools = {
  getBalance,
  sendSol,
  mintNFT,
  registerPlayer,
  updateLevel,
  gameMintItem,
  attack
};

export const toolList = Object.entries(tools).map(([key, tool]) => ({
  name: key,
  description: tool.description,
  permissions: tool.permissions
}));
