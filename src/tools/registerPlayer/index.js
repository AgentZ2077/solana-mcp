import { z } from 'zod';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import idl from '../../../anchor-game-modules/state-module/target/idl/state_module.json' assert { type: 'json' };

const programId = new PublicKey(idl.metadata.address);
const connection = new Connection('https://api.devnet.solana.com');

export const registerPlayer = {
  name: 'registerPlayer',
  description: 'Initialize a player account with name and level',
  schema: z.object({
    secretKey: z.array(z.number()).min(64),
    name: z.string()
  }),
  permissions: ['public'],
  run: async ({ secretKey, name }) => {
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const provider = new AnchorProvider(connection, {
      publicKey: payer.publicKey,
      signTransaction: async tx => tx
    }, {});
    const program = new Program(idl, programId, provider);

    const [playerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("player"), payer.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods.registerPlayer(name).accounts({
      player: playerPDA,
      authority: payer.publicKey,
      systemProgram: web3.SystemProgram.programId
    }).signers([payer]).rpc();

    return {
      tx,
      player: playerPDA.toBase58(),
      explorer: `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    };
  }
};
