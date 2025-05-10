import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection("https://api.mainnet-beta.solana.com");

export async function getBalance(pubkey) {
  const key = new PublicKey(pubkey);
  const lamports = await connection.getBalance(key);
  return lamports / 1e9;
}
