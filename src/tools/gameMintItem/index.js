import { z } from 'zod';
import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import idl from '../../../anchor-game-modules/asset-module/target/idl/asset_module.json' assert { type: 'json' };
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com');
const programID = new PublicKey(idl.metadata.address);

export const gameMintItem = {
  name: 'gameMintItem',
  description: 'Call asset_module.mint_item via Anchor',
  schema: z.object({
    mint: z.string(),
    to: z.string(),
    secretKey: z.array(z.number()).min(64)
  }),
  permissions: ['public'],
  run: async ({ mint, to, secretKey }) => {
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const provider = new AnchorProvider(connection, { publicKey: payer.publicKey, signTransaction: async tx => tx }, {});
    const program = new Program(idl, programID, provider);

    const tx = await program.methods
      .mintItem(new web3.BN(1))
      .accounts({
        authority: payer.publicKey,
        mint: new PublicKey(mint),
        to: new PublicKey(to),
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      })
      .signers([payer])
      .rpc();

    return {
      success: true,
      tx,
      explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    };
  }
};
