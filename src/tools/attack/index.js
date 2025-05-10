import { z } from 'zod';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import idl from '../../../anchor-game-modules/behavior-module/target/idl/behavior_module.json' assert { type: 'json' };

const connection = new Connection("https://api.devnet.solana.com");
const programId = new PublicKey(idl.metadata.address);

export const attack = {
  name: 'attack',
  description: 'Simulate an attack: reduce player HP by a given amount',
  schema: z.object({
    secretKey: z.array(z.number()).min(64),
    player: z.string(),
    damage: z.number().min(1).max(255)
  }),
  permissions: ['public'],
  run: async ({ secretKey, player, damage }) => {
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const provider = new AnchorProvider(connection, {
      publicKey: payer.publicKey,
      signTransaction: async tx => tx
    }, {});
    const program = new Program(idl, programId, provider);

    const tx = await program.methods.attack(damage).accounts({
      player: new PublicKey(player),
      owner: payer.publicKey
    }).signers([payer]).rpc();

    return {
      success: true,
      tx,
      explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    };
  }
};
