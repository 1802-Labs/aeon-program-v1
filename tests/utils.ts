import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";

type PlanInfo = {
  chargeAmount: anchor.BN;
  interval: anchor.BN;
  tokenMint: web3.PublicKey | null;
  recipient: web3.PublicKey;
};

export const confirm = async (connection: web3.Connection, sig: string) => {
  await connection.confirmTransaction(sig, "confirmed");
};

export const transferSOLToVault = async (
  connection: web3.Connection,
  vault: web3.PublicKey,
  from: web3.Keypair,
  amount: number
) => {
  const transferIx = web3.SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: vault,
    lamports: amount * web3.LAMPORTS_PER_SOL,
  });
  const message = new web3.TransactionMessage({
    payerKey: from.publicKey,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: [transferIx],
  }).compileToV0Message();
  const txn = new web3.VersionedTransaction(message);
  txn.sign([from]);
  const sig = await connection.sendTransaction(txn, { maxRetries: 1 });
  await confirm(connection, sig);
};

export const transferTokenToVault = async (
  connection: web3.Connection,
  vault: web3.PublicKey,
  mint: web3.PublicKey,
  tokenMinter: web3.Keypair,
  owner: web3.Keypair,
  amount: number,
  decimals: number
) => {
  const destinationAta = await getOrCreateAssociatedTokenAccount(
    connection,
    tokenMinter,
    mint,
    vault,
    true
  );
  const sourceATA = await getAssociatedTokenAddress(mint, owner.publicKey);
  const sig = await transfer(
    connection,
    owner,
    sourceATA,
    destinationAta.address,
    owner,
    amount * 10 ** decimals
  );
  await confirm(connection, sig);
  return { sourceATA, destinationAta };
};

export const createVault = async (
  connection: web3.Connection,
  program: anchor.Program<AeonProgram>,
  owner: web3.Keypair,
  vaultKey: web3.PublicKey,
  initAmount: number
) => {
  const accounts = {
    feePayer: anchor.getProvider().publicKey,
    owner: owner.publicKey,
    vault: vaultKey,
  };
  const sig = await program.methods
    .vaultCreate(new anchor.BN(initAmount * web3.LAMPORTS_PER_SOL))
    .accounts({ ...accounts })
    .signers([owner])
    .rpc();
  await confirm(connection, sig);
};

export const createService = async (
  connection: web3.Connection,
  program: anchor.Program<AeonProgram>,
  owner: web3.Keypair,
  vaultKey: web3.PublicKey,
  serviceKey: web3.PublicKey,
  id: number,
  plans: PlanInfo[]
) => {
  const accounts = {
    feePayer: anchor.getProvider().publicKey,
    owner: owner.publicKey,
    vault: vaultKey,
    service: serviceKey,
  };
  const sig = await program.methods
    .serviceCreate(new anchor.BN(id), plans)
    .accounts({ ...accounts })
    .signers([owner])
    .rpc();
  await confirm(connection, sig);
};
