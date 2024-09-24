import { Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import { decode } from "bs58";

const BASE_KEY_PATH = "./.anchor/keys";
export const getPublicKey = (name: String) =>
  new PublicKey(
    JSON.parse(
      fs.readFileSync(`${BASE_KEY_PATH}/${name}_pub.json`) as unknown as string
    )
  );

export const getPrivateKey = (name: string) =>
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(`${BASE_KEY_PATH}/${name}.json`) as unknown as string
    )
  );

export const writePublicKey = (publicKey: PublicKey, name: string) => {
  const path = `${BASE_KEY_PATH}/${name}_pub.json`;
  console.log(`Writing Public Key To: ${path}`);
  fs.writeFileSync(path, JSON.stringify(publicKey.toString()));
};

export const writeSecretKey = (secretKey: Uint8Array, name: string) => {
  const path = `${BASE_KEY_PATH}/${name}.json`;
  console.log(`Writing Secret Key To: ${path}`);
  fs.writeFileSync(path, `[${secretKey.toString()}]`);
};

export const getKeypair = (name: string, isSecret?: boolean) => {
  if (isSecret) {
    const decoded = decode(
      JSON.parse(
        fs.readFileSync(`${BASE_KEY_PATH}/${name}.json`) as unknown as string
      )
    );
    return Keypair.fromSecretKey(decoded);
  }
  return new Keypair({
    publicKey: getPublicKey(name).toBytes(),
    secretKey: getPrivateKey(name),
  });
};
