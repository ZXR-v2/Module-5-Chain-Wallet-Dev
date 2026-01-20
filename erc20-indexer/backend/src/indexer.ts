import {
  createPublicClient,
  formatUnits,
  http,
  parseAbiItem,
} from "viem";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";
import db from "./db/database.js";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS as `0x${string}`;
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS || "18");
const START_BLOCK = process.env.START_BLOCK
  ? BigInt(process.env.START_BLOCK)
  : null;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const ETHERSCAN_BASE_URL =
  process.env.ETHERSCAN_BASE_URL || "https://api-sepolia.etherscan.io/api";

if (!TOKEN_ADDRESS) {
  throw new Error("TOKEN_ADDRESS environment variable is required");
}

// 创建公共客户端
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// Transfer 事件 ABI
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

async function getLastIndexedBlock(tokenAddress: string): Promise<bigint> {
  const stmt = db.prepare("SELECT last_indexed_block FROM index_progress WHERE token_address = ?");
  const result = stmt.get(tokenAddress) as { last_indexed_block: number } | undefined;
  if (result) {
    return BigInt(result.last_indexed_block);
  }

  return await getInitialFromBlock(tokenAddress);
}

async function updateLastIndexedBlock(tokenAddress: string, blockNumber: bigint) {
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO index_progress (token_address, last_indexed_block, updated_at) VALUES (?, ?, datetime('now'))"
  );
  stmt.run(tokenAddress, Number(blockNumber));
}

async function getInitialFromBlock(tokenAddress: string): Promise<bigint> {
  if (START_BLOCK !== null) {
    return START_BLOCK > 0n ? START_BLOCK - 1n : 0n;
  }

  const creationBlock = await getContractCreationBlock(tokenAddress);
  return creationBlock > 0n ? creationBlock - 1n : 0n;
}

async function getContractCreationBlock(tokenAddress: string): Promise<bigint> {
  if (!ETHERSCAN_API_KEY) {
    throw new Error(
      "ETHERSCAN_API_KEY is required to auto-detect contract creation block. " +
        "Set START_BLOCK to skip this lookup."
    );
  }

  const url = new URL(ETHERSCAN_BASE_URL);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getcontractcreation");
  url.searchParams.set("contractaddresses", tokenAddress);
  url.searchParams.set("apikey", ETHERSCAN_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Etherscan request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    status: string;
    message: string;
    result: Array<{ blockNumber: string }>;
  };

  if (data.status !== "1" || !data.result?.length) {
    throw new Error(`Etherscan response error: ${data.message || "unknown error"}`);
  }

  return BigInt(data.result[0].blockNumber);
}

async function saveTransfer(log: any, blockTimestamp: bigint) {
  const valueDecimal = parseFloat(formatUnits(log.args.value, TOKEN_DECIMALS));
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO transfers (
      transaction_hash,
      block_number,
      block_timestamp,
      token_address,
      from_address,
      to_address,
      value,
      value_decimal
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(
      log.transactionHash,
      Number(log.blockNumber),
      Number(blockTimestamp),
      log.address.toLowerCase(),
      log.args.from.toLowerCase(),
      log.args.to.toLowerCase(),
      log.args.value.toString(),
      valueDecimal
    );
    console.log(`✅ 已保存转账: ${log.transactionHash}`);
  } catch (error: any) {
    if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
      console.error(`❌ 保存转账失败: ${error.message}`);
    }
  }
}

async function indexTransfers() {
  console.log("🚀 开始索引 ERC20 转账...");
  console.log(`Token 地址: ${TOKEN_ADDRESS}`);

  try {
    // 获取当前区块号
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`当前区块号: ${currentBlock}`);

    // 获取上次索引的区块号
    const fromBlock = await getLastIndexedBlock(TOKEN_ADDRESS);
    const toBlock = currentBlock;

    if (fromBlock >= toBlock) {
      console.log("✅ 没有新区块需要索引");
      return;
    }

    console.log(`📊 扫描区块范围: ${fromBlock} -> ${toBlock}`);

    // 获取 Transfer 事件
    // 如果 fromBlock 为 0，从 1 开始（避免从 0 开始可能的问题）
    const startBlock = fromBlock === 0n ? 1n : fromBlock + 1n;
    const logs = await publicClient.getLogs({
      address: TOKEN_ADDRESS,
      event: TRANSFER_EVENT,
      fromBlock: startBlock,
      toBlock,
    });

    console.log(`📝 找到 ${logs.length} 个 Transfer 事件`);

    // 批量获取区块时间戳
    const blockNumbers = [...new Set(logs.map(log => log.blockNumber))];
    const blockTimestamps = new Map<bigint, bigint>();

    for (const blockNumber of blockNumbers) {
      const block = await publicClient.getBlock({ blockNumber });
      blockTimestamps.set(blockNumber, block.timestamp);
    }

    // 保存转账记录
    for (const log of logs) {
      const blockTimestamp = blockTimestamps.get(log.blockNumber) || 0n;
      await saveTransfer(log, blockTimestamp);
    }

    // 更新索引进度
    await updateLastIndexedBlock(TOKEN_ADDRESS, toBlock);

    console.log(`✅ 索引完成！已处理 ${logs.length} 个转账事件`);
  } catch (error) {
    console.error("❌ 索引过程中发生错误:", error);
    throw error;
  }
}

// 持续索引（每 10 秒检查一次）
async function startIndexer() {
  console.log("🔄 启动持续索引服务...");
  
  while (true) {
    try {
      await indexTransfers();
    } catch (error) {
      console.error("索引错误:", error);
    }
    
    // 等待 10 秒后再次索引
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

// 如果直接运行此文件，启动索引器
if (import.meta.url === `file://${process.argv[1]}`) {
  startIndexer().catch(console.error);
}

export { indexTransfers, startIndexer };
