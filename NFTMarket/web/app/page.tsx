'use client';

/**
 * 这个页面（/）负责：
 * 1) 判断钱包是否已连接（wagmi 的 useAccount）
 * 2) 上架 NFT：先 approve NFT -> 再调用 NFTMarket.list()
 * 3) 展示市场挂单：读取 NFTMarket.listingCounter + getListing
 * 4) 购买 NFT：
 *    - 普通买法：ERC20 approve -> NFTMarket.buyNFT(listingId)
 *    - 回调买法（可加分）：BaseERC20.transferWithCallback(market, price, abi.encode(listingId))
 *
 * 你可以把它理解为：一个“最小可交作业版本”的 NFT 市场前端。
 */

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount, // 读当前钱包地址、是否连接
  useChainId, // 读当前链（sepolia = 11155111）
  usePublicClient, // 只读 RPC 客户端（读合约/读区块）
  useWriteContract, // 发交易（写合约）
  useWaitForTransactionReceipt, // 等交易上链确认
} from 'wagmi';

import {
  parseUnits, // 把 "100" 转成链上 uint256（按 decimals）
  formatUnits, // 把链上 uint256 转成人类可读字符串
  encodeAbiParameters, // 用 ABI 编码参数（用于 callback 购买）
} from 'viem';

// 你的 ABI（json）
// 注意：import 的路径要和你的项目 alias @/ 对应；你给的信息是 web/contracts/*.json
import type { Abi } from 'viem';
import NFTMarketABI from '@/contracts/NFTMarket.json';
import BaseERC20ABI from '@/contracts/BaseERC20.json';

const nftMarketAbi = NFTMarketABI as Abi;
const baseERC20Abi = BaseERC20ABI as Abi;

// 地址配置：根据 chainId 自动取地址
import { getContractAddress, isValidAddress } from '@/lib/contracts';

/**
 * 仅用于 approve NFT 的最小 ERC721 ABI：
 * - approve(to, tokenId)
 * - setApprovalForAll(operator, approved)（可选，这里先不用也行）
 *
 * 我们只需要 approve，所以 ABI 写最小即可。
 */
const ERC721_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

// 前端展示用的 Listing 类型（来自 NFTMarket.sol 的 Listing struct）
type Listing = {
  listingId: bigint;
  seller: `0x${string}`;
  nftContract: `0x${string}`;
  tokenId: bigint;
  price: bigint;
  active: boolean;
};

