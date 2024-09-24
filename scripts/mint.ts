import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import { createVault, transferSOLToVault } from "../tests/utils";
import { getKeypair, writePublicKey, writeSecretKey } from "./shared";
import {
  createAssociatedTokenAccount,
  createMint,
  mintTo,
} from "@solana/spl-token";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const feePayer = provider.wallet;

const main = async () => {
  let mintKeyPair: web3.Keypair;
  try {
    mintKeyPair = getKeypair("token-mint");
  } catch (error) {
    console.log(error);
    mintKeyPair = web3.Keypair.generate();
  }
  const minterWallet = getKeypair("token-minter");
  const subscriberWallet = getKeypair("subscriber");
  await createMint(
    connection,
    minterWallet,
    minterWallet.publicKey,
    minterWallet.publicKey,
    6,
    mintKeyPair,
    { commitment: "confirmed" }
  );
  writePublicKey(mintKeyPair.publicKey, "token-mint");
  writeSecretKey(mintKeyPair.secretKey, "token-mint");
  const subscriberATA = await createAssociatedTokenAccount(
    connection,
    minterWallet,
    mintKeyPair.publicKey,
    subscriberWallet.publicKey
  );
  await mintTo(
    connection,
    minterWallet,
    mintKeyPair.publicKey,
    subscriberATA,
    minterWallet.publicKey,
    1000 * 10 ** 6,
    [subscriberWallet]
  );
};

main();
