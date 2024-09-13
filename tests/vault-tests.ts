import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import { assert, expect } from "chai";
import {
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { confirm, transferSOLToVault, transferTokenToVault, createVault } from './utils';

describe("Aeon Vault Tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace
    .AeonProgram as Program<AeonProgram>;
  const user1Wallet = new web3.Keypair();
  const user2Wallet = new web3.Keypair();
  const serviceProvider = new web3.Keypair();
  const tokenMinter = new web3.Keypair();

  before(async () => {
    const sig1 = await connection.requestAirdrop(
      user1Wallet.publicKey,
      100 * web3.LAMPORTS_PER_SOL
    );
    const sig2 = await connection.requestAirdrop(
      tokenMinter.publicKey,
      10 * web3.LAMPORTS_PER_SOL
    );
    const sig3 = await connection.requestAirdrop(
      user2Wallet.publicKey,
      100 * web3.LAMPORTS_PER_SOL
    );
    const sig4 = await connection.requestAirdrop(
      serviceProvider.publicKey,
      10 * web3.LAMPORTS_PER_SOL
    );
    await confirm(connection, sig1);
    await confirm(connection, sig2);
    await confirm(connection, sig3);
    await confirm(connection, sig4);
  });

  describe("vault state checks", () => {
    const [user1Vault] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("aeon"),
        Buffer.from("vault"),
        user1Wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    const [user2Vault] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("aeon"),
        Buffer.from("vault"),
        user2Wallet.publicKey.toBuffer(),
      ],
      program.programId
    );
    const mintKeyPair = new web3.Keypair();
    const mintDecimals = 6;

    before(async () => {
      // create vault for user1 and user 2
      await createVault(connection, program, user1Wallet, user1Vault, 10);
      await createVault(connection, program, user2Wallet, user2Vault, 10);
      // create tokenMint
      const mint = await createMint(
        connection,
        tokenMinter,
        tokenMinter.publicKey,
        null,
        mintDecimals,
        mintKeyPair,
        { commitment: "confirmed" }
      );
      // mint tokens to the userWallet
      const user1WalletATA = await createAssociatedTokenAccount(
        connection,
        tokenMinter,
        mint,
        user1Wallet.publicKey
      );
      await mintTo(
        connection,
        tokenMinter,
        mintKeyPair.publicKey,
        user1WalletATA,
        tokenMinter.publicKey,
        1000 * 10 ** mintDecimals,
        [user1Wallet]
      );
    });

    it("Vault Creation!", async () => {
      const vault = await program.account.vault.fetch(user1Vault);
      const vaultBalance = await connection.getBalance(user1Vault);
      const userBalance = await connection.getBalance(user1Wallet.publicKey);

      expect(vault.owner.toString()).to.equals(
        user1Wallet.publicKey.toString()
      );
      expect(vaultBalance).to.greaterThanOrEqual(10 * web3.LAMPORTS_PER_SOL);
      expect(userBalance).to.equals(90 * web3.LAMPORTS_PER_SOL);
    });

    it("Can Transfer SOL to vault", async () => {
      const initialVaultBalance = await connection.getBalance(user1Vault);
      await transferSOLToVault(connection, user1Vault, user1Wallet, 5);
      const finalVaultBalance = await connection.getBalance(user1Vault);
      expect(finalVaultBalance - initialVaultBalance).to.equals(
        5 * web3.LAMPORTS_PER_SOL
      );
    });

    it("Can Transfer spl token to vault", async () => {
      const { destinationAta: vaultAta } = await transferTokenToVault(
        connection,
        user1Vault,
        mintKeyPair.publicKey,
        tokenMinter,
        user1Wallet,
        10,
        mintDecimals
      );
      const vaultTokenAccount = await getAccount(
        connection,
        vaultAta.address,
        "confirmed"
      );
      expect(vaultTokenAccount.amount.toString()).to.equals(
        (10 * 10 ** mintDecimals).toString()
      );
      expect(vaultTokenAccount.address.toString()).to.equals(
        vaultAta.address.toString()
      );
      expect(vaultTokenAccount.mint.toString()).to.equals(
        mintKeyPair.publicKey.toString()
      );
      expect(vaultTokenAccount.owner.toString()).to.equals(
        user1Vault.toString()
      );
    });

    it("Can withdraw sol from vault to owner account", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        vault: user1Vault,
        destination: user1Wallet.publicKey,
      };
      const initialVaultBalance = await connection.getBalance(user1Vault);
      const initialUserBalance = await connection.getBalance(
        user1Wallet.publicKey
      );
      await program.methods
        .vaultWithdrawSol(new anchor.BN(1 * web3.LAMPORTS_PER_SOL))
        .accounts({ ...accounts })
        .signers([user1Wallet])
        .rpc();
      const finalVaultBalance = await connection.getBalance(user1Vault);
      const finalUserBalance = await connection.getBalance(
        user1Wallet.publicKey
      );

      expect(initialVaultBalance - finalVaultBalance).to.equals(
        1 * web3.LAMPORTS_PER_SOL
      );
      expect(finalUserBalance - initialUserBalance).to.equals(
        1 * web3.LAMPORTS_PER_SOL
      );
    });

    it("Can withdraw sol from vault to different account", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        vault: user1Vault,
        destination: user2Wallet.publicKey,
      };
      const initialVaultBalance = await connection.getBalance(user1Vault);
      const initialUserBalance = await connection.getBalance(
        user2Wallet.publicKey
      );
      await program.methods
        .vaultWithdrawSol(new anchor.BN(1 * web3.LAMPORTS_PER_SOL))
        .accounts({ ...accounts })
        .signers([user1Wallet])
        .rpc();
      const finalVaultBalance = await connection.getBalance(user1Vault);
      const finalUserBalance = await connection.getBalance(
        user2Wallet.publicKey
      );

      expect(initialVaultBalance - finalVaultBalance).to.equals(
        1 * web3.LAMPORTS_PER_SOL
      );
      expect(finalUserBalance - initialUserBalance).to.equals(
        1 * web3.LAMPORTS_PER_SOL
      );
    });

    it("Can withdraw spl tokens from vault to owner", async () => {
      const { destinationAta: vaultAta, sourceATA: destinationAta } =
        await transferTokenToVault(
          connection,
          user1Vault,
          mintKeyPair.publicKey,
          tokenMinter,
          user1Wallet,
          10,
          mintDecimals
        );

      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        vault: user1Vault,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      };
      const initialVaultAta = await getAccount(
        connection,
        vaultAta.address,
        "confirmed"
      );
      const initialDestinationAta = await getAccount(
        connection,
        destinationAta,
        "confirmed"
      );
      const sig = await program.methods
        .vaultWithdrawToken(new anchor.BN(5 * 10 ** mintDecimals))
        .accounts({ ...accounts })
        .signers([user1Wallet])
        .rpc();
      await confirm(connection, sig);
      const finalVaultAta = await getAccount(
        connection,
        vaultAta.address,
        "confirmed"
      );
      const finalDestinationAta = await getAccount(
        connection,
        destinationAta,
        "confirmed"
      );

      expect(
        (initialVaultAta.amount - finalVaultAta.amount).toString()
      ).to.equals((5 * 10 ** mintDecimals).toString());
      expect(
        (finalDestinationAta.amount - initialDestinationAta.amount).toString()
      ).to.equals((5 * 10 ** mintDecimals).toString());
    });

    it("Can withdraw spl tokens from vault to different account", async () => {
      // Create a PR to @solana/web3.js to correct the off curve issue on createAssociaredTokenAccount
      const { destinationAta: vaultAta } = await transferTokenToVault(
        connection,
        user1Vault,
        mintKeyPair.publicKey,
        tokenMinter,
        user1Wallet,
        10,
        mintDecimals
      );
      const destinationAta = getAssociatedTokenAddressSync(
        mintKeyPair.publicKey,
        user2Vault,
        true
      );
      const transaction = new web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          tokenMinter.publicKey,
          destinationAta,
          user2Vault,
          mintKeyPair.publicKey
        )
      );
      const sig0 = await connection.sendTransaction(transaction, [tokenMinter]);
      await confirm(connection, sig0);
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        vault: user1Vault,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta: destinationAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      };
      const initialVaultAta = await getAccount(
        connection,
        vaultAta.address,
        "confirmed"
      );
      const initialDestinationAta = await getAccount(
        connection,
        destinationAta,
        "confirmed"
      );
      const sig = await program.methods
        .vaultWithdrawToken(new anchor.BN(5 * 10 ** mintDecimals))
        .accounts({ ...accounts })
        .signers([user1Wallet])
        .rpc();
      await confirm(connection, sig);
      const finalVaultAta = await getAccount(
        connection,
        vaultAta.address,
        "confirmed"
      );
      const finalDestinationAta = await getAccount(
        connection,
        destinationAta,
        "confirmed"
      );

      expect(
        (initialVaultAta.amount - finalVaultAta.amount).toString()
      ).to.equals((5 * 10 ** mintDecimals).toString());
      expect(
        (finalDestinationAta.amount - initialDestinationAta.amount).toString()
      ).to.equals((5 * 10 ** mintDecimals).toString());
    });

    it("Cannot withdraw more SOL than rent from vault", async () => {
      // Every PDA has to have some lamports for rent exemption. We need to ensure that the
      // user cannot withdraw more SOL that it makes the balance of the PDA less than what's
      // required for rent exemption or to zero.
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        vault: user1Vault,
        destination: user1Wallet.publicKey,
      };
      const initialVaultBalance = await connection.getBalance(user1Vault);
      try {
        await program.methods
          .vaultWithdrawSol(new anchor.BN(initialVaultBalance))
          .accounts({ ...accounts })
          .signers([user1Wallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
          "VaultRentExemptError"
        );
      }
    });

    it("Cannot withdraw sol from vault not owned", async () => {
      // We need to be sure that trying to withdraw sol from a vault that's not
      // owned by the user returns an error
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        vault: user2Vault,
        destination: user1Wallet.publicKey,
      };
      const initialVaultBalance = await connection.getBalance(user2Vault);
      try {
        await program.methods
          .vaultWithdrawSol(new anchor.BN(initialVaultBalance))
          .accounts({ ...accounts })
          .signers([user1Wallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        assert.ok(true);
      }
    });

    it("Cannot withdraw spl-token from vault not owned", async () => {
      // same logic as the previous test
      // The idea here is to attempt to withdraw tokens from a vault
      // owned by userWallet but the signer(owner) is userWallet2 and the destination is userWallet2

      const { destinationAta: vaultAta } = await transferTokenToVault(
        connection,
        user1Vault,
        mintKeyPair.publicKey,
        tokenMinter,
        user1Wallet,
        10,
        mintDecimals
      );
      const userWallet2Ata = getAssociatedTokenAddressSync(
        mintKeyPair.publicKey,
        user2Wallet.publicKey,
        false
      );
      const transaction = new web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          tokenMinter.publicKey,
          userWallet2Ata,
          user2Wallet.publicKey,
          mintKeyPair.publicKey
        )
      );
      const sig0 = await connection.sendTransaction(transaction, [tokenMinter]);
      await confirm(connection, sig0);

      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user2Wallet.publicKey,
        vault: user1Vault,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta: userWallet2Ata,
        tokenProgram: TOKEN_PROGRAM_ID,
      };
      try {
        await program.methods
          .vaultWithdrawToken(new anchor.BN(5 * 10 ** mintDecimals))
          .accounts({ ...accounts })
          .signers([user2Wallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorMessage).to.equals(
          "A seeds constraint was violated"
        );
      }
    });

    it("Cannot withdraw spl-token from wrong ata", async () => {
      // We need to ensure that the associated token account passed as the "vault_ata"
      // is owned by the vault pda. Otherwise, we should not allow removing tokens from it
      // The idea here is to attempt removing tokens from a vault_ata account not owned by the current owner's vault

      const { destinationAta: vaultAta } = await transferTokenToVault(
        connection,
        user1Vault,
        mintKeyPair.publicKey,
        tokenMinter,
        user1Wallet,
        10,
        mintDecimals
      );
      const userWallet2Ata = getAssociatedTokenAddressSync(
        mintKeyPair.publicKey,
        user2Wallet.publicKey,
        false
      );

      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user2Wallet.publicKey,
        vault: user2Vault,
        tokenMint: mintKeyPair.publicKey,
        vaultAta: vaultAta.address,
        destinationAta: userWallet2Ata,
        tokenProgram: TOKEN_PROGRAM_ID,
      };
      try {
        await program.methods
          .vaultWithdrawToken(new anchor.BN(5 * 10 ** mintDecimals))
          .accounts({ ...accounts })
          .signers([user2Wallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorMessage).to.equals(
          "The specified vault token account is not owned by the owner vault"
        );
      }
    });
  });
});
