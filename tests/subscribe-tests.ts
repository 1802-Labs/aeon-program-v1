import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import { assert, expect } from "chai";
import { confirm, createService, createVault, transferSOLToVault, transferTokenToVault } from "./utils";
import { createAssociatedTokenAccount, createMint, getAccount, getAssociatedTokenAddress, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("Subscription Tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;
  const feePayer = anchor.getProvider().publicKey;
  const program = anchor.workspace
    .AeonProgram as Program<AeonProgram>;
  const subscriberWallet = new web3.Keypair();
  const serviceProvider = new web3.Keypair();
  const tokenMinter = new web3.Keypair();
  const mintKeyPair = new web3.Keypair();
  const tokenDecimals = 6;
  const [providerVault] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("aeon"),
      Buffer.from("vault"),
      serviceProvider.publicKey.toBuffer(),
    ],
    program.programId
  );
  const [subscriberVault] = web3.PublicKey.findProgramAddressSync([
    Buffer.from("aeon"),
    Buffer.from("vault"),
    subscriberWallet.publicKey.toBuffer()
  ], program.programId)
  const providerVaultAta = getAssociatedTokenAddressSync(mintKeyPair.publicKey, serviceProvider.publicKey, true);
  const providerAta = getAssociatedTokenAddressSync(mintKeyPair.publicKey, serviceProvider.publicKey);

  before(async () => {
    const sig1 = await connection.requestAirdrop(
      subscriberWallet.publicKey,
      100 * web3.LAMPORTS_PER_SOL
    );
    const sig2 = await connection.requestAirdrop(
      tokenMinter.publicKey,
      10 * web3.LAMPORTS_PER_SOL
    );
    const sig4 = await connection.requestAirdrop(
      serviceProvider.publicKey,
      10 * web3.LAMPORTS_PER_SOL
    );
    await confirm(connection, sig1);
    await confirm(connection, sig2);
    await confirm(connection, sig4);

    // create vaults for both the service provider and the subscriber
    await createVault(connection, program, subscriberWallet, subscriberVault, 10);
    await createVault(connection, program, serviceProvider, providerVault, 10);
    // create tokenMint
    const mint = await createMint(
      connection,
      tokenMinter,
      tokenMinter.publicKey,
      null,
      tokenDecimals,
      mintKeyPair,
      { commitment: "confirmed" }
    );
    // create token accounts for both vaults, and service provider wallet
    await createAssociatedTokenAccount(
      connection,
      tokenMinter,
      mint,
      serviceProvider.publicKey
    );
    await getOrCreateAssociatedTokenAccount(
      connection,
      tokenMinter,
      mint,
      providerVault,
      true
    )
    await getOrCreateAssociatedTokenAccount(
      connection,
      tokenMinter,
      mint,
      subscriberVault,
      true
    )
    // mint tokens into the subscriber wallet ata
    const subscriberWalletAta = await createAssociatedTokenAccount(
      connection,
      tokenMinter,
      mint,
      subscriberWallet.publicKey
    );
    await mintTo(
      connection,
      tokenMinter,
      mintKeyPair.publicKey,
      subscriberWalletAta,
      tokenMinter.publicKey,
      1000 * 10 ** tokenDecimals,
      [subscriberWallet]
    );
    await transferTokenToVault(
      connection,
      subscriberVault,
      mint,
      tokenMinter,
      subscriberWallet,
      500,
      tokenDecimals
    )
  });

  describe("SOL Subscription", () => {
    it("aeon vault recipient subscription test", async () => {
      // This simulates a service with a plan where the recipient of the
      // subscription set by the service provider is aeon's vault

      // create service
      const serviceId = 1;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: null, // represents sol,
          recipient: providerVault, // recipient is the provider's vault
        }
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      const plan = planInfos[0];
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        serviceProvider: serviceProvider.publicKey,
        service,
        recipient: plan.recipient,
        subscription: subscriptionKey
      };
      const initialVaultBalance = await connection.getBalance(subscriberVault);
      const initialRecipientBalance = await connection.getBalance(plan.recipient);
      const sig = await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({...accounts})
        .signers([subscriberWallet])
        .rpc();
      await confirm(connection, sig);
      const finalVaultBalance = await connection.getBalance(subscriberVault);
      const finalRecipientBalance = await connection.getBalance(plan.recipient);
      const subscriptionInfo = await program.account.subscription.fetch(subscriptionKey);
      expect(initialVaultBalance - finalVaultBalance).to.equals(plan.chargeAmount.toNumber());
      expect(finalRecipientBalance - initialRecipientBalance).to.equals(plan.chargeAmount.toNumber());
      expect(subscriptionInfo.lastChargeTs.toNumber()).to.greaterThan(1000);
      expect(subscriptionInfo.owner.toString()).to.equals(subscriberWallet.publicKey.toString());
      expect(subscriptionInfo.planId.toNumber()).to.equals(1);
      expect(subscriptionInfo.serviceKey.toString()).to.equals(service.toString())
      assert.ok(subscriptionInfo.isActive);
    })

    it("solana wallet recipient subscription test", async () => {
      // This simulates a service with a plan where the recipient of the
      // subscription set by the service provider is a normal solana wallet

      // create service
      const serviceId = 2;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: null, // represents sol,
          recipient: serviceProvider.publicKey, // recipient is the provider's solana wallet
        }
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      const plan = planInfos[0];
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        serviceProvider: serviceProvider.publicKey,
        service,
        recipient: plan.recipient,
        subscription: subscriptionKey
      };
      const initialVaultBalance = await connection.getBalance(subscriberVault);
      const initialRecipientBalance = await connection.getBalance(plan.recipient);
      const sig = await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({...accounts})
        .signers([subscriberWallet])
        .rpc();
      await confirm(connection, sig);
      const finalVaultBalance = await connection.getBalance(subscriberVault);
      const finalRecipientBalance = await connection.getBalance(plan.recipient);
      const subscriptionInfo = await program.account.subscription.fetch(subscriptionKey);
      expect(initialVaultBalance - finalVaultBalance).to.equals(plan.chargeAmount.toNumber());
      expect(finalRecipientBalance - initialRecipientBalance).to.equals(plan.chargeAmount.toNumber());
      expect(subscriptionInfo.lastChargeTs.toNumber()).to.greaterThan(1000);
      expect(subscriptionInfo.owner.toString()).to.equals(subscriberWallet.publicKey.toString());
      expect(subscriptionInfo.planId.toNumber()).to.equals(1);
      expect(subscriptionInfo.serviceKey.toString()).to.equals(service.toString())
      assert.ok(subscriptionInfo.isActive);
    })
  
    it("cannot subscribe to sol plan with wrong recipient", async () => {
      // a malicious subscriber might want to specify a recipient other than the
      // one specified in the plan details. We should be able to prevent specifying the
      // wrong recipient account

      // create service
      const serviceId = 3;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: null, // represents sol,
          recipient: providerVault, // recipient is the provider's vault
        }
      ]
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        serviceProvider: serviceProvider.publicKey,
        service,
        recipient: subscriberWallet.publicKey,
        subscription: subscriptionKey
      };
      try {
        await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
          .accounts({...accounts})
          .signers([subscriberWallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
          "RecipientMismatch"
        );
      }
    })
  
    it("cannot subscribe to sol inactive plan", async () => {
      // create service
      const serviceId = 4;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: null, // represents sol,
          recipient: providerVault, // recipient is the provider's vault
        }
      ]
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      // deactivate plan
      const deactivateAccounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      const sig = await program.methods.planStatusUpdate(new anchor.BN(serviceId), new anchor.BN(1), false)
        .accounts({...deactivateAccounts})
        .signers([serviceProvider])
        .rpc()
      await confirm(connection, sig);
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        serviceProvider: serviceProvider.publicKey,
        service,
        recipient: subscriberWallet.publicKey,
        subscription: subscriptionKey
      };
      try {
        await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
          .accounts({...accounts})
          .signers([subscriberWallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
          "InactivePlan"
        );
      }
    })
  
    it("cannot subscribe to sol inactive service", async () => {
      // create service
      const serviceId = 5;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: null, // represents sol,
          recipient: providerVault, // recipient is the provider's vault
        }
      ]
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      // deactivate service
      const deactivateAccounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      const sig = await program.methods.serviceStatusUpdate(new anchor.BN(serviceId), false)
        .accounts({...deactivateAccounts})
        .signers([serviceProvider])
        .rpc()
      await confirm(connection, sig);
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        serviceProvider: serviceProvider.publicKey,
        service,
        recipient: subscriberWallet.publicKey,
        subscription: subscriptionKey
      };
      try {
        await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
          .accounts({...accounts})
          .signers([subscriberWallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
          "InactiveService"
        );
      }
    })
  })

  describe("Token Subscription", () => {
    it("aeon vault ata recipient subscription test", async () => {
      // This simulates a service with a plan where the recipient of the
      // subscription set by the service provider is aeon's vault token account

      // create service
      const serviceId = 6;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: mintKeyPair.publicKey,
          recipient: providerVaultAta, // recipient is the vault's ata
        }
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      const plan = planInfos[0];
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const subscriberVaultAta = await getAssociatedTokenAddress(
        mintKeyPair.publicKey,
        subscriberVault,
        true
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        subscriberVaultAta,
        serviceProvider: serviceProvider.publicKey,
        service,
        tokenMint: mintKeyPair.publicKey,
        recipient: plan.recipient,
        subscription: subscriptionKey,
        tokenProgram: TOKEN_PROGRAM_ID
      };
      const initialVaultAtaBalance = (await getAccount(connection, subscriberVaultAta)).amount;
      const initialRecipientBalance = (await getAccount(connection, plan.recipient)).amount;
      const sig = await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({...accounts})
        .signers([subscriberWallet])
        .rpc();
      await confirm(connection, sig);
      const finalVaultAtaBalance = (await getAccount(connection, subscriberVaultAta)).amount;
      const finalRecipientBalance = (await getAccount(connection, plan.recipient)).amount;
      const subscriptionInfo = await program.account.subscription.fetch(subscriptionKey);
      expect((initialVaultAtaBalance - finalVaultAtaBalance).toString()).to.equals(plan.chargeAmount.toString());
      expect((finalRecipientBalance - initialRecipientBalance).toString()).to.equals(plan.chargeAmount.toString());
      expect(subscriptionInfo.lastChargeTs.toNumber()).to.greaterThan(1000);
      expect(subscriptionInfo.owner.toString()).to.equals(subscriberWallet.publicKey.toString());
      expect(subscriptionInfo.planId.toNumber()).to.equals(1);
      expect(subscriptionInfo.serviceKey.toString()).to.equals(service.toString())
      assert.ok(subscriptionInfo.isActive);
    })

    it("solana wallet ata recipient subscription test", async () => {
      // This simulates a service with a plan where the recipient of the
      // subscription set by the service provider's wallet token account

      // create service
      const serviceId = 7;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: mintKeyPair.publicKey,
          recipient: providerAta, // recipient is the provider's wallet ata
        }
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      const plan = planInfos[0];
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const subscriberVaultAta = await getAssociatedTokenAddress(
        mintKeyPair.publicKey,
        subscriberVault,
        true
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        subscriberVaultAta,
        serviceProvider: serviceProvider.publicKey,
        service,
        tokenMint: mintKeyPair.publicKey,
        recipient: plan.recipient,
        subscription: subscriptionKey,
        tokenProgram: TOKEN_PROGRAM_ID
      };
      const initialVaultAtaBalance = (await getAccount(connection, subscriberVaultAta)).amount;
      const initialRecipientBalance = (await getAccount(connection, plan.recipient)).amount;
      const sig = await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({...accounts})
        .signers([subscriberWallet])
        .rpc();
      await confirm(connection, sig);
      const finalVaultAtaBalance = (await getAccount(connection, subscriberVaultAta)).amount;
      const finalRecipientBalance = (await getAccount(connection, plan.recipient)).amount;
      const subscriptionInfo = await program.account.subscription.fetch(subscriptionKey);
      expect((initialVaultAtaBalance - finalVaultAtaBalance).toString()).to.equals(plan.chargeAmount.toString());
      expect((finalRecipientBalance - initialRecipientBalance).toString()).to.equals(plan.chargeAmount.toString());
      expect(subscriptionInfo.lastChargeTs.toNumber()).to.greaterThan(1000);
      expect(subscriptionInfo.owner.toString()).to.equals(subscriberWallet.publicKey.toString());
      expect(subscriptionInfo.planId.toNumber()).to.equals(1);
      expect(subscriptionInfo.serviceKey.toString()).to.equals(service.toString())
      assert.ok(subscriptionInfo.isActive);
    })

    it("cannot subscribe to token plan with wrong recipient", async () => {
      // create service
      const serviceId = 8;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: mintKeyPair.publicKey,
          recipient: providerVaultAta, // recipient is the vault's ata
        }
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const subscriberVaultAta = await getAssociatedTokenAddress(
        mintKeyPair.publicKey,
        subscriberVault,
        true
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        subscriberVaultAta,
        serviceProvider: serviceProvider.publicKey,
        service,
        tokenMint: mintKeyPair.publicKey,
        recipient: subscriberVaultAta,
        subscription: subscriptionKey,
        tokenProgram: TOKEN_PROGRAM_ID
      };
      try {
        await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
          .accounts({...accounts})
          .signers([subscriberWallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
          "RecipientMismatch"
        );
      }
    })

    it("cannot subscribe to token inactive plan", async () => {
      // create service
      const serviceId = 9;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: mintKeyPair.publicKey,
          recipient: providerVaultAta, // recipient is the vault's ata
        }
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      // deactivate plan
      const deactivateAccounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      const sig = await program.methods.planStatusUpdate(new anchor.BN(serviceId), new anchor.BN(1), false)
        .accounts({...deactivateAccounts})
        .signers([serviceProvider])
        .rpc()
      await confirm(connection, sig);
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const subscriberVaultAta = await getAssociatedTokenAddress(
        mintKeyPair.publicKey,
        subscriberVault,
        true
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        subscriberVaultAta,
        serviceProvider: serviceProvider.publicKey,
        service,
        tokenMint: mintKeyPair.publicKey,
        recipient: subscriberVaultAta,
        subscription: subscriptionKey,
        tokenProgram: TOKEN_PROGRAM_ID
      };
      try {
        await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
          .accounts({...accounts})
          .signers([subscriberWallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
          "InactivePlan"
        );
      }
    })

    it("cannot subscribe to token inactive service", async () => {
      // create service
      const serviceId = 10;
      const [service] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.publicKey.toBuffer(),
          new anchor.BN(serviceId).toBuffer("le", 8),
        ],
        program.programId
      );
      const planInfos = [
        {
          chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: mintKeyPair.publicKey,
          recipient: providerVaultAta, // recipient is the vault's ata
        }
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos
      )
      // deactivate service
      const deactivateAccounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      const sig = await program.methods.serviceStatusUpdate(new anchor.BN(serviceId), false)
        .accounts({...deactivateAccounts})
        .signers([serviceProvider])
        .rpc()
      await confirm(connection, sig);
      const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("subscription"),
          subscriberWallet.publicKey.toBuffer(),
          service.toBuffer(),
        ],
        program.programId
      );
      const subscriberVaultAta = await getAssociatedTokenAddress(
        mintKeyPair.publicKey,
        subscriberVault,
        true
      );
      const accounts = {
        feePayer,
        subscriber: subscriberWallet.publicKey,
        subscriberVault,
        subscriberVaultAta,
        serviceProvider: serviceProvider.publicKey,
        service,
        tokenMint: mintKeyPair.publicKey,
        recipient: subscriberVaultAta,
        subscription: subscriptionKey,
        tokenProgram: TOKEN_PROGRAM_ID
      };
      try {
        await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
          .accounts({...accounts})
          .signers([subscriberWallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
          "InactiveService"
        );
      }
    })
  })
  

  // Need a service with two plans (plan 1 in sol, plan 2 in another token created)
  // Need a user to subscribe to the sol plan
  // Need another user to subscribe to the token plan

  // Test that a user can subscribe with SOL
  // Test that a user can subscribe with token
  // Test that a user can unsubscribe
  // Test that a user get's charged on the first subscription
  // Test that charge can be performed when the subscription is due for payment
  // Test that charge cannot be performed before due date/time
});
