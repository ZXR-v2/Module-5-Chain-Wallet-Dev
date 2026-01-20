'use client';

import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { getTransfers, getTransferStats, type Transfer } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const { address, isConnected } = useAccount();

  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ['transfers', address],
    queryFn: () => getTransfers(address!, { page: 1, limit: 50 }),
    enabled: !!address && isConnected,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', address],
    queryFn: () => getTransferStats(address!),
    enabled: !!address && isConnected,
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            ERC20 转账记录查询
          </h1>
          <p className="text-gray-600 mb-6">
            请连接钱包以查看您的 ERC20 Token 转账记录
          </p>
          <w3m-button />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              ERC20 转账记录
            </h1>
            <w3m-button />
          </div>
          {address && (
            <p className="text-sm text-gray-600 font-mono break-all">
              地址: {address}
            </p>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                发送统计
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">转账次数:</span>
                  <span className="font-bold text-gray-800">
                    {stats.sent.count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总金额:</span>
                  <span className="font-bold text-red-600">
                    {stats.sent.total.toFixed(4)} tokens
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                接收统计
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">转账次数:</span>
                  <span className="font-bold text-gray-800">
                    {stats.received.count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总金额:</span>
                  <span className="font-bold text-green-600">
                    {stats.received.total.toFixed(4)} tokens
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transfers List */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            转账记录
          </h2>

          {transfersLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          ) : transfersData && transfersData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                      类型
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                      地址
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                      金额
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                      区块号
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                      时间
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                      交易哈希
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transfersData.data.map((transfer: Transfer) => {
                    const isSent = transfer.from_address.toLowerCase() === address?.toLowerCase();
                    const otherAddress = isSent
                      ? transfer.to_address
                      : transfer.from_address;

                    return (
                      <tr
                        key={transfer.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              isSent
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {isSent ? '发送' : '接收'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm text-gray-700">
                            {otherAddress.slice(0, 6)}...{otherAddress.slice(-4)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`font-bold ${
                              isSent ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {isSent ? '-' : '+'}
                            {transfer.value_decimal.toFixed(4)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          #{transfer.block_number}
                        </td>
                        <td className="py-4 px-4 text-gray-600 text-sm">
                          {formatDistanceToNow(
                            new Date(transfer.block_timestamp * 1000),
                            {
                              addSuffix: true,
                            }
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${transfer.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-mono text-sm underline"
                          >
                            {transfer.transaction_hash.slice(0, 10)}...
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">暂无转账记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
