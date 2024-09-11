import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SupersubContracts } from "../target/types/supersub_contracts";
import { assert, expect } from "chai";
import { createAssociatedTokenAccount, createAssociatedTokenAccountInstruction, createMint, getAccount, getAssociatedTokenAddress, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID, transfer } from "@solana/spl-token";

describe("Aeon-contract-tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.SupersubContracts as Program<SupersubContracts>;
  const userWallet = new anchor.web3.Keypair();
  const userWallet2 = new anchor.web3.Keypair();
  const tokenMinter = new anchor.web3.Keypair();

  const confirm = async (sig: string) => {
    await connection.confirmTransaction(sig, 'confirmed');
  }

  const transferSOLToVault = async (vault: anchor.web3.PublicKey, from: anchor.web3.Keypair, amount: number) => {
    const transferIx = anchor.web3.SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: vault,
      lamports: amount * anchor.web3.LAMPORTS_PER_SOL
    })
    const message = new anchor.web3.TransactionMessage({
      payerKey: from.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: [transferIx]
    }).compileToV0Message()
    const txn = new anchor.web3.VersionedTransaction(message)
    txn.sign([from])
    const sig = await connection.sendTransaction(txn, { maxRetries: 1 })
    await confirm(sig)
  }

  const transferTokenToVault = async (
    vault: anchor.web3.PublicKey, 
    mint: anchor.web3.PublicKey,
    owner: anchor.web3.Keypair,
    amount: number,
    decimals: number
  ) => {
    const destinationAta = await getOrCreateAssociatedTokenAccount(
      connection,
      tokenMinter,
      mint,
      vault,
      true
    )
    const sourceATA = await getAssociatedTokenAddress(mint, owner.publicKey);
    const sig = await transfer(
      connection,
      owner,
      sourceATA,
      destinationAta.address,
      owner,
      amount * 10**decimals,
    )
    await confirm(sig);
    return { sourceATA, destinationAta }
  }

  before(async () => {
    const sig1 = await connection.requestAirdrop(userWallet.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);
    const sig2 = await connection.requestAirdrop(tokenMinter.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    const sig3 = await connection.requestAirdrop(userWallet2.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);
    await confirm(sig1);
    await confirm(sig2);
    await confirm(sig3)
  })

  describe("Vault Tests", () => {
    const [userVault, ] = anchor.web3.PublicKey.findProgramAddressSync([
      Buffer.from("aeon"), 
      Buffer.from("vault"), 
      userWallet.publicKey.toBuffer()
    ], program.programId)
    const [userVault2, ] = anchor.web3.PublicKey.findProgramAddressSync([
      Buffer.from("aeon"), 
      Buffer.from("vault"), 
      userWallet2.publicKey.toBuffer()
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
      const accounts2 = {
        ...accounts,
        owner: userWallet2.publicKey,
        vault: userVault2
      }
      const sig = await program.methods.vaultCreate(new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({...accounts})
        .signers([userWallet])
        .rpc();
      const sig2 = await program.methods.vaultCreate(new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({...accounts2})
        .signers([userWallet2])
        .rpc();
      await confirm(sig);
      await confirm(sig2)

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
      await transferSOLToVault(userVault, userWallet, 5);
      const finalVaultBalance = await connection.getBalance(userVault)
      expect(finalVaultBalance - initialVaultBalance).to.equals(5 * anchor.web3.LAMPORTS_PER_SOL)
    })
  
    it("Can Transfer spl token to vault", async () => {
      const { destinationAta: vaultAta } = await transferTokenToVault(userVault, mintKeyPair.publicKey, userWallet, 10, mintDecimals);
      const vaultTokenAccount = await getAccount(connection, vaultAta.address, 'confirmed')
      expect(vaultTokenAccount.amount.toString()).to.equals((10 * 10 ** mintDecimals).toString())
      expect(vaultTokenAccount.address.toString()).to.equals(vaultAta.address.toString())
      expect(vaultTokenAccount.mint.toString()).to.equals(mintKeyPair.publicKey.toString())
      expect(vaultTokenAccount.owner.toString()).to.equals(userVault.toString())
    })
  
    it("Can withdraw sol from vault to owner account", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet.publicKey,
        vault: userVault,
        destination: userWallet.publicKey
      }
      const initialVaultBalance = await connection.getBalance(userVault);
      const initialUserBalance = await connection.getBalance(userWallet.publicKey);
      await program.methods.vaultWithdrawSol(new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({...accounts})
        .signers([userWallet])
        .rpc()
      const finalVaultBalance = await connection.getBalance(userVault);
      const finalUserBalance = await connection.getBalance(userWallet.publicKey);

      expect(initialVaultBalance - finalVaultBalance).to.equals(1 * anchor.web3.LAMPORTS_PER_SOL);
      expect(finalUserBalance - initialUserBalance).to.equals(1 * anchor.web3.LAMPORTS_PER_SOL);
    })

    it("Can withdraw sol from vault to different account", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet.publicKey,
        vault: userVault,
        destination: userWallet2.publicKey
      }
      const initialVaultBalance = await connection.getBalance(userVault);
      const initialUserBalance = await connection.getBalance(userWallet2.publicKey);
      await program.methods.vaultWithdrawSol(new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({...accounts})
        .signers([userWallet])
        .rpc()
      const finalVaultBalance = await connection.getBalance(userVault);
      const finalUserBalance = await connection.getBalance(userWallet2.publicKey);

      expect(initialVaultBalance - finalVaultBalance).to.equals(1 * anchor.web3.LAMPORTS_PER_SOL);
      expect(finalUserBalance - initialUserBalance).to.equals(1 * anchor.web3.LAMPORTS_PER_SOL);
    })
  
    it("Can withdraw spl tokens from vault to owner", async () => {
      const { destinationAta: vaultAta, sourceATA: destinationAta } = await transferTokenToVault(userVault, mintKeyPair.publicKey, userWallet, 10, mintDecimals);

      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet.publicKey,
        vault: userVault,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta,
        tokenProgram: TOKEN_PROGRAM_ID
      }
      const initialVaultAta = await getAccount(connection, vaultAta.address, 'confirmed');
      const initialDestinationAta = await getAccount(connection, destinationAta, 'confirmed');
      const sig = await program.methods.vaultWithdrawToken(new anchor.BN(5 * 10 ** mintDecimals))
        .accounts({...accounts})
        .signers([userWallet])
        .rpc()
      await confirm(sig);
      const finalVaultAta = await getAccount(connection, vaultAta.address, 'confirmed');
      const finalDestinationAta = await getAccount(connection, destinationAta, 'confirmed');
      
      expect((initialVaultAta.amount - finalVaultAta.amount).toString()).to.equals((5 * 10 ** mintDecimals).toString())
      expect((finalDestinationAta.amount - initialDestinationAta.amount).toString()).to.equals((5 * 10 ** mintDecimals).toString())
    })

    it("Can withdraw spl tokens from vault to different account", async () => {
      // Create a PR to @solana/web3.js to correct the off curve issue on createAssociaredTokenAccount
      const { destinationAta: vaultAta } = await transferTokenToVault(userVault, mintKeyPair.publicKey, userWallet, 10, mintDecimals);
      const destinationAta = getAssociatedTokenAddressSync(mintKeyPair.publicKey, userVault2, true);
      const transaction = (new anchor.web3.Transaction()).add(
          createAssociatedTokenAccountInstruction(
              tokenMinter.publicKey,
              destinationAta,
              userVault2,
              mintKeyPair.publicKey
          )
      );
      const sig0 = await connection.sendTransaction(transaction, [tokenMinter]);
      await confirm(sig0);
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet.publicKey,
        vault: userVault,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta: destinationAta,
        tokenProgram: TOKEN_PROGRAM_ID
      }
      const initialVaultAta = await getAccount(connection, vaultAta.address, 'confirmed');
      const initialDestinationAta = await getAccount(connection, destinationAta, 'confirmed');
      const sig = await program.methods.vaultWithdrawToken(new anchor.BN(5 * 10 ** mintDecimals))
        .accounts({...accounts})
        .signers([userWallet])
        .rpc()
      await confirm(sig);
      const finalVaultAta = await getAccount(connection, vaultAta.address, 'confirmed');
      const finalDestinationAta = await getAccount(connection, destinationAta, 'confirmed');
      
      expect((initialVaultAta.amount - finalVaultAta.amount).toString()).to.equals((5 * 10 ** mintDecimals).toString())
      expect((finalDestinationAta.amount - initialDestinationAta.amount).toString()).to.equals((5 * 10 ** mintDecimals).toString())
    })

    it("Cannot withdraw more SOL than rent from vault", async () => {
      // Every PDA has to have some lamports for rent exemption. We need to ensure that the 
      // user cannot withdraw more SOL that it makes the balance of the PDA less than what's
      // required for rent exemption or to zero.
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet.publicKey,
        vault: userVault,
        destination: userWallet.publicKey
      }
      const initialVaultBalance = await connection.getBalance(userVault);
      try {
        await program.methods.vaultWithdrawSol(new anchor.BN(initialVaultBalance))
          .accounts({...accounts})
          .signers([userWallet])
          .rpc()
        assert.ok(false)
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorCode.code).to.equals('VaultRentExemptError')
      }
    })

    it("Cannot withdraw sol from vault not owned", async () => {
      // We need to be sure that trying to withdraw sol from a vault that's not 
      // owned by the user returns an error
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet.publicKey,
        vault: userVault2,
        destination: userWallet.publicKey
      }
      const initialVaultBalance = await connection.getBalance(userVault2);
      try {
        await program.methods.vaultWithdrawSol(new anchor.BN(initialVaultBalance))
          .accounts({...accounts})
          .signers([userWallet])
          .rpc()
        assert.ok(false)
      } catch (error) {
        assert.ok(true)
      }
    })

    it("Cannot withdraw spl-token from vault not owned", async () => {
      // same logic as the previous test
      // The idea here is to attempt to withdraw tokens from a vault
      // owned by userWallet but the signer(owner) is userWallet2 and the destination is userWallet2

      const { destinationAta: vaultAta } = await transferTokenToVault(userVault, mintKeyPair.publicKey, userWallet, 10, mintDecimals);
      const userWallet2Ata = getAssociatedTokenAddressSync(mintKeyPair.publicKey, userWallet2.publicKey, false);
      const transaction = (new anchor.web3.Transaction()).add(
          createAssociatedTokenAccountInstruction(
              tokenMinter.publicKey,
              userWallet2Ata,
              userWallet2.publicKey,
              mintKeyPair.publicKey
          )
      );
      const sig0 = await connection.sendTransaction(transaction, [tokenMinter]);
      await confirm(sig0);

      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet2.publicKey,
        vault: userVault,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta: userWallet2Ata,
        tokenProgram: TOKEN_PROGRAM_ID
      }
      try {
        await program.methods.vaultWithdrawToken(new anchor.BN(5 * 10 ** mintDecimals))
          .accounts({...accounts})
          .signers([userWallet2])
          .rpc()
        assert.ok(false)
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorMessage).to.equals("A seeds constraint was violated")
      }
    })

    it("Cannot withdraw spl-token from wrong ata", async () => {
      // We need to ensure that the associated token account passed as the "vault_ata"
      // is owned by the vault pda. Otherwise, we should not allow removing tokens from it
      // The idea here is to attempt removing tokens from a vault_ata account not owned by the current owner's vault
      
      const { destinationAta: vaultAta } = await transferTokenToVault(userVault, mintKeyPair.publicKey, userWallet, 10, mintDecimals);
      const userWallet2Ata = getAssociatedTokenAddressSync(mintKeyPair.publicKey, userWallet2.publicKey, false);

      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: userWallet2.publicKey,
        vault: userVault2,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta: userWallet2Ata,
        tokenProgram: TOKEN_PROGRAM_ID
      }
      try {
        await program.methods.vaultWithdrawToken(new anchor.BN(5 * 10 ** mintDecimals))
          .accounts({...accounts})
          .signers([userWallet2])
          .rpc()
        assert.ok(false)
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorMessage).to.equals("The specified vault token account is not owned by the owner vault")
      }
    })
  })

  describe("Service/Plan creation tests", () => {
    
  })
});
