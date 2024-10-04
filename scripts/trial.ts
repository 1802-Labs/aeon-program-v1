import * as nacl from "tweetnacl";
import * as bs58 from "bs58";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AeonProgram } from "../target/types/aeon_program";
import { web3 } from "@coral-xyz/anchor";
import { getKeypair } from "./shared";

const connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));

const userWallet = getKeypair("token-mint");
const feePayer = getKeypair("subscriber");
const bob = getKeypair("service-provider");

const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(feePayer),
  { commitment: "confirmed" }
);
const program = new Program(
  require("../target/idl/aeon_program.json") as anchor.Idl,
  provider
) as unknown as Program<AeonProgram>;

// to complete a offline transaction, I will seperate them into four steps
// 1. Create Transaction
// 2. Sign Transaction
// 3. Recover Transaction
// 4. Send Transaction

const main = async () => {
  // const lutAddress = "Gr8rXuDwE2Vd2F5tifkPyMaUR67636YgrZEjkJf9RR9V";
  // const lutData = await connection.getAddressLookupTable(new web3.PublicKey(lutAddress));
  // console.log(lutData.value.state.addresses.map((addr) => addr.toBase58()))
  console.log("Started...");

  // create a example tx, alice transfer to bob and feePayer is `feePayer`
  // alice and feePayer are signer in this tx

  // 1. Create Vault Transaction Transaction
  const [vaultKey] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("aeon"),
      Buffer.from("vault"),
      userWallet.publicKey.toBuffer(),
    ],
    program.programId
  );
  const accounts = {
    feePayer: feePayer.publicKey,
    owner: userWallet.publicKey,
    vault: vaultKey,
  };
  const createVaultIx = await program.methods
    .vaultCreate(new anchor.BN(0))
    .accounts({ ...accounts })
    .instruction();
  let tx = new web3.Transaction().add(createVaultIx);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = feePayer.publicKey;
  let realDataNeedToSign = tx.serializeMessage(); // the real data singer need to sign.

  // 2. Sign Transaction
  // use any lib you like, the main idea is to use ed25519 to sign it.
  // the return signature should be 64 bytes.
  let feePayerSignature = nacl.sign.detached(
    realDataNeedToSign,
    feePayer.secretKey
  );
  let ownerSignature = nacl.sign.detached(
    realDataNeedToSign,
    userWallet.secretKey
  );

  // 3. Recover Tranasction

  // you can verify signatures before you recovering the transaction
  let verifyFeePayerSignatureResult = nacl.sign.detached.verify(
    realDataNeedToSign,
    feePayerSignature,
    feePayer.publicKey.toBytes() // you should use the raw pubkey (32 bytes) to verify
  );
  console.log(`verify feePayer signature: ${verifyFeePayerSignatureResult}`);

  let verifyOwnerSignatureResult = nacl.sign.detached.verify(
    realDataNeedToSign,
    ownerSignature,
    userWallet.publicKey.toBytes()
  );
  console.log(`verify alice signature: ${verifyOwnerSignatureResult}`);

  // there are two ways you can recover the tx
  // 3.a Recover Tranasction (use populate then addSignauture)
  // convert the real data need to sign to base58 ad back again
  const encodedData = bs58.encode(realDataNeedToSign);
  const encodedOwnerSig = bs58.encode(ownerSignature);
  const decodedOwnerSig = bs58.decode(encodedOwnerSig);
  console.log(decodedOwnerSig.equals(ownerSignature));
  //console.log(`Encoded Data String: ${encodedData}`);
  const decodedData = bs58.decode(encodedData);
  console.log(decodedData.equals(realDataNeedToSign));
  {
    let recoverTx = web3.Transaction.populate(web3.Message.from(decodedData));
    recoverTx.addSignature(feePayer.publicKey, Buffer.from(feePayerSignature));
    recoverTx.addSignature(userWallet.publicKey, Buffer.from(ownerSignature));

    // 4. Send transaction
    console.log(
      `txhash: ${await connection.sendRawTransaction(recoverTx.serialize())}`
    );
  }
};

main();
