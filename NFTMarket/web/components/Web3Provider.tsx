'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { optimism, mainnet, sepolia } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { ReactNode, useState, useEffect } from 'react';

// 1. 基础配置
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// 2. 创建适配器 (在顶层创建是安全的，因为它不依赖 window)
const networks = [mainnet, optimism, sepolia];
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// 3. 仅在客户端初始化 AppKit
if (typeof window !== 'undefined') {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: networks as [any, ...any[]],
    projectId,
    metadata: {
      name: 'NFT Market',
      description: 'NFT Marketplace',
      url: window.location.origin, 
      icons: ['https://avatars.githubusercontent.com/u/177283275'],
    },
    features: {
      analytics: true,
    },
  });
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);

  // 确保组件挂载后再渲染，防止 Hydration 错误
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}