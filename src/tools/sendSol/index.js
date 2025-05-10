import { z } from 'zod';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');

export const sendSol = {
  name: 'sendSol',
  description: 'Send SOL from a wallet to another',
  schema: z.object({
    fromSecretKey: z.array(z.number()).min(64),
    to: z.string(),
    amount: z.number()
  }),
  permissions: ['public'],
  run: async ({ fromSecretKey, to, amount }) => {
    const from = Keypair.fromSecretKey(Uint8Array.from(fromSecretKey));
    const toPubkey = new PublicKey(to);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey,
        lamports: amount * 1e9
      })
    );
    const signature = await sendAndConfirmTransaction(connection, tx, [from]);
    return { signature, explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet` };
  }
};
