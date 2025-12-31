import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits
} from "viem";
import { CHAIN, RPC_URL, ERC20_ABI, ERC20_ADDRESS } from "./config.js";
import { loadWallet } from "./wallet.js";

export async function transferERC20(to, amount) {
  const account = loadWallet();

  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL)
  });

  const walletClient = createWalletClient({
    account,
    chain: CHAIN,
    transport: http(RPC_URL)
  });

  // const decimals = await publicClient.readContract({
  //   address: ERC20_ADDRESS,
  //   abi: ERC20_ABI,
  //   functionName: "decimals"
  // });
  const decimals = 18;
  const value = parseUnits(amount, decimals);

  const hash = await walletClient.writeContract({
    address: ERC20_ADDRESS,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, value],
    gas: 100000n
  });

  console.log("🚀 交易已发送:", hash);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("✅ 交易已确认");
}
