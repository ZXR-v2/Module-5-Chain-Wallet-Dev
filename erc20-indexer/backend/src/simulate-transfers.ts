import {
  createWalletClient,
  createPublicClient,
  getAddress,
  http,
  parseUnits,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";
import { TOKEN_ABI } from "./abi";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

if (!TOKEN_ADDRESS || !PRIVATE_KEY) {
  throw new Error("TOKEN_ADDRESS and PRIVATE_KEY environment variables are required");
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL),
});

// 模拟接收地址（可以替换为实际地址）
const RECIPIENT_ADDRESSES = [
  getAddress("0x742d35cc6634c0532925a3b844bc454e4438f44e"),
  getAddress("0x8ba1f109551bd432803012645ac136ddd64dba72"),
];

async function simulateTransfer(to: `0x${string}`, amount: string) {
  try {
    console.log(`\n📤 准备转账 ${amount} tokens 到 ${to}...`);

    const value = parseUnits(amount, 18);

    const hash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: "transfer",
      args: [to, value],
      gas: 100000n,
    });

    console.log(`🚀 交易已发送: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ 交易已确认，区块号: ${receipt.blockNumber}`);
    
    return receipt;
  } catch (error: any) {
    console.error(`❌ 转账失败: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log("🎭 开始模拟转账...");
  console.log(`Token 地址: ${TOKEN_ADDRESS}`);
  console.log(`发送地址: ${account.address}`);

  // 模拟第一笔转账
  console.log("\n=== 第一笔转账 ===");
  await simulateTransfer(RECIPIENT_ADDRESSES[0], "100.5");
  
  // 等待一段时间
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 模拟第二笔转账
  console.log("\n=== 第二笔转账 ===");
  await simulateTransfer(RECIPIENT_ADDRESSES[1], "250.75");

  console.log("\n✅ 所有模拟转账完成！");
}

main().catch(console.error);
