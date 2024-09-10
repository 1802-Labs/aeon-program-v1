import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SupersubContracts } from "../target/types/supersub_contracts";
import { expect } from "chai";
import { createAssociatedTokenAccount, createMint, getAccount, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo, transfer } from "@solana/spl-token";

describe("Aeon-contract-tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.SupersubContracts as Program<SupersubContracts>;
  const userWallet = new anchor.web3.Keypair();
  const tokenMinter = new anchor.web3.Keypair();

  const confirm = async (sig: string) => {
    await connection.confirmTransaction(sig, 'confirmed');
  }

  before(async () => {
    const sig1 = await connection.requestAirdrop(userWallet.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);
    const sig2 = await connection.requestAirdrop(tokenMinter.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await confirm(sig1);
    await confirm(sig2);
  })

  describe("Vault Tests", () => {
    const [userVault, ] = anchor.web3.PublicKey.findProgramAddressSync([
      Buffer.from("aeon"), 
      Buffer.from("vault"), 
      userWallet.publicKey.toBuffer()
    ], program.programId)
    const mintKeyPair = new anchor.web3.Keypair()
    const mintDecimals = 6

    before(async () => {
      // create vault
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet.publicKey,
        vault: userVault
      }
      const sig = await program.methods.vaultCreate(new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({...accounts})
        .signers([userWallet])
        .rpc();
      await confirm(sig);

      // create tokenMint
      const mint = await createMint(connection, tokenMinter, tokenMinter.publicKey, null, mintDecimals, mintKeyPair, { commitment: 'confirmed'})

      // mint tokens to the userWallet
      const userWalletATA = await createAssociatedTokenAccount(
        connection,
        tokenMinter,
        mint,
        userWallet.publicKey,
      )
      await mintTo(connection, tokenMinter, mintKeyPair.publicKey, userWalletATA, tokenMinter.publicKey, 1000 * 10**mintDecimals, [userWallet])
    })

    it("Vault Creation!", async () => {
      const vault = await program.account.vault.fetch(userVault);
      const vaultBalance = await connection.getBalance(userVault);
      const userBalance = await connection.getBalance(userWallet.publicKey);

      expect(vault.owner.toString()).to.equals(userWallet.publicKey.toString());
      expect(vaultBalance).to.greaterThanOrEqual(10 * anchor.web3.LAMPORTS_PER_SOL);
      expect(userBalance).to.equals(90 * anchor.web3.LAMPORTS_PER_SOL);
    });
  
    it("Can Transfer SOL to vault", async () => {
      const initialVaultBalance = await connection.getBalance(userVault)
      const transferIx = anchor.web3.SystemProgram.transfer({
        fromPubkey: userWallet.publicKey,
        toPubkey: userVault,
        lamports: 5 * anchor.web3.LAMPORTS_PER_SOL
      })
      const message = new anchor.web3.TransactionMessage({
        payerKey: userWallet.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: [transferIx]
      }).compileToV0Message()
      const txn = new anchor.web3.VersionedTransaction(message)
      txn.sign([userWallet])
      const sig = await connection.sendTransaction(txn, { maxRetries: 1 })
      await confirm(sig)
      const finalVaultBalance = await connection.getBalance(userVault)
      expect(finalVaultBalance - initialVaultBalance).to.equals(5 * anchor.web3.LAMPORTS_PER_SOL)
    })
  
    it("Can Transfer spl token to vault", async () => {
      const vaultAta = await getOrCreateAssociatedTokenAccount(
        connection,
        tokenMinter,
        mintKeyPair.publicKey,
        userVault,
        true
      )
      const userWalletATA = await getAssociatedTokenAddress(mintKeyPair.publicKey, userWallet.publicKey);
      const sig = await transfer(
        connection,
        userWallet,
        userWalletATA,
        vaultAta.address,
        userWallet,
        10 * 10**mintDecimals,
      )
      await confirm(sig)

      const vaultTokenAccount = await getAccount(connection, vaultAta.address, 'confirmed')
      expect(vaultTokenAccount.amount.toString()).to.equals((10 * 10 ** mintDecimals).toString())
      expect(vaultTokenAccount.address.toString()).to.equals(vaultAta.address.toString())
      expect(vaultTokenAccount.mint.toString()).to.equals(mintKeyPair.publicKey.toString())
      expect(vaultTokenAccount.owner.toString()).to.equals(userVault.toString())
    })
  
    it("Can withdraw sol from vault", async () => {
      expect(false).to.equals(true)
    })
  
    it("Can withdraw spl tokens from vault", async () => {
      expect(false).to.equals(true)
    })
  })

  describe("Service/Plan creation tests", () => {
    
  })
});