export default function NFTMarketPage() {
  /**
   * wagmi：useAccount() 会从 WagmiProvider 的上下文中读取当前连接的钱包信息
   * - address：当前钱包地址
   * - isConnected：是否已连接
   */
  const { address, isConnected } = useAccount();

  /**
   * 当前链 id（例如 Sepolia = 11155111）
   * 这个非常重要：我们用它去拿合约地址（避免写死地址）
   */
  const chainId = useChainId();

  /**
   * publicClient：只读客户端，适合 readContract / getLogs / getBlockNumber
   * 不需要签名，也不会弹钱包
   */
  const publicClient = usePublicClient();

  /**
   * writeContractAsync：写合约（发交易）
   * - 会弹钱包确认
   * - 返回交易 hash
   */
  const { writeContractAsync } = useWriteContract();

  /**
   * 从 contracts.ts 获取当前网络的合约地址
   * 只要你切换到 sepolia，这里就会取到 sepolia 对应的地址
   */
  const marketAddress = useMemo(() => {
    try {
      return getContractAddress(chainId, 'NFTMarket') as `0x${string}`;
    } catch {
      return undefined;
    }
  }, [chainId]);

  const tokenAddress = useMemo(() => {
    try {
      return getContractAddress(chainId, 'BaseERC20') as `0x${string}`;
    } catch {
      return undefined;
    }
  }, [chainId]);

  const simpleNFTAddress = useMemo(() => {
    try {
      return getContractAddress(chainId, 'SimpleNFT');
    } catch {
      return '';
    }
  }, [chainId]);

  // ------------------------------
  // 1) 表单状态（React useState）
  // ------------------------------

  /**
   * React 的 useState：用于保存输入框的内容（可理解为“变量”，但改变它会触发页面刷新渲染）
   */
  const [nftAddress, setNftAddress] = useState<string>(''); // NFT 合约地址（默认可填 SimpleNFT）
  const [tokenId, setTokenId] = useState<string>(''); // tokenId（输入框用 string，最后再 BigInt）
  const [price, setPrice] = useState<string>(''); // 人类可读价格，比如 "100"

  // 页面提示信息（成功/错误）
  const [msg, setMsg] = useState<string>('');

  // ------------------------------
  // 2) 市场挂单列表状态
  // ------------------------------
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  // ------------------------------
  // 3) 交易状态：保存最近一次交易 hash
  // ------------------------------
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  /**
   * useWaitForTransactionReceipt：
   * 传入 tx hash 后，它会帮你轮询链上，直到交易被打包确认
   * - isLoading：交易确认中
   * - isSuccess：交易确认成功
   */
  const { isLoading: isPendingTx, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({
      hash: txHash,
      query: { enabled: !!txHash },
    });

  /**
   * decimals（18）：
   * OpenZeppelin ERC20 默认 decimals = 18（除非你重写）
   * 你的 BaseERC20 继承 ERC20，没有改 decimals，所以我们按 18 处理
   */
  const priceWei = useMemo(() => {
    if (!price) return 0n;
    try {
      return parseUnits(price, 18); // "100" -> 100 * 10^18
    } catch {
      return 0n;
    }
  }, [price]);

  // ------------------------------
  // 4) 页面初始化：默认填入 SimpleNFT 地址
  // ------------------------------
  useEffect(() => {
    // 如果当前 nftAddress 为空，就默认填 SimpleNFT 的地址（更方便你测试）
    if (!nftAddress && simpleNFTAddress) setNftAddress(simpleNFTAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simpleNFTAddress]);

  // ------------------------------
  // 5) 读取市场挂单：listingCounter + getListing
  // ------------------------------

  /**
   * refreshListings 会：
   * 1) 读取 listingCounter（有多少个 listing）
   * 2) 循环调用 getListing(i)
   * 3) 过滤 active==true 的挂单
   * 4) setListings -> 触发页面重新渲染
   */
  const refreshListings = async () => {
    if (!publicClient || !marketAddress) return;

    setIsLoadingListings(true);
    setMsg('');

    try {
      // 读 listingCounter（链上 uint256 -> JS bigint）
      const counter = (await publicClient.readContract({
        address: marketAddress,
        abi: nftMarketAbi,
        functionName: 'listingCounter',
      })) as bigint;

      const items: Listing[] = [];

      for (let i = 0n; i < counter; i++) {
        const l = (await publicClient.readContract({
          address: marketAddress,
          abi: nftMarketAbi,
          functionName: 'getListing',
          args: [i],
        })) as {
          seller: string;
          nftContract: string;
          tokenId: bigint;
          price: bigint;
          active: boolean;
        };

        items.push({
          listingId: i,
          seller: l.seller as `0x${string}`,
          nftContract: l.nftContract as `0x${string}`,
          tokenId: l.tokenId,
          price: l.price,
          active: l.active,
        });
      }

      // 只保留 active 的，并把最新的放前面（reverse）
      setListings(items.filter((x) => x.active).reverse());
    } catch (e: any) {
      console.error(e);
      setMsg(`读取挂单失败：${e?.shortMessage || e?.message || 'unknown error'}`);
    } finally {
      setIsLoadingListings(false);
    }
  };

  // publicClient ready 后自动刷新一次
  useEffect(() => {
    if (publicClient && marketAddress) refreshListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, marketAddress]);

  // 交易成功后刷新挂单
  useEffect(() => {
    if (isTxSuccess) {
      refreshListings();
      setTxHash(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTxSuccess]);

  // ------------------------------
  // 6) 上架流程：Approve NFT -> List
  // ------------------------------

  /**
   * approveNFT：
   * 你 NFTMarket.list() 里要求：
   *  - nft.getApproved(tokenId) == market 或 isApprovedForAll
   * 所以卖家需要先对 NFT 做 approve。
   */
  const approveNFT = async () => {
    if (!marketAddress) return setMsg('当前网络不支持或 marketAddress 未配置');
    if (!nftAddress || !isValidAddress(nftAddress)) return setMsg('NFT 合约地址不合法');
    if (!tokenId) return setMsg('请填写 tokenId');

    setMsg('');

    try {
      const hash = await writeContractAsync({
        address: nftAddress as `0x${string}`,
        abi: ERC721_ABI,
        functionName: 'approve',
        args: [marketAddress, BigInt(tokenId)],
      });

      setTxHash(hash);
      setMsg('已发送 Approve NFT 交易，等待链上确认...');
    } catch (e: any) {
      console.error(e);
      setMsg(`Approve 失败：${e?.shortMessage || e?.message || 'unknown error'}`);
    }
  };

  /**
   * listNFT：
   * 调用 NFTMarket.list(nftContract, tokenId, price)
   * 注意：price 必须是链上单位 uint256（这里我们用 parseUnits(price, 18)）
   */
  const listNFT = async () => {
    if (!marketAddress) return setMsg('当前网络不支持或 marketAddress 未配置');
    if (!nftAddress || !isValidAddress(nftAddress)) return setMsg('NFT 合约地址不合法');
    if (!tokenId) return setMsg('请填写 tokenId');
    if (!price || priceWei <= 0n) return setMsg('请填写 price（>0）');

    setMsg('');

    try {
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: nftMarketAbi,
        functionName: 'list',
        args: [nftAddress as `0x${string}`, BigInt(tokenId), priceWei],
      });

      setTxHash(hash);
      setMsg('已发送 List 交易，等待链上确认...');
    } catch (e: any) {
      console.error(e);
      setMsg(`上架失败：${e?.shortMessage || e?.message || 'unknown error'}`);
    }
  };

  // ------------------------------
  // 7) 购买流程：Approve Token -> buyNFT
  // ------------------------------

  /**
   * approveToken：
   * NFTMarket.buyNFT 会从 buyer transferFrom(price) 到 seller
   * 所以买家必须先 approve market 可以花我的 token
   */
  const approveToken = async (amount: bigint) => {
    if (!tokenAddress || !marketAddress) return setMsg('tokenAddress/marketAddress 未配置');

    setMsg('');

    try {
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: baseERC20Abi,
        functionName: 'approve',
        args: [marketAddress, amount],
      });

      setTxHash(hash);
      setMsg('已发送 Approve Token 交易，等待链上确认...');
    } catch (e: any) {
      console.error(e);
      setMsg(`Approve Token 失败：${e?.shortMessage || e?.message || 'unknown error'}`);
    }
  };

  /**
   * buyNFT：
   * 最常见买法：market.buyNFT(listingId)
   */
  const buyNFT = async (listingId: bigint) => {
    if (!marketAddress) return setMsg('marketAddress 未配置');

    setMsg('');

    try {
      const hash = await writeContractAsync({
        address: marketAddress,
        abi: nftMarketAbi,
        functionName: 'buyNFT',
        args: [listingId],
      });

      setTxHash(hash);
      setMsg('已发送 Buy 交易，等待链上确认...');
    } catch (e: any) {
      console.error(e);
      setMsg(`购买失败：${e?.shortMessage || e?.message || 'unknown error'}`);
    }
  };

  /**
   * buyViaCallback：
   * 你的 BaseERC20 支持 transferWithCallback：
   * transferWithCallback(market, amount, abi.encode(listingId))
   * market.tokensReceived 会被自动调用并完成购买
   * （这是题干提到 callback 购买的加分项）
   */
  const buyViaCallback = async (listingId: bigint, amount: bigint) => {
    if (!tokenAddress || !marketAddress) return setMsg('tokenAddress/marketAddress 未配置');

    setMsg('');

    try {
      // abi.encode(listingId) 对应 bytes32（你的 tokensReceived 里要求 data.length == 32）
      const data = encodeAbiParameters([{ type: 'uint256' }], [listingId]);

      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: baseERC20Abi,
        functionName: 'transferWithCallback',
        args: [marketAddress, amount, data],
      });

      setTxHash(hash);
      setMsg('已发送 Callback Buy 交易，等待链上确认...');
    } catch (e: any) {
      console.error(e);
      setMsg(`Callback 购买失败：${e?.shortMessage || e?.message || 'unknown error'}`);
    }
  };

  // ------------------------------
  // UI 渲染（JSX）
  // ------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">NFT Market</h1>
          <p className="text-gray-600">
            Trade NFTs using ERC20 tokens (Sepolia). Current address: {address || 'Not connected'}
          </p>
          {chainId !== 11155111 && (
            <p className="mt-2 text-sm text-red-600">
              当前不是 Sepolia（11155111），请在钱包里切换到 Sepolia
            </p>
          )}
        </div>

        {/* 消息提示区 */}
        {msg && (
          <div className="mb-6 rounded-lg border bg-white p-4 text-sm text-gray-700">
            {msg}
            {txHash && (
              <div className="mt-2 text-xs text-gray-500">
                tx: {txHash.slice(0, 10)}... {isPendingTx ? '(pending...)' : ''}
              </div>
            )}
          </div>
        )}

        {/* 未连接钱包：提示用户点右上角 appkit-button */}
        {!isConnected ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-700 mb-4">Please connect your wallet</p>
            <p className="text-sm text-gray-500">
              Click the "Connect Wallet" button in the top right corner
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ========== 上架区 ========== */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">List NFT</h2>

              <div className="space-y-4">
                {/* NFT 合约地址 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NFT Contract Address
                  </label>
                  <input
                    type="text"
                    value={nftAddress}
                    onChange={(e) => setNftAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    提示：这里默认填了 SimpleNFT 地址（方便测试）。
                  </p>
                </div>

                {/* tokenId */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Token ID</label>
                  <input
                    type="number"
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>

                {/* 价格 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (Tokens)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    链上用 uint256 存储，我们会按 18 位 decimals 转换（parseUnits）。
                  </p>
                </div>

                {/* 两步按钮：Approve -> List */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={approveNFT}
                    disabled={isPendingTx}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50"
                  >
                    1) Approve NFT
                  </button>
                  <button
                    onClick={listNFT}
                    disabled={isPendingTx}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50"
                  >
                    2) List NFT
                  </button>
                </div>
              </div>
            </div>

            {/* ========== 市场挂单区 ========== */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Available NFTs</h2>
                <button
                  onClick={refreshListings}
                  className="text-sm px-3 py-2 rounded border bg-white hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>

              {isLoadingListings ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : listings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No NFTs listed yet</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((l) => {
                    const isSeller =
                      address && l.seller.toLowerCase() === address.toLowerCase();

                    return (
                      <div
                        key={l.listingId.toString()}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400">
                            TokenId #{l.tokenId.toString()}
                          </span>
                        </div>

                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Listing #{l.listingId.toString()}
                          </h3>

                          <p className="text-gray-600 text-sm">
                            NFT: {l.nftContract.slice(0, 6)}...{l.nftContract.slice(-4)}
                          </p>
                          <p className="text-gray-600 text-sm mb-3">
                            Seller: {l.seller.slice(0, 6)}...{l.seller.slice(-4)}
                          </p>

                          <p className="text-gray-900 font-medium mb-4">
                            Price: {formatUnits(l.price, 18)} MTK
                          </p>

                          {isSeller ? (
                            <div className="text-xs text-orange-600">
                              这是你自己的挂单（合约禁止自己买）
                            </div>
                          ) : (
                            <>
                              {/* 买家普通流程：approve token -> buy */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => approveToken(l.price)}
                                  disabled={isPendingTx}
                                  className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2 px-3 rounded-lg disabled:opacity-50"
                                >
                                  Approve Token
                                </button>

                                <button
                                  onClick={() => buyNFT(l.listingId)}
                                  disabled={isPendingTx}
                                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg disabled:opacity-50"
                                >
                                  Buy NFT
                                </button>
                              </div>

                              {/* 加分项：callback 买 */}
                              <button
                                onClick={() => buyViaCallback(l.listingId, l.price)}
                                disabled={isPendingTx}
                                className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-lg disabled:opacity-50"
                              >
                                Buy via Callback
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ========== 我的挂单（可选展示） ========== */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">My Listings</h2>

              {listings.filter((l) => address && l.seller.toLowerCase() === address.toLowerCase())
                .length === 0 ? (
                <div className="text-center py-6 text-gray-500">You have no active listings</div>
              ) : (
                <div className="space-y-2">
                  {listings
                    .filter((l) => address && l.seller.toLowerCase() === address.toLowerCase())
                    .map((l) => (
                      <div key={`my-${l.listingId}`} className="flex justify-between border rounded p-3">
                        <div className="text-sm">
                          <div>
                            Listing #{l.listingId.toString()} / TokenId {l.tokenId.toString()}
                          </div>
                          <div className="text-gray-500">
                            Price {formatUnits(l.price, 18)} MTK
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4">How It Works</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                <strong>List NFT:</strong> 先对 Market 进行 approve，再调用 market.list(...)
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                <strong>Buy NFT:</strong> 先 approve ERC20，再调用 market.buyNFT(listingId)
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>
                <strong>Callback Purchase:</strong> transferWithCallback(market, price, abi.encode(listingId))
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
