import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import { createServiceWithMemo, createVault } from "../tests/utils";
import { getKeypair } from "./shared";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const connection = provider.connection;
const feePayer = provider.wallet;
const program = anchor.workspace.AeonProgram as Program<AeonProgram>;
const mintKeyPair = getKeypair("token-mint");
const serviceProvider = getKeypair("service-provider");

const main = async () => {
  const serviceId = 1;
  const name = "Spotify";
  const logoUrl =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/168px-Spotify_logo_without_text.svg.png";
  const [providerVault] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("aeon"),
      Buffer.from("vault"),
      serviceProvider.publicKey.toBuffer(),
    ],
    program.programId
  );
  const providerVaultAta = getAssociatedTokenAddressSync(
    mintKeyPair.publicKey,
    serviceProvider.publicKey,
    true
  );
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
      chargeAmount: new anchor.BN(0.001 * web3.LAMPORTS_PER_SOL),
      interval: new anchor.BN(3600), // 3600 seconds,
      tokenMint: null, // represents sol,
      recipient: serviceProvider.publicKey,
    },
    {
      chargeAmount: new anchor.BN(15 * 10 ** 6),
      interval: new anchor.BN(3600), // 3600 seconds,
      tokenMint: mintKeyPair.publicKey,
      recipient: providerVaultAta,
    },
  ];
  const memoData = Buffer.from(
    JSON.stringify({ sId: serviceId, name, logoUrl }),
    "utf8"
  );
  try {
    const sig = await createVault(
      connection,
      program,
      serviceProvider,
      providerVault,
      0.1
    );
    console.log(`Vault Key: ${providerVault.toString()}`);
    console.log(`Vault Create Transaction Signature: ${sig}`);
  } catch (error) {
    console.log(error);
  }
  // create service
  const memoIx = new web3.TransactionInstruction({
    programId: new web3.PublicKey(
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
    ),
    data: memoData,
    keys: [],
  });
  const serviceCreateSig = await createServiceWithMemo(
    connection,
    program,
    serviceProvider,
    providerVault,
    service,
    serviceId,
    planInfos,
    memoIx
  );
  console.log(
    `Service create signature: ${serviceCreateSig}\nService Key: ${service.toString()}`
  );

  // update service and plan
  const serviceUpdateSig = await program.methods
    .serviceStatusUpdate(new anchor.BN(serviceId), true)
    .accounts({
      ...{
        feePayer: feePayer.publicKey,
        owner: serviceProvider.publicKey,
        service,
      },
    })
    .signers([serviceProvider])
    .rpc();
  console.log(
    `Service status update signature: ${serviceUpdateSig}\nService Key: ${service.toString()}`
  );
  const planUpdateSig = await program.methods
    .planStatusUpdate(new anchor.BN(serviceId), new anchor.BN(2), true)
    .accounts({
      ...{
        feePayer: feePayer.publicKey,
        owner: serviceProvider.publicKey,
        service,
      },
    })
    .signers([serviceProvider])
    .rpc();
  console.log(
    `Plan status update signature: ${planUpdateSig}\nService Key: ${service.toString()}`
  );

  // add a new plan
  const planInfo = {
    chargeAmount: new anchor.BN(25 * 10 ** 6),
    interval: new anchor.BN(5000), // 5000 seconds,
    tokenMint: mintKeyPair.publicKey,
    recipient: providerVaultAta,
  };
  const planAddSig = await program.methods
    .planAdd(new anchor.BN(1), planInfo)
    .accounts({
      ...{
        feePayer: feePayer.publicKey,
        owner: serviceProvider.publicKey,
        service,
      },
    })
    .signers([serviceProvider])
    .rpc();
  console.log(
    `Plan Addition signature: ${planAddSig}\nService Key: ${service.toString()}`
  );
};

main();
