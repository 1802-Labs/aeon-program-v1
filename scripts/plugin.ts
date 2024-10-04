import { AeonProgram } from "./idl/aeon_program";
import { Idl, web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as fs from "fs";

const FEE_PAYER = "2yZgY7sdYK31n1rifYBXBd3hCWeS1CzqYwv3Mzty82vo";
const WSOL_ADDRESS = "So11111111111111111111111111111111111111112"

interface PlanInfo {
    chargeAmount: number,
    recipientAddress: string,
    interval: number,
    tokenMintAddress: string,
    mintDecimals: number
}

export class AeonProgramClient {
  program: Program<AeonProgram>;
  feePayer: web3.PublicKey;
  connection: web3.Connection;

  constructor(network: "devnet" | "mainnet-beta") {
    const idlJson = JSON.parse(
      fs.readFileSync("./idl/aeon_program.json").toString()
    );
    this.program = new Program(
      idlJson as Idl
    ) as unknown as Program<AeonProgram>;
    this.connection = new web3.Connection(web3.clusterApiUrl(network));
    this.feePayer = new web3.PublicKey(FEE_PAYER);
  }

  async getCreateVaultTransaction(owner: string) {
    const vaultOwnerKey = new web3.PublicKey(owner);
    const [vaultKey] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("aeon"), Buffer.from("vault"), vaultOwnerKey.toBuffer()],
      this.program.programId
    );

    const accounts = {
      owner: vaultOwnerKey,
      feePayer: this.feePayer,
      vault: vaultKey,
    };
    const createVaultIx = await this.program.methods
      .vaultCreate(new anchor.BN(0 * web3.LAMPORTS_PER_SOL))
      .accounts({ ...accounts })
      .instruction();

    const tx = new web3.Transaction().add(createVaultIx);
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = this.feePayer;
    return tx;
  }

  async getCreateProductTransaction(
    owner: string,
    name: string,
    description: string,
    logoUrl: string,
    plans: PlanInfo[]
  ) {
    const serviceId = this.generateRandomId(16);
    const serviceInfo = {
      logoUrl,
      description,
      serviceId: serviceId.toString(),
      name,
    };
    const serviceProvider = new web3.PublicKey(owner);
    const [vaultKey] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("aeon"), Buffer.from("vault"), serviceProvider.toBuffer()],
        this.program.programId
      );
    const [serviceKey] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("aeon"),
          Buffer.from("service"),
          serviceProvider.toBuffer(),
          new anchor.BN(serviceId.toString()).toBuffer("le", 8),
        ],
        this.program.programId
    );
    const planInfos = plans.map((plan) => {
        const info = {
            chargeAmount: new anchor.BN(plan.chargeAmount * 10 ** plan.mintDecimals),
            recipient: new web3.PublicKey(plan.recipientAddress),
            interval: new anchor.BN(plan.interval),
            tokenMint: plan.tokenMintAddress == WSOL_ADDRESS ? null : new web3.PublicKey(plan.tokenMintAddress)
        }
        if (info.tokenMint) {
            const recipientAta = getAssociatedTokenAddressSync(
                info.tokenMint,
                info.recipient,
                web3.PublicKey.isOnCurve(info.recipient.toString())
            );
            info.recipient = recipientAta;
        }
        return info
    })

    const memoIx = new web3.TransactionInstruction({
      programId: new web3.PublicKey(
        "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
      ),
      data: Buffer.from(JSON.stringify(serviceInfo), "utf8"),
      keys: [],
    });

    const accounts = {
      feePayer: this.feePayer,
      owner: serviceProvider,
      service: serviceKey,
      vault: vaultKey,
    };
    const createServiceIx = await this.program.methods
      .serviceCreate(new anchor.BN(serviceId.toString()), planInfos)
      .accounts({ ...accounts })
      .instruction();
    const tx = new web3.Transaction().add(memoIx).add(createServiceIx);
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = this.feePayer;
    return tx
  }

  async getSubscribeTransaction() {
    
  }

  generateRandomId(randomBits: number = 48): bigint {
    const timestamp = BigInt(Date.now()); // Current timestamp in milliseconds

    // Calculate the maximum value for the random part based on the number of random bitsw
    const maxRandomValue = BigInt(1) << BigInt(randomBits); // 2^randomBits

    // Generate random number within the range of maxRandomValue
    const randomPart = BigInt(
      Math.floor(Math.random() * Number(maxRandomValue))
    );

    // Combine timestamp and random part, shift timestamp based on randomBits length
    return (timestamp << BigInt(randomBits)) | randomPart;
  }
}
