'use client';

/**
 * TokenWalletPage（/tokenWallet）
 * 目标：
 * 1) 展示当前连接地址
 * 2) 展示 BaseERC20 余额
 * 3) 提供 ERC20 转账功能：transfer(to, amount)
 *
 * 你会看到 wagmi/viem 的常用组合：
 * - wagmi: useAccount/useChainId/useReadContract/useWriteContract/useWaitForTransactionReceipt
 * - viem:  formatUnits/parseUnits 处理金额精度
 */

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits, parseUnits } from 'viem';

import type { Abi } from 'viem';
import BaseERC20ABI from '@/contracts/BaseERC20.json';
const baseERC20Abi = BaseERC20ABI as Abi;

import { getContractAddress, isValidAddress } from '@/lib/contracts';

export default function TokenWalletPage() {
  // 1) 钱包连接信息（来自 wagmi）
  const { address, isConnected } = useAccount();

  // 2) 当前链（sepolia = 11155111）
  const chainId = useChainId();

  // 3) BaseERC20 合约地址（从你的 contracts.ts 根据 chainId 获取）
  const tokenAddress = useMemo(() => {
    try {
      return getContractAddress(chainId, 'BaseERC20') as `0x${string}`;
    } catch {
      return undefined;
    }
  }, [chainId]);

  // 4) 读余额：balanceOf(address)
  // wagmi 的 useReadContract 会自动用 publicClient 去 RPC 读取链上数据
  const {
    data: balance,
    refetch: refetchBalance, // 读完交易后我们手动刷新余额
    isLoading: isBalanceLoading,
  } = useReadContract({
    address: tokenAddress,
    abi: baseERC20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!tokenAddress && !!address, // 没连接钱包就不读
    },
  });

  // 5) 转账表单状态（React useState）
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState(''); // 人类可读，比如 "50"
  const [msg, setMsg] = useState('');

  // 6) 写合约（发交易）
  const { writeContractAsync } = useWriteContract();

  // 7) 交易状态：保存最近一次交易 hash，然后用 useWaitForTransactionReceipt 等待确认
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const {
    isLoading: isTxPending, // 交易是否在确认中
    isSuccess: isTxSuccess, // 交易是否确认成功
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // 8) decimals：BaseERC20 默认 18（OZ ERC20 默认）
  const decimals = 18;

  // 9) 把 amount 从 "50" 转成链上 uint256
  const amountWei = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, decimals);
    } catch {
      return 0n;
    }
  }, [amount]);

  // 10) 交易成功后：刷新余额 + 清理状态
  useEffect(() => {
    if (isTxSuccess) {
      refetchBalance?.();
      setMsg('✅ 转账成功（已确认）');
      setTxHash(undefined);
      // 可选：转账成功后清空输入
      setAmount('');
      // setTo('');
    }
  }, [isTxSuccess, refetchBalance]);

  /**
   * 核心动作：调用 BaseERC20.transfer(to, amount)
   * - 这是写合约，会弹钱包签名
   * - 成功后返回交易 hash
   */
  const onTransfer = async () => {
    setMsg('');

    if (!isConnected || !address) return setMsg('请先连接钱包');
    if (!tokenAddress) return setMsg('当前网络不支持或 Token 地址未配置');
    if (!to || !isValidAddress(to)) return setMsg('收款地址不合法（必须 0x 开头 40 位 hex）');
    if (!amount || amountWei <= 0n) return setMsg('转账数量必须 > 0');

    // 你可以加一个简单的“余额不足”提示（不是强制，但体验更好）
    const bal = (balance as bigint | undefined) ?? 0n;
    if (bal < amountWei) return setMsg('余额不足');

    try {
      // 调用 ERC20 transfer
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: baseERC20Abi,
        functionName: 'transfer',
        args: [to as `0x${string}`, amountWei],
      });

      setTxHash(hash);
      setMsg('⏳ 已发送转账交易，等待链上确认...');
    } catch (e: any) {
      console.error(e);
      setMsg(`❌ 转账失败：${e?.shortMessage || e?.message || 'unknown error'}`);
    }
  };

  const balanceText = useMemo(() => {
    const b = (balance as bigint | undefined) ?? 0n;
    return formatUnits(b, decimals);
  }, [balance]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white shadow rounded p-6">
        <h1 className="text-2xl font-bold mb-2">Token Wallet (BaseERC20)</h1>
        <p className="text-sm text-gray-600 mb-6">
          用于查看代币余额，并把 Token 转给其他账号（方便购买 NFT）
        </p>

        {!isConnected ? (
          <div className="text-gray-500">
            请先用右上角 <span className="font-mono">&lt;appkit-button /&gt;</span> 连接钱包
          </div>
        ) : (
          <>
            {/* 地址展示 */}
            <div className="mb-4">
              <div className="text-sm text-gray-500">Connected Address</div>
              <div className="font-mono break-all">{address}</div>
            </div>

            {/* 余额展示 */}
            <div className="mb-6">
              <div className="text-sm text-gray-500">Balance</div>
              <div className="text-xl font-semibold">
                {isBalanceLoading ? 'Loading...' : `${balanceText} MTK`}
              </div>
            </div>

            {/* 转账区 */}
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Transfer Token</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Address
                  </label>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border rounded text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    把 MTK 转给对方账号（买家），对方就能用来买 NFT。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (MTK)
                  </label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50"
                    type="number"
                    step="0.0001"
                    className="w-full px-3 py-2 border rounded text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    这里是“人类可读数量”，内部会用 viem 的 parseUnits 按 18 位 decimals 转成链上数值。
                  </p>
                </div>

                <button
                  onClick={onTransfer}
                  disabled={isTxPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
                >
                  {isTxPending ? 'Sending...' : 'Send Token'}
                </button>

                {/* 状态提示 */}
                {msg && (
                  <div className="text-sm text-gray-700">
                    {msg}
                    {txHash && (
                      <div className="mt-1 text-xs text-gray-500 font-mono">
                        tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 小提示 */}
            <div className="mt-6 text-xs text-gray-500">
              小流程：A（卖家）上架 → 把 MTK 转给 B（买家） → B Approve Token → B Buy NFT
            </div>
          </>
        )}
      </div>
    </div>
  );
}
