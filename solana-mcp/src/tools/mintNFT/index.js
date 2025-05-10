import { z } from 'zod';
import {
  Connection, Keypair, PublicKey, Transaction,
  SystemProgram, sendAndConfirmTransaction
} from '@solana/web3.js';

const connection = new Connection("https://api.devnet.solana.com");

export const mintNFTTool = {
  name: "mintNFT",
  schema: z.object({
    secretKey: z.array(z.number()).min(64), // Solana keypair secret (Uint8Array)
    name: z.string(),
    uri: z.string(),
    symbol: z.string()
  }),
  run: async ({ secretKey, name, uri, symbol }) => {
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const mint = Keypair.generate();
    const mintPubkey = mint.publicKey;

    const lamports = await connection.getMinimumBalanceForRentExemption(82);
    const createMintAccountIx = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintPubkey,
      space: 82,
      lamports,
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });

    const tx = new Transaction().add(createMintAccountIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint]);

    return {
      success: true,
      mintAddress: mintPubkey.toBase58(),
      signature: sig,
      explorer: `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    };
  }
};
