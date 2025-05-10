import { z } from 'zod';
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com');

export const mintNFT = {
  name: 'mintNFT',
  description: 'Mint a real NFT on Solana devnet using Metaplex metadata',
  schema: z.object({
    secretKey: z.array(z.number()).min(64),
    name: z.string(),
    symbol: z.string(),
    uri: z.string()
  }),
  permissions: ['public'],
  run: async ({ secretKey, name, symbol, uri }) => {
    const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    const mint = Keypair.generate();
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);

    const metadataPDA = PublicKey.findProgramAddressSync([
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer()
    ], TOKEN_METADATA_PROGRAM_ID)[0];

    const ata = await PublicKey.findProgramAddressSync([
      payer.publicKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer()
    ], new PublicKey("ATokenGPvbdGVxr1zdpNGzzz2Kz6vA1sLUGXhF7bX2t"));

    const tx = new Transaction()
      .add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint.publicKey,
          space: 82,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID
        }),
        createInitializeMintInstruction(mint.publicKey, 0, payer.publicKey, payer.publicKey),
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          ata[0],
          payer.publicKey,
          mint.publicKey,
          TOKEN_PROGRAM_ID,
          new PublicKey("ATokenGPvbdGVxr1zdpNGzzz2Kz6vA1sLUGXhF7bX2t")
        ),
        createMintToInstruction(mint.publicKey, ata[0], payer.publicKey, 1),
        createCreateMetadataAccountV3Instruction({
          metadata: metadataPDA,
          mint: mint.publicKey,
          mintAuthority: payer.publicKey,
          payer: payer.publicKey,
          updateAuthority: payer.publicKey
        }, {
          createMetadataAccountArgsV3: {
            data: {
              name,
              symbol,
              uri,
              sellerFeeBasisPoints: 0,
              creators: null,
              collection: null,
              uses: null
            },
            isMutable: true,
            collectionDetails: null
          }
        })
      );

    const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint]);
    return {
      signature: sig,
      mint: mint.publicKey.toBase58(),
      explorer: `https://explorer.solana.com/tx/${sig}?cluster=devnet`
    };
  }
};
