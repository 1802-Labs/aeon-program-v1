import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import {
  createVault,
  transferSOLToVault,
  transferTokenToVault,
} from "../tests/utils";
import { getKeypair } from "./shared";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const feePayer = provider.wallet;
const program = anchor.workspace.AeonProgram as Program<AeonProgram>;
const mintKeyPair = getKeypair("token-mint");
const tokenMinter = getKeypair("token-minter");

const main = async (walletName: string) => {
  // create vault for the user
  const userWallet = getKeypair(walletName);
  const [vaultKey] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("aeon"),
      Buffer.from("vault"),
      userWallet.publicKey.toBuffer(),
    ],
    program.programId
  );
  try {
    const sig = await createVault(connection, program, userWallet, vaultKey, 1);
    console.log(`Vault Create Transaction Signature: ${sig}`);
  } catch (error) {
    console.log(error);
  }
  // transfer sol to the vault
  const trfSig = await transferSOLToVault(
    connection,
    vaultKey,
    userWallet,
    0.1
  );
  // withdraw sol from the vault
  const sWSig = await program.methods
    .vaultWithdrawSol(new anchor.BN(0.01 * web3.LAMPORTS_PER_SOL))
    .accounts({
      ...{
        feePayer: feePayer.publicKey,
        owner: userWallet.publicKey,
        vault: vaultKey,
        destination: userWallet.publicKey,
      },
    })
    .signers([userWallet])
    .rpc();
  const { sig: tknTrfSig } = await transferTokenToVault(
    connection,
    vaultKey,
    mintKeyPair.publicKey,
    tokenMinter,
    userWallet,
    500,
    6
  );

  const vaultAta = await getOrCreateAssociatedTokenAccount(
    connection,
    tokenMinter,
    mintKeyPair.publicKey,
    vaultKey,
    true
  );

  const tknWSig = await program.methods
    .vaultWithdrawToken(new anchor.BN(50 * 10 ** 6))
    .accounts({
      ...{
        feePayer: feePayer.publicKey,
        owner: userWallet.publicKey,
        vault: vaultKey,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta: vaultAta.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    })
    .signers([userWallet])
    .rpc();

  console.log(`Vault Address: ${vaultKey.toString()}`);
  console.log(`Sol Transfer Signature: ${trfSig}`);
  console.log(`Sol Withdraw Sig: ${sWSig}`);
  console.log(`Token transfer Signature: ${tknTrfSig}`);
  console.log(`Token Withdrawal Signature: ${tknWSig}`);
};

main("subscriber");
