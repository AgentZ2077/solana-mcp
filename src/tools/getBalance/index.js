import { z } from 'zod';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');

export const getBalance = {
  name: 'getBalance',
  description: 'Get SOL balance of a wallet',
  schema: z.object({
    pubkey: z.string().min(32)
  }),
  permissions: ['public'],
  run: async ({ pubkey }) => {
    const balance = await connection.getBalance(new PublicKey(pubkey));
    return { pubkey, balance: balance / 1e9 };
  }
};
