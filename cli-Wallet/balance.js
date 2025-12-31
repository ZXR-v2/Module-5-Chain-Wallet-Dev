import { createPublicClient, http, formatEther, formatUnits } from "viem";
import { CHAIN, RPC_URL, ERC20_ABI, ERC20_ADDRESS } from "./config.js";
import { loadWallet } from "./wallet.js";

export async function queryBalance() {
  const account = loadWallet();

  const client = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL)
  });

  const ethBalance = await client.getBalance({
    address: account.address
  });

  console.log("👤 Address:", account.address);
  console.log("💰 ETH:", formatEther(ethBalance));

  const decimals = await client.readContract({
    address: ERC20_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals"
  });

  const tokenBalance = await client.readContract({
    address: ERC20_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address]
  });

  console.log(
    "💰 ERC20:",
    formatUnits(tokenBalance, decimals)
  );
}
