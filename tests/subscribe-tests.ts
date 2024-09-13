import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SupersubContracts } from "../target/types/supersub_contracts";
import { assert, expect } from "chai";
import { confirm, createService, createVault, transferSOLToVault, transferTokenToVault } from "./utils";

describe("Aeon-contract-tests", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = anchor.getProvider().connection;
  const program = anchor.workspace
    .SupersubContracts as Program<SupersubContracts>;
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
  describe("Subscription Test", () => {
    // Test that a user can subscribe
    // Test that a user can unsubscribe
    // Test that a user get's charged on the first subscription
    // Test that charge can be performed when the subscription is due for payment
    // Test that charge cannot be performed before due date/time
  });
});
