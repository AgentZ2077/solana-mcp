import { z } from 'zod';
import { getBalance } from '../../solana/connection.js';

export const getBalanceTool = {
  name: "getBalance",
  schema: z.object({
    pubkey: z.string().min(32)
  }),
  run: async ({ pubkey }) => {
    const balance = await getBalance(pubkey);
    return { pubkey, balance };
  }
};
