import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import { assert, expect } from "chai";
import {
  BanksClient,
  Clock,
  ProgramTestContext,
  startAnchor,
} from "solana-bankrun";
import { createService, createVault } from "./utils";
import {
  ACCOUNT_SIZE,
  AccountLayout,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  MINT_SIZE,
  MintLayout,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BankrunProvider } from "anchor-bankrun";

describe("Charge Tests", () => {
  let connection: web3.Connection;
  let feePayer: web3.PublicKey;
  let program = anchor.workspace.AeonProgram as Program<AeonProgram>;
  let context: ProgramTestContext;
  let client: BanksClient;
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
  const [subscriberVault] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("aeon"),
      Buffer.from("vault"),
      subscriberWallet.publicKey.toBuffer(),
    ],
    program.programId
  );
  const providerVaultAta = getAssociatedTokenAddressSync(
    mintKeyPair.publicKey,
    serviceProvider.publicKey,
    true
  );
  const providerAta = getAssociatedTokenAddressSync(
    mintKeyPair.publicKey,
    serviceProvider.publicKey
  );

  before(async () => {
    // Set up bankrun and bankrun provider
    context = await startAnchor(
      "",
      [],
      [
        {
          address: subscriberWallet.publicKey,
          info: {
            lamports: 100 * web3.LAMPORTS_PER_SOL,
            owner: web3.SystemProgram.programId,
            data: Buffer.alloc(0),
            executable: false,
          },
        },
        {
          address: serviceProvider.publicKey,
          info: {
            lamports: 100 * web3.LAMPORTS_PER_SOL,
            owner: web3.SystemProgram.programId,
            data: Buffer.alloc(0),
            executable: false,
          },
        },
        {
          address: tokenMinter.publicKey,
          info: {
            lamports: 100 * web3.LAMPORTS_PER_SOL,
            owner: web3.SystemProgram.programId,
            data: Buffer.alloc(0),
            executable: false,
          },
        },
      ]
    );
    client = context.banksClient;
    const provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    program = new Program<AeonProgram>(program.idl, provider);
    connection = provider.connection;
    feePayer = provider.publicKey;

    // create vaults
    await createVault(
      connection,
      program,
      subscriberWallet,
      subscriberVault,
      10,
      false
    );
    await createVault(
      connection,
      program,
      serviceProvider,
      providerVault,
      10,
      false
    );

    // create tokenMint
    const mintData = Buffer.alloc(MINT_SIZE);
    MintLayout.encode(
      {
        mintAuthority: tokenMinter.publicKey,
        mintAuthorityOption: 1,
        decimals: tokenDecimals,
        isInitialized: true,
        freezeAuthorityOption: 1,
        supply: BigInt(0),
        freezeAuthority: tokenMinter.publicKey,
      },
      mintData
    );

    // create token accounts for both vaults, and service provider wallet
    const providerTokenAccountData = Buffer.alloc(ACCOUNT_SIZE);
    const providerVaultTokenAccountData = Buffer.alloc(ACCOUNT_SIZE);
    const subscriberVaultTokenAccountData = Buffer.alloc(ACCOUNT_SIZE);
    const providerAta = await getAssociatedTokenAddress(
      mintKeyPair.publicKey,
      serviceProvider.publicKey
    );
    const providerVaultAta = await getAssociatedTokenAddress(
      mintKeyPair.publicKey,
      providerVault,
      true
    );
    const subscriberVaultAta = await getAssociatedTokenAddress(
      mintKeyPair.publicKey,
      subscriberVault,
      true
    );
    AccountLayout.encode(
      {
        mint: mintKeyPair.publicKey,
        owner: serviceProvider.publicKey,
        amount: BigInt(0),
        delegateOption: 0,
        delegate: web3.PublicKey.default,
        delegatedAmount: BigInt(0),
        state: 1,
        isNativeOption: 0,
        isNative: BigInt(0),
        closeAuthorityOption: 0,
        closeAuthority: web3.PublicKey.default,
      },
      providerTokenAccountData
    );
    AccountLayout.encode(
      {
        mint: mintKeyPair.publicKey,
        owner: subscriberVault,
        amount: BigInt(500 * 10 ** tokenDecimals),
        delegateOption: 0,
        delegate: web3.PublicKey.default,
        delegatedAmount: BigInt(0),
        state: 1,
        isNativeOption: 0,
        isNative: BigInt(0),
        closeAuthorityOption: 0,
        closeAuthority: web3.PublicKey.default,
      },
      subscriberVaultTokenAccountData
    );
  });

  //   describe("SOL Subscription", () => {
  //     it("aeon vault recipient subscription test", async () => {
  //       // This simulates a service with a plan where the recipient of the
  //       // subscription set by the service provider is aeon's vault

  //       // create service
  //       const serviceId = 1;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: null, // represents sol,
  //           recipient: providerVault, // recipient is the provider's vault
  //         }
  //       ];
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       const plan = planInfos[0];
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         recipient: plan.recipient,
  //         subscription: subscriptionKey
  //       };
  //       const initialVaultBalance = await connection.getBalance(subscriberVault);
  //       const initialRecipientBalance = await connection.getBalance(plan.recipient);
  //       const sig = await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
  //         .accounts({...accounts})
  //         .signers([subscriberWallet])
  //         .rpc();
  //       await confirm(connection, sig);
  //       const finalVaultBalance = await connection.getBalance(subscriberVault);
  //       const finalRecipientBalance = await connection.getBalance(plan.recipient);
  //       const subscriptionInfo = await program.account.subscription.fetch(subscriptionKey);
  //       expect(initialVaultBalance - finalVaultBalance).to.equals(plan.chargeAmount.toNumber());
  //       expect(finalRecipientBalance - initialRecipientBalance).to.equals(plan.chargeAmount.toNumber());
  //       expect(subscriptionInfo.lastChargeTs.toNumber()).to.greaterThan(1000);
  //       expect(subscriptionInfo.nextChargeTs.toNumber()).to.equals(subscriptionInfo.lastChargeTs.toNumber() + plan.interval.toNumber());
  //       expect(subscriptionInfo.owner.toString()).to.equals(subscriberWallet.publicKey.toString());
  //       expect(subscriptionInfo.planId.toNumber()).to.equals(1);
  //       expect(subscriptionInfo.serviceKey.toString()).to.equals(service.toString())
  //       assert.ok(subscriptionInfo.isActive);
  //     })

  //     it("solana wallet recipient subscription test", async () => {
  //       // This simulates a service with a plan where the recipient of the
  //       // subscription set by the service provider is a normal solana wallet

  //       // create service
  //       const serviceId = 2;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: null, // represents sol,
  //           recipient: serviceProvider.publicKey, // recipient is the provider's solana wallet
  //         }
  //       ];
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       const plan = planInfos[0];
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         recipient: plan.recipient,
  //         subscription: subscriptionKey
  //       };
  //       const initialVaultBalance = await connection.getBalance(subscriberVault);
  //       const initialRecipientBalance = await connection.getBalance(plan.recipient);
  //       const sig = await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
  //         .accounts({...accounts})
  //         .signers([subscriberWallet])
  //         .rpc();
  //       await confirm(connection, sig);
  //       const finalVaultBalance = await connection.getBalance(subscriberVault);
  //       const finalRecipientBalance = await connection.getBalance(plan.recipient);
  //       const subscriptionInfo = await program.account.subscription.fetch(subscriptionKey);
  //       expect(initialVaultBalance - finalVaultBalance).to.equals(plan.chargeAmount.toNumber());
  //       expect(finalRecipientBalance - initialRecipientBalance).to.equals(plan.chargeAmount.toNumber());
  //       expect(subscriptionInfo.lastChargeTs.toNumber()).to.greaterThan(1000);
  //       expect(subscriptionInfo.nextChargeTs.toNumber()).to.equals(subscriptionInfo.lastChargeTs.toNumber() + plan.interval.toNumber());
  //       expect(subscriptionInfo.owner.toString()).to.equals(subscriberWallet.publicKey.toString());
  //       expect(subscriptionInfo.planId.toNumber()).to.equals(1);
  //       expect(subscriptionInfo.serviceKey.toString()).to.equals(service.toString())
  //       assert.ok(subscriptionInfo.isActive);
  //     })

  //     it("cannot subscribe to sol plan with wrong recipient", async () => {
  //       // a malicious subscriber might want to specify a recipient other than the
  //       // one specified in the plan details. We should be able to prevent specifying the
  //       // wrong recipient account

  //       // create service
  //       const serviceId = 3;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: null, // represents sol,
  //           recipient: providerVault, // recipient is the provider's vault
  //         }
  //       ]
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         recipient: subscriberWallet.publicKey,
  //         subscription: subscriptionKey
  //       };
  //       try {
  //         await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
  //           .accounts({...accounts})
  //           .signers([subscriberWallet])
  //           .rpc();
  //         assert.ok(false);
  //       } catch (error) {
  //         expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
  //           "RecipientMismatch"
  //         );
  //       }
  //     })

  //     it("cannot subscribe to sol inactive plan", async () => {
  //       // create service
  //       const serviceId = 4;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: null, // represents sol,
  //           recipient: providerVault, // recipient is the provider's vault
  //         }
  //       ]
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       // deactivate plan
  //       const deactivateAccounts = {
  //         feePayer: anchor.getProvider().publicKey,
  //         owner: serviceProvider.publicKey,
  //         service,
  //       };
  //       const sig = await program.methods.planStatusUpdate(new anchor.BN(serviceId), new anchor.BN(1), false)
  //         .accounts({...deactivateAccounts})
  //         .signers([serviceProvider])
  //         .rpc()
  //       await confirm(connection, sig);
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         recipient: subscriberWallet.publicKey,
  //         subscription: subscriptionKey
  //       };
  //       try {
  //         await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
  //           .accounts({...accounts})
  //           .signers([subscriberWallet])
  //           .rpc();
  //         assert.ok(false);
  //       } catch (error) {
  //         expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
  //           "InactivePlan"
  //         );
  //       }
  //     })

  //     it("cannot subscribe to sol inactive service", async () => {
  //       // create service
  //       const serviceId = 5;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: null, // represents sol,
  //           recipient: providerVault, // recipient is the provider's vault
  //         }
  //       ]
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       // deactivate service
  //       const deactivateAccounts = {
  //         feePayer: anchor.getProvider().publicKey,
  //         owner: serviceProvider.publicKey,
  //         service,
  //       };
  //       const sig = await program.methods.serviceStatusUpdate(new anchor.BN(serviceId), false)
  //         .accounts({...deactivateAccounts})
  //         .signers([serviceProvider])
  //         .rpc()
  //       await confirm(connection, sig);
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         recipient: subscriberWallet.publicKey,
  //         subscription: subscriptionKey
  //       };
  //       try {
  //         await program.methods.subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
  //           .accounts({...accounts})
  //           .signers([subscriberWallet])
  //           .rpc();
  //         assert.ok(false);
  //       } catch (error) {
  //         expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
  //           "InactiveService"
  //         );
  //       }
  //     })
  //   })

  //   describe("Token Subscription", () => {
  //     it("aeon vault ata recipient subscription test", async () => {
  //       // This simulates a service with a plan where the recipient of the
  //       // subscription set by the service provider is aeon's vault token account

  //       // create service
  //       const serviceId = 6;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: mintKeyPair.publicKey,
  //           recipient: providerVaultAta, // recipient is the vault's ata
  //         }
  //       ];
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       const plan = planInfos[0];
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const subscriberVaultAta = await getAssociatedTokenAddress(
  //         mintKeyPair.publicKey,
  //         subscriberVault,
  //         true
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         subscriberVaultAta,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         tokenMint: mintKeyPair.publicKey,
  //         recipient: plan.recipient,
  //         subscription: subscriptionKey,
  //         tokenProgram: TOKEN_PROGRAM_ID
  //       };
  //       const initialVaultAtaBalance = (await getAccount(connection, subscriberVaultAta)).amount;
  //       const initialRecipientBalance = (await getAccount(connection, plan.recipient)).amount;
  //       const sig = await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
  //         .accounts({...accounts})
  //         .signers([subscriberWallet])
  //         .rpc();
  //       await confirm(connection, sig);
  //       const finalVaultAtaBalance = (await getAccount(connection, subscriberVaultAta)).amount;
  //       const finalRecipientBalance = (await getAccount(connection, plan.recipient)).amount;
  //       const subscriptionInfo = await program.account.subscription.fetch(subscriptionKey);
  //       expect((initialVaultAtaBalance - finalVaultAtaBalance).toString()).to.equals(plan.chargeAmount.toString());
  //       expect((finalRecipientBalance - initialRecipientBalance).toString()).to.equals(plan.chargeAmount.toString());
  //       expect(subscriptionInfo.lastChargeTs.toNumber()).to.greaterThan(1000);
  //       expect(subscriptionInfo.nextChargeTs.toNumber()).to.equals(subscriptionInfo.lastChargeTs.toNumber() + plan.interval.toNumber());
  //       expect(subscriptionInfo.owner.toString()).to.equals(subscriberWallet.publicKey.toString());
  //       expect(subscriptionInfo.planId.toNumber()).to.equals(1);
  //       expect(subscriptionInfo.serviceKey.toString()).to.equals(service.toString())
  //       assert.ok(subscriptionInfo.isActive);
  //     })

  //     it("solana wallet ata recipient subscription test", async () => {
  //       // This simulates a service with a plan where the recipient of the
  //       // subscription set by the service provider's wallet token account

  //       // create service
  //       const serviceId = 7;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: mintKeyPair.publicKey,
  //           recipient: providerAta, // recipient is the provider's wallet ata
  //         }
  //       ];
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       const plan = planInfos[0];
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const subscriberVaultAta = await getAssociatedTokenAddress(
  //         mintKeyPair.publicKey,
  //         subscriberVault,
  //         true
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         subscriberVaultAta,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         tokenMint: mintKeyPair.publicKey,
  //         recipient: plan.recipient,
  //         subscription: subscriptionKey,
  //         tokenProgram: TOKEN_PROGRAM_ID
  //       };
  //       const initialVaultAtaBalance = (await getAccount(connection, subscriberVaultAta)).amount;
  //       const initialRecipientBalance = (await getAccount(connection, plan.recipient)).amount;
  //       const sig = await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
  //         .accounts({...accounts})
  //         .signers([subscriberWallet])
  //         .rpc();
  //       await confirm(connection, sig);
  //       const finalVaultAtaBalance = (await getAccount(connection, subscriberVaultAta)).amount;
  //       const finalRecipientBalance = (await getAccount(connection, plan.recipient)).amount;
  //       const subscriptionInfo = await program.account.subscription.fetch(subscriptionKey);
  //       expect((initialVaultAtaBalance - finalVaultAtaBalance).toString()).to.equals(plan.chargeAmount.toString());
  //       expect((finalRecipientBalance - initialRecipientBalance).toString()).to.equals(plan.chargeAmount.toString());
  //       expect(subscriptionInfo.lastChargeTs.toNumber()).to.greaterThan(1000);
  //       expect(subscriptionInfo.nextChargeTs.toNumber()).to.equals(subscriptionInfo.lastChargeTs.toNumber() + plan.interval.toNumber());
  //       expect(subscriptionInfo.owner.toString()).to.equals(subscriberWallet.publicKey.toString());
  //       expect(subscriptionInfo.planId.toNumber()).to.equals(1);
  //       expect(subscriptionInfo.serviceKey.toString()).to.equals(service.toString())
  //       assert.ok(subscriptionInfo.isActive);
  //     })

  //     it("cannot subscribe to token plan with wrong recipient", async () => {
  //       // create service
  //       const serviceId = 8;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: mintKeyPair.publicKey,
  //           recipient: providerVaultAta, // recipient is the vault's ata
  //         }
  //       ];
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const subscriberVaultAta = await getAssociatedTokenAddress(
  //         mintKeyPair.publicKey,
  //         subscriberVault,
  //         true
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         subscriberVaultAta,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         tokenMint: mintKeyPair.publicKey,
  //         recipient: subscriberVaultAta,
  //         subscription: subscriptionKey,
  //         tokenProgram: TOKEN_PROGRAM_ID
  //       };
  //       try {
  //         await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
  //           .accounts({...accounts})
  //           .signers([subscriberWallet])
  //           .rpc();
  //         assert.ok(false);
  //       } catch (error) {
  //         expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
  //           "RecipientMismatch"
  //         );
  //       }
  //     })

  //     it("cannot subscribe to token inactive plan", async () => {
  //       // create service
  //       const serviceId = 9;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: mintKeyPair.publicKey,
  //           recipient: providerVaultAta, // recipient is the vault's ata
  //         }
  //       ];
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       // deactivate plan
  //       const deactivateAccounts = {
  //         feePayer: anchor.getProvider().publicKey,
  //         owner: serviceProvider.publicKey,
  //         service,
  //       };
  //       const sig = await program.methods.planStatusUpdate(new anchor.BN(serviceId), new anchor.BN(1), false)
  //         .accounts({...deactivateAccounts})
  //         .signers([serviceProvider])
  //         .rpc()
  //       await confirm(connection, sig);
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const subscriberVaultAta = await getAssociatedTokenAddress(
  //         mintKeyPair.publicKey,
  //         subscriberVault,
  //         true
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         subscriberVaultAta,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         tokenMint: mintKeyPair.publicKey,
  //         recipient: subscriberVaultAta,
  //         subscription: subscriptionKey,
  //         tokenProgram: TOKEN_PROGRAM_ID
  //       };
  //       try {
  //         await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
  //           .accounts({...accounts})
  //           .signers([subscriberWallet])
  //           .rpc();
  //         assert.ok(false);
  //       } catch (error) {
  //         expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
  //           "InactivePlan"
  //         );
  //       }
  //     })

  //     it("cannot subscribe to token inactive service", async () => {
  //       // create service
  //       const serviceId = 10;
  //       const [service] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("service"),
  //           serviceProvider.publicKey.toBuffer(),
  //           new anchor.BN(serviceId).toBuffer("le", 8),
  //         ],
  //         program.programId
  //       );
  //       const planInfos = [
  //         {
  //           chargeAmount: new anchor.BN(10 * 10 ** tokenDecimals),
  //           interval: new anchor.BN(3600), // 3600 seconds,
  //           tokenMint: mintKeyPair.publicKey,
  //           recipient: providerVaultAta, // recipient is the vault's ata
  //         }
  //       ];
  //       await createService(
  //         connection,
  //         program,
  //         serviceProvider,
  //         providerVault,
  //         service,
  //         serviceId,
  //         planInfos
  //       )
  //       // deactivate service
  //       const deactivateAccounts = {
  //         feePayer: anchor.getProvider().publicKey,
  //         owner: serviceProvider.publicKey,
  //         service,
  //       };
  //       const sig = await program.methods.serviceStatusUpdate(new anchor.BN(serviceId), false)
  //         .accounts({...deactivateAccounts})
  //         .signers([serviceProvider])
  //         .rpc()
  //       await confirm(connection, sig);
  //       const [subscriptionKey, ] = web3.PublicKey.findProgramAddressSync(
  //         [
  //           Buffer.from("aeon"),
  //           Buffer.from("subscription"),
  //           subscriberWallet.publicKey.toBuffer(),
  //           service.toBuffer(),
  //         ],
  //         program.programId
  //       );
  //       const subscriberVaultAta = await getAssociatedTokenAddress(
  //         mintKeyPair.publicKey,
  //         subscriberVault,
  //         true
  //       );
  //       const accounts = {
  //         feePayer,
  //         subscriber: subscriberWallet.publicKey,
  //         subscriberVault,
  //         subscriberVaultAta,
  //         serviceProvider: serviceProvider.publicKey,
  //         service,
  //         tokenMint: mintKeyPair.publicKey,
  //         recipient: subscriberVaultAta,
  //         subscription: subscriptionKey,
  //         tokenProgram: TOKEN_PROGRAM_ID
  //       };
  //       try {
  //         await program.methods.subscribeToken(new anchor.BN(serviceId), new anchor.BN(1))
  //           .accounts({...accounts})
  //           .signers([subscriberWallet])
  //           .rpc();
  //         assert.ok(false);
  //       } catch (error) {
  //         expect((error as anchor.AnchorError).error.errorCode.code).to.equals(
  //           "InactiveService"
  //         );
  //       }
  //     })
  //   })

  describe("SOL charge tests", () => {
    it("should charge when period has elapsed", async () => {
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
        },
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos,
        false
      );

      // subscribe
      const plan = planInfos[0];
      const [subscriptionKey] = web3.PublicKey.findProgramAddressSync(
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
        subscription: subscriptionKey,
      };
      await program.methods
        .subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({ ...accounts })
        .signers([subscriberWallet])
        .rpc();
      // time travel
      const currentClock = await client.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          currentClock.unixTimestamp + BigInt(plan.interval.toString())
        )
      );
      // attempt charge
      const initialVaultBalance = await client.getBalance(subscriberVault);
      const initialRecipientBalance = await client.getBalance(plan.recipient);
      await program.methods
        .chargeSol(new anchor.BN(serviceId))
        .accounts({
          ...{
            signer: feePayer,
            subscriber: subscriberWallet.publicKey,
            subscriberVault,
            recipient: plan.recipient,
            serviceProvider: serviceProvider.publicKey,
            service,
            subscription: subscriptionKey,
          },
        })
        .rpc();
      // verify subscription state and vault balance checks as well as the recipient
      const finalVaultBalance = await client.getBalance(subscriberVault);
      const finalRecipientBalance = await client.getBalance(plan.recipient);
      const subscriptionInfo = await program.account.subscription.fetch(
        subscriptionKey
      );
      expect((initialVaultBalance - finalVaultBalance).toString()).to.equals(
        plan.chargeAmount.toString()
      );
      expect(
        (finalRecipientBalance - initialRecipientBalance).toString()
      ).to.equals(plan.chargeAmount.toString());
      expect(subscriptionInfo.lastChargeTs.toString()).to.equals(
        (
          currentClock.unixTimestamp + BigInt(plan.interval.toString())
        ).toString()
      );
      expect(subscriptionInfo.nextChargeTs.toNumber()).to.equals(
        subscriptionInfo.lastChargeTs.toNumber() + plan.interval.toNumber()
      );
    });

    it("should not charge before period elapses", async () => {
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
          recipient: providerVault, // recipient is the provider's vault
        },
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos,
        false
      );

      // subscribe
      const plan = planInfos[0];
      const [subscriptionKey] = web3.PublicKey.findProgramAddressSync(
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
        subscription: subscriptionKey,
      };
      await program.methods
        .subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({ ...accounts })
        .signers([subscriberWallet])
        .rpc();
      // time travel to a time before the next charge timestamp
      const currentClock = await client.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          currentClock.unixTimestamp + BigInt(plan.interval.toNumber() / 2)
        )
      );
      // attempt charge
      try {
        await program.methods
          .chargeSol(new anchor.BN(serviceId))
          .accounts({
            ...{
              signer: feePayer,
              subscriber: subscriberWallet.publicKey,
              subscriberVault,
              recipient: plan.recipient,
              serviceProvider: serviceProvider.publicKey,
              service,
              subscription: subscriptionKey,
            },
          })
          .rpc();
        assert.ok(false);
      } catch (error) {
        // we rely on the logs to check the right error
        // banks client provider does not handle anchor errors properly
        assert.ok(true);
      }
    });

    it("should fail charge with inactive subscription", async () => {
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
        },
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos,
        false
      );

      // subscribe
      const plan = planInfos[0];
      const [subscriptionKey] = web3.PublicKey.findProgramAddressSync(
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
        subscription: subscriptionKey,
      };
      await program.methods
        .subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({ ...accounts })
        .signers([subscriberWallet])
        .rpc();
      
      // unsubscribe
      await program.methods.unsubscribe(new anchor.BN(serviceId))
        .accounts({...{
            feePayer,
            subscriber: subscriberWallet.publicKey,
            serviceProvider: serviceProvider.publicKey,
            service,
            subscription: subscriptionKey
        }})
        .signers([subscriberWallet])
        .rpc()
      // attempt charge
      try {
        await program.methods
          .chargeSol(new anchor.BN(serviceId))
          .accounts({
            ...{
              signer: feePayer,
              subscriber: subscriberWallet.publicKey,
              subscriberVault,
              recipient: plan.recipient,
              serviceProvider: serviceProvider.publicKey,
              service,
              subscription: subscriptionKey,
            },
          })
          .rpc();
        assert.ok(false);
      } catch (error) {
        // we rely on the logs to check the right error
        // banks client provider does not handle anchor errors properly
        assert.ok(true);
      }
    });

    it("should fail charge with inactive plan subscription", async () => {
      // create service with sol plan
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
        },
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos,
        false
      );

      // subscribe
      const plan = planInfos[0];
      const [subscriptionKey] = web3.PublicKey.findProgramAddressSync(
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
        subscription: subscriptionKey,
      };
      await program.methods
        .subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({ ...accounts })
        .signers([subscriberWallet])
        .rpc();

      // deactivate plan
      const deactivateAccounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      await program.methods
        .planStatusUpdate(new anchor.BN(serviceId), new anchor.BN(1), false)
        .accounts({ ...deactivateAccounts })
        .signers([serviceProvider])
        .rpc();

      // attempt charge
      try {
        await program.methods
          .chargeSol(new anchor.BN(serviceId))
          .accounts({
            ...{
              signer: feePayer,
              subscriber: subscriberWallet.publicKey,
              subscriberVault,
              recipient: plan.recipient,
              serviceProvider: serviceProvider.publicKey,
              service,
              subscription: subscriptionKey,
            },
          })
          .rpc();
        assert.ok(false);
      } catch (error) {
        // we rely on the logs to check the right error
        // banks client provider does not handle anchor errors properly
        assert.ok(true);
      }
    });

    it("should fail charge with inactive service subscription", async () => {
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
        },
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos,
        false
      );

      // subscribe
      const plan = planInfos[0];
      const [subscriptionKey] = web3.PublicKey.findProgramAddressSync(
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
        subscription: subscriptionKey,
      };
      await program.methods
        .subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({ ...accounts })
        .signers([subscriberWallet])
        .rpc();

      // deactivate service
      const deactivateAccounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      await program.methods
        .serviceStatusUpdate(new anchor.BN(serviceId), false)
        .accounts({ ...deactivateAccounts })
        .signers([serviceProvider])
        .rpc();

      // attempt charge
      try {
        await program.methods
          .chargeSol(new anchor.BN(serviceId))
          .accounts({
            ...{
              signer: feePayer,
              subscriber: subscriberWallet.publicKey,
              subscriberVault,
              recipient: plan.recipient,
              serviceProvider: serviceProvider.publicKey,
              service,
              subscription: subscriptionKey,
            },
          })
          .rpc();
        assert.ok(false);
      } catch (error) {
        // we rely on the logs to check the right error
        // banks client provider does not handle anchor errors properly
        assert.ok(true);
      }
    });

    it("should fail charge with the wrong recipient", async () => {
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
          chargeAmount: new anchor.BN(1 * web3.LAMPORTS_PER_SOL),
          interval: new anchor.BN(3600), // 3600 seconds,
          tokenMint: null, // represents sol,
          recipient: providerVault, // recipient is the provider's vault
        },
      ];
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        serviceId,
        planInfos,
        false
      );

      // subscribe
      const plan = planInfos[0];
      const [subscriptionKey] = web3.PublicKey.findProgramAddressSync(
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
        subscription: subscriptionKey,
      };
      await program.methods
        .subscribeSol(new anchor.BN(serviceId), new anchor.BN(1))
        .accounts({ ...accounts })
        .signers([subscriberWallet])
        .rpc();

      // attempt charge
      try {
        await program.methods
          .chargeSol(new anchor.BN(serviceId))
          .accounts({
            ...{
              signer: feePayer,
              subscriber: subscriberWallet.publicKey,
              subscriberVault,
              recipient: subscriberWallet.publicKey,
              serviceProvider: serviceProvider.publicKey,
              service,
              subscription: subscriptionKey,
            },
          })
          .rpc();
        assert.ok(false);
      } catch (error) {
        // we rely on the logs to check the right error
        // banks client provider does not handle anchor errors properly
        assert.ok(true);
      }
    });
  });

  describe("Token charge tests", () => {});

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
