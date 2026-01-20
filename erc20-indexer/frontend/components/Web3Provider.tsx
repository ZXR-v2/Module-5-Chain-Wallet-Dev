'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { sepolia, mainnet } from '@reown/appkit/networks';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { ReactNode, useState, useEffect } from 'react';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

const networks = [mainnet, sepolia];
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

if (typeof window !== 'undefined') {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: networks as [any, ...any[]],
    projectId,
    metadata: {
      name: 'ERC20 Transfer Indexer',
      description: 'View your ERC20 token transfer history',
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
