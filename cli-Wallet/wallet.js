// wallet.js
import fs from "fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export function createWallet() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  fs.writeFileSync(
    "./wallet.json",
    JSON.stringify(
      {
        address: account.address,
        privateKey
      },
      null,
      2
    )
  );

  console.log("钱包创建成功");
  console.log("Address:", account.address);
}


export function loadWallet() {
  const wallet = JSON.parse(
    fs.readFileSync("./wallet.json", "utf-8")
  );

  return privateKeyToAccount(wallet.privateKey);
}
