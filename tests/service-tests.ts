import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import { assert, expect } from "chai";
import { confirm, createVault, createService } from "./utils";

describe("Aeon Service/Plan Tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.AeonProgram as Program<AeonProgram>;
  const user1Wallet = new web3.Keypair();
  const serviceProvider = new web3.Keypair();
  const tokenMinter = new web3.Keypair();

  before(async () => {
    const sig = await connection.requestAirdrop(
      serviceProvider.publicKey,
      10 * web3.LAMPORTS_PER_SOL
    );
    await confirm(connection, sig);
  });

  describe("Service/Plan creation tests", () => {
    const [providerVault] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("aeon"),
        Buffer.from("vault"),
        serviceProvider.publicKey.toBuffer(),
      ],
      program.programId
    );
    const [service] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("aeon"),
        Buffer.from("service"),
        serviceProvider.publicKey.toBuffer(),
        new anchor.BN(1).toBuffer("le", 8),
      ],
      program.programId
    );
    const planInfos = [
      {
        chargeAmount: new anchor.BN(10 * web3.LAMPORTS_PER_SOL),
        interval: new anchor.BN(3600), // 3600 seconds,
        tokenMint: null, // represents sol,
        recipient: serviceProvider.publicKey,
      },
      {
        chargeAmount: new anchor.BN(15 * web3.LAMPORTS_PER_SOL),
        interval: new anchor.BN(7200), // 3600 seconds,
        tokenMint: null, // represents sol,
        recipient: serviceProvider.publicKey,
      },
    ];

    before(async () => {
      // create vault for service provider
      await createVault(connection, program, serviceProvider, providerVault, 0);
      // create service
      await createService(
        connection,
        program,
        serviceProvider,
        providerVault,
        service,
        1,
        planInfos
      );
    });

    it("service state checks!", async () => {
      const serviceInfo = await program.account.service.fetch(service);
      expect(serviceInfo.id.toNumber()).to.equals(1);
      expect(serviceInfo.createdBy.toString()).to.equals(
        serviceProvider.publicKey.toString()
      );
      expect(serviceInfo.createdAt.toNumber()).to.greaterThan(0);
      expect(serviceInfo.plans.length).to.equals(planInfos.length);
      expect(serviceInfo.plans[0].chargeAmount.toString()).to.equals(
        planInfos[0].chargeAmount.toString()
      );
      expect(serviceInfo.plans[0].interval.toString()).to.equals(
        planInfos[0].interval.toString()
      );
      expect(serviceInfo.plans[0].recipient.toString()).to.equals(
        planInfos[0].recipient.toString()
      );
      expect(serviceInfo.plans[0].id.toNumber()).to.equals(1);
      expect(serviceInfo.plans[1].chargeAmount.toString()).to.equals(
        planInfos[1].chargeAmount.toString()
      );
      expect(serviceInfo.plans[1].interval.toString()).to.equals(
        planInfos[1].interval.toString()
      );
      expect(serviceInfo.plans[1].recipient.toString()).to.equals(
        planInfos[1].recipient.toString()
      );
      expect(serviceInfo.plans[1].id.toNumber()).to.equals(2);
      assert.ok(serviceInfo.isActive);
      assert.ok(serviceInfo.plans[0].isActive);
      assert.ok(serviceInfo.plans[1].isActive);
    });

    it("owner can deactivate service", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      const sig = await program.methods
        .serviceStatusUpdate(new anchor.BN(1), false)
        .accounts({ ...accounts })
        .signers([serviceProvider])
        .rpc();
      await confirm(connection, sig);
      const serviceInfo = await program.account.service.fetch(service);
      expect(serviceInfo.isActive).to.equals(false);
    });

    it("owner can deactivate plan", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      const sig = await program.methods
        .planStatusUpdate(new anchor.BN(1), new anchor.BN(2), false)
        .accounts({ ...accounts })
        .signers([serviceProvider])
        .rpc();
      await confirm(connection, sig);
      const serviceInfo = await program.account.service.fetch(service);
      const plan = serviceInfo.plans.filter((p) => p.id.toNumber() == 2);
      expect(plan[0].isActive).to.equals(false);
    });

    it("owner can add new plan", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: serviceProvider.publicKey,
        service,
      };
      const planInfo = {
        chargeAmount: new anchor.BN(20 * web3.LAMPORTS_PER_SOL),
        interval: new anchor.BN(10000), // 10000 seconds,
        tokenMint: null, // represents sol,
        recipient: tokenMinter.publicKey,
      };
      const sig = await program.methods
        .planAdd(new anchor.BN(1), planInfo)
        .accounts({ ...accounts })
        .signers([serviceProvider])
        .rpc();
      await confirm(connection, sig);
      const serviceInfo = await program.account.service.fetch(service);
      const plan = serviceInfo.plans.filter((p) => p.id.toNumber() == 3);
      expect(plan[0].chargeAmount.toString()).to.equals(
        planInfo.chargeAmount.toString()
      );
      expect(plan[0].interval.toString()).to.equals(
        planInfo.interval.toString()
      );
      expect(plan[0].recipient.toString()).to.equals(
        planInfo.recipient.toString()
      );
      expect(plan[0].tokenMint).to.equals(planInfo.tokenMint);
    });

    it("cannot deactivate service if not owner", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        service,
      };
      try {
        await program.methods
          .serviceStatusUpdate(new anchor.BN(1), false)
          .accounts({ ...accounts })
          .signers([user1Wallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorMessage).to.equals(
          "A seeds constraint was violated"
        );
      }
    });

    it("cannot deactivate plan if not owner", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        service,
      };
      try {
        await program.methods
          .planStatusUpdate(new anchor.BN(1), new anchor.BN(1), false)
          .accounts({ ...accounts })
          .signers([user1Wallet])
          .rpc();
        assert.ok(false);
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorMessage).to.equals(
          "A seeds constraint was violated"
        );
      }
    });

    it("cannot add new plan if not owner", async () => {
      const accounts = {
        feePayer: anchor.getProvider().publicKey,
        owner: user1Wallet.publicKey,
        service,
      };
      const planInfo = {
        chargeAmount: new anchor.BN(20 * web3.LAMPORTS_PER_SOL),
        interval: new anchor.BN(10000), // 10000 seconds,
        tokenMint: null, // represents sol,
        recipient: tokenMinter.publicKey,
      };
      try {
        await program.methods
          .planAdd(new anchor.BN(1), planInfo)
          .accounts({ ...accounts })
          .signers([user1Wallet])
          .rpc();
      } catch (error) {
        expect((error as anchor.AnchorError).error.errorMessage).to.equals(
          "A seeds constraint was violated"
        );
      }
    });
  });
});
