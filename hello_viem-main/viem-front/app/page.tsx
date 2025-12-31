'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, createWalletClient, http, formatEther, getContract, custom } from 'viem';
import { foundry } from 'viem/chains';
import Counter_ABI from './contracts/Counter.json';

// Counter 合约地址
const COUNTER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function Home() {
  const [balance, setBalance] = useState<string>('0');
  const [counterNumber, setCounterNumber] = useState<string>('0');
  const [address, setAddress] = useState<string | undefined>();
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState<number | undefined>();

  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(),
  });

  // 连接钱包
  const connectWallet = async () => {
    console.log('connectWallet invoked');

    if (typeof window === 'undefined' || typeof (window as any).ethereum === 'undefined') {
      alert('请安装 MetaMask');
      return;
    }

    const provider = (window as any).ethereum;
    if (typeof provider.request !== 'function') {
      alert('当前环境的以太坊提供器不支持 request 方法');
      console.error('provider without request():', provider);
      return;
    }

    try {
      console.log('requesting accounts from provider...');
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      console.log('accounts response:', accounts);
      const chainId = await provider.request({ method: 'eth_chainId' });

  const connectedAddress = Array.isArray(accounts) ? accounts[0] : accounts;
  setAddress(connectedAddress as string);
      setChainId(Number(chainId));
      setIsConnected(true);

      // 监听账户变化
      provider.on('accountsChanged', (accounts: string[]) => {
        console.log('accountsChanged', accounts);
        if (accounts.length === 0) {
          setIsConnected(false);
          setAddress(undefined);
        } else {
          setAddress(accounts[0] as string);
        }
      });

      // 监听网络变化
      provider.on('chainChanged', (chainId: string) => {
        console.log('chainChanged', chainId);
        setChainId(Number(chainId));
      });
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      alert('连接钱包失败: ' + (error?.message ?? String(error)));
    }
  };

  // 断开连接
  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress(undefined);
    setChainId(undefined);
  };

  // 获取 Counter 合约的数值
  const fetchCounterNumber = async () => {
    if (!address) return;
    
    try {
      // make sure there's actually contract bytecode at the address
      const code = await publicClient.getBytecode({ address: COUNTER_ADDRESS });
      if (!code || code === '0x') {
        console.warn(`No contract bytecode found at ${COUNTER_ADDRESS}. Skipping read.`);
        setCounterNumber('0');
        return;
      }

      const counterContract = getContract({
        address: COUNTER_ADDRESS,
        abi: Counter_ABI,
        client: publicClient,
      });

      const number = (await counterContract.read.number()) as bigint;
      setCounterNumber(number.toString());
    } catch (err) {
      console.error('Failed to read counter.number():', err);
      // keep UI stable
      setCounterNumber('0');
    }
  };

  // 调用 increment 函数
  const handleIncrement = async () => {
    if (!address) return;
    
    // runtime-check: ensure a provider exists before passing to viem
    const provider = (window as any)?.ethereum;
    if (!provider) {
      alert('请安装 MetaMask');
      return;
    }

    const walletClient = createWalletClient({
      chain: foundry,
      // cast to any so TypeScript accepts the runtime-checked provider
      transport: custom(provider as any),
    });

    try {
      const hash = await walletClient.writeContract({
        address: COUNTER_ADDRESS,
        abi: Counter_ABI,
        functionName: 'increment',
        account: address as any,
      });
      console.log('Transaction hash:', hash);
      // 更新数值显示
      fetchCounterNumber();
    } catch (error) {
      console.error('调用 increment 失败:', error);
    }
  };

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;
      
      const balance = await publicClient.getBalance({
        address: address as any,
      });

      setBalance(formatEther(balance));
    };

    if (address) {
      fetchBalance();
      fetchCounterNumber();
    }
  }, [address]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Simple Viem Demo</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="mb-4">
          <a
            href=" "
            className="block w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors text-center"
          >
            前往 SIWE 登录演示
          </a >
        </div>
        
        {!isConnected ? (
          <button
            onClick={connectWallet}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
          >
            连接 MetaMask
          </button>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600">钱包地址:</p >
              <p className="font-mono break-all">{address}</p >
            </div>
            <div className="text-center">
              <p className="text-gray-600">当前网络:</p >
              <p className="font-mono">
                {foundry.name} (Chain ID: {chainId})
              </p >
            </div>
            <div className="text-center">
              <p className="text-gray-600">余额:</p >
              <p className="font-mono">{balance} ETH</p >
            </div>
            <div className="text-center">
              <p className="text-gray-600">Counter 数值:</p >
              <p className="font-mono">{counterNumber}</p >
              <button
                onClick={handleIncrement}
                className="mt-2 w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
              >
                增加计数
              </button>
            </div>
            <button
              onClick={disconnectWallet}
              className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors"
            >
              断开连接
            </button>
          </div>
        )}
      </div>
    </div>
  );
}