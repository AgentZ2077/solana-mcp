import { z } from 'zod';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import idl from '../../../anchor-game-modules/state-module/target/idl/state_module.json' assert { type: 'json' };

const programId = new PublicKey(idl.metadata.address);
const connection = new Connection('https://api.devnet.solana.com');

export const updateLevel = {
  name: 'updateLevel',
  description: 'Update player level',
  schema: z.object({
    secretKey: z.array(z.number()).min(64),
    player: z.string(),
    level: z.number().min(1).max(100)
  }),
  permissions: ['public'],
  run: async ({ secretKey, player, level }) => {
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const provider = new AnchorProvider(connection, {
      publicKey: payer.publicKey,
      signTransaction: async tx => tx
    }, {});
    const program = new Program(idl, programId, provider);

    const tx = await program.methods.updateLevel(level).accounts({
      player: new PublicKey(player),
      owner: payer.publicKey
    }).signers([payer]).rpc();

    return {
      tx,
      explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    };
  }
};
