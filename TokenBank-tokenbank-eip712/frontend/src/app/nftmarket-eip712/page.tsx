'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { SIMPLE_NFT_ABI, NFT_MARKET_PERMIT_ABI, TOKEN_PERMIT_ABI } from '@/constants/abis';
import { CONTRACTS_PERMIT } from '@/constants/addresses';

const EXPLORER_URL = 'https://sepolia.etherscan.io/tx/';

type AddressType = `0x${string}`;

interface Listing {
  seller: string;
  nftContract: string;
  tokenId: bigint;
  price: bigint;
  active: boolean;
}

export default function NFTMarketEIP712() {
  const { address, isConnected, chain } = useAccount();
  const [mintURI, setMintURI] = useState('');
  const [listTokenId, setListTokenId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [buyListingId, setBuyListingId] = useState('');
  const [cancelListingId, setCancelListingId] = useState('');
  const [approveAmount, setApproveAmount] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [signedSignature, setSignedSignature] = useState<{
    v: number;
    r: `0x${string}`;
    s: `0x${string}`;
    listingId: number;
    deadline: number;
    buyerAddress: string;
  } | null>(null);
  const [permitSignature, setPermitSignature] = useState<{
    listingId: number;
    deadline: number;
    buyerAddress: string;
  } | null>(null);

  // Read market owner (project owner who can sign permits)
  const { data: marketOwner } = useReadContract({
    address: CONTRACTS_PERMIT.NFTMarketPermit as AddressType,
    abi: NFT_MARKET_PERMIT_ABI,
    functionName: 'owner',
    args: [],
  });

  // Read listing counter
  const { data: listingCounter, refetch: refetchListingCounter } = useReadContract({
    address: CONTRACTS_PERMIT.NFTMarketPermit as AddressType,
    abi: NFT_MARKET_PERMIT_ABI,
    functionName: 'listingCounter',
    args: [],
  });

  // Read user's NFT balance
  const { data: nftBalance, refetch: refetchNFTBalance } = useReadContract({
    address: CONTRACTS_PERMIT.SimpleNFT as AddressType,
    abi: SIMPLE_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read token balance
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: CONTRACTS_PERMIT.MyTokenPermit as AddressType,
    abi: TOKEN_PERMIT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read token symbol
  const { data: tokenSymbol } = useReadContract({
    address: CONTRACTS_PERMIT.MyTokenPermit as AddressType,
    abi: TOKEN_PERMIT_ABI,
    functionName: 'symbol',
    args: [],
  });

  // Read market approval for all
  const { data: isApprovedForAll, refetch: refetchApproval } = useReadContract({
    address: CONTRACTS_PERMIT.SimpleNFT as AddressType,
    abi: SIMPLE_NFT_ABI,
    functionName: 'isApprovedForAll',
    args: address && CONTRACTS_PERMIT.NFTMarketPermit ? [address, CONTRACTS_PERMIT.NFTMarketPermit as AddressType] : undefined,
  });

  // Read allowance for payment token
  const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
    address: CONTRACTS_PERMIT.MyTokenPermit as AddressType,
    abi: TOKEN_PERMIT_ABI,
    functionName: 'allowance',
    args: address && CONTRACTS_PERMIT.NFTMarketPermit ? [address, CONTRACTS_PERMIT.NFTMarketPermit as AddressType] : undefined,
  });

  // Check if user is market owner (can sign permits)
  const isUserOwner = address && marketOwner && address.toLowerCase() === (marketOwner as string).toLowerCase();

  // Mint NFT transaction
  const { writeContract: mintNFT, data: mintHash, isPending: isMinting } = useWriteContract();
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  // Approve NFT transaction
  const { writeContract: approveNFT, data: approveNFTHash, isPending: isApprovingNFT } = useWriteContract();
  const { isLoading: isApproveNFTConfirming, isSuccess: isApproveNFTSuccess } = useWaitForTransactionReceipt({ hash: approveNFTHash });

  // Approve token for payment transaction
  const { writeContract: approveToken, data: approveTokenHash, isPending: isApprovingToken } = useWriteContract();
  const { isLoading: isApproveTokenConfirming, isSuccess: isApproveTokenSuccess } = useWaitForTransactionReceipt({ hash: approveTokenHash });

  // List NFT transaction
  const { writeContract: listNFT, data: listHash, isPending: isListing } = useWriteContract();
  const { isLoading: isListConfirming, isSuccess: isListSuccess } = useWaitForTransactionReceipt({ hash: listHash });

  // Permit buy transaction
  const { writeContract: permitBuy, data: permitBuyHash, isPending: isPermitBuying } = useWriteContract();
  const { isLoading: isPermitBuyConfirming, isSuccess: isPermitBuySuccess } = useWaitForTransactionReceipt({ hash: permitBuyHash });

  // Cancel listing transaction
  const { writeContract: cancelListing, data: cancelHash, isPending: isCancelling } = useWriteContract();
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

  // Sign typed data for permit buy
  const { signTypedData, data: signature, isPending: isSigning } = useSignTypedData();

  // Refetch data when transactions succeed
  useEffect(() => {
    if (isMintSuccess) {
      refetchNFTBalance();
      setMintURI('');
    }
  }, [isMintSuccess, refetchNFTBalance]);

  useEffect(() => {
    if (isApproveNFTSuccess) {
      refetchApproval();
    }
  }, [isApproveNFTSuccess, refetchApproval]);

  useEffect(() => {
    if (isApproveTokenSuccess) {
      refetchTokenAllowance();
    }
  }, [isApproveTokenSuccess, refetchTokenAllowance]);

  useEffect(() => {
    if (isListSuccess || isPermitBuySuccess || isCancelSuccess) {
      refetchListingCounter();
      refetchNFTBalance();
      refetchTokenBalance();
      refetchTokenAllowance();
      setListTokenId('');
      setListPrice('');
      setBuyListingId('');
      setCancelListingId('');
      setBuyerAddress('');
      setPermitSignature(null);
      // Clear signed signature after successful purchase
      if (isPermitBuySuccess) {
        setSignedSignature(null);
      }
    }
  }, [isListSuccess, isPermitBuySuccess, isCancelSuccess, refetchListingCounter, refetchNFTBalance, refetchTokenBalance, refetchTokenAllowance]);

  // When signature is received, store it for display/sharing
  useEffect(() => {
    if (signature && permitSignature) {
      const { listingId, deadline, buyerAddress: targetBuyer } = permitSignature;

      // Extract v, r, s from signature
      const sig = signature.slice(2); // Remove 0x
      const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
      const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
      const v = parseInt(sig.slice(128, 130), 16);

      // Store signature for display/sharing
      setSignedSignature({
        v,
        r,
        s,
        listingId,
        deadline,
        buyerAddress: targetBuyer,
      });

      // Clear permit signature state
      setPermitSignature(null);
    }
  }, [signature, permitSignature]);

  // Fetch all listings
  const [allListings, setAllListings] = useState<Listing[]>([]);
  useEffect(() => {
    const fetchListings = async () => {
      if (!listingCounter || typeof listingCounter !== 'bigint') return;

      const listings: Listing[] = [];
      const count = Number(listingCounter);

      for (let i = 0; i < count; i++) {
        try {
          // We'll need to query each listing
          // For now, we'll just store the count
        } catch (error) {
          console.error(`Error fetching listing ${i}:`, error);
        }
      }

      setAllListings(listings);
    };

    if (listingCounter) {
      fetchListings();
    }
  }, [listingCounter]);

  const handleMintNFT = () => {
    if (!mintURI || !address) return;
    mintNFT({
      address: CONTRACTS_PERMIT.SimpleNFT as AddressType,
      abi: SIMPLE_NFT_ABI,
      functionName: 'mint',
      args: [address, mintURI],
    });
  };

  const handleApproveNFT = () => {
    if (!address) return;
    approveNFT({
      address: CONTRACTS_PERMIT.SimpleNFT as AddressType,
      abi: SIMPLE_NFT_ABI,
      functionName: 'setApprovalForAll',
      args: [CONTRACTS_PERMIT.NFTMarketPermit as AddressType, true],
    });
  };

  const handleApproveToken = () => {
    if (!approveAmount) return;
    approveToken({
      address: CONTRACTS_PERMIT.MyTokenPermit as AddressType,
      abi: TOKEN_PERMIT_ABI,
      functionName: 'approve',
      args: [CONTRACTS_PERMIT.NFTMarketPermit as AddressType, parseEther(approveAmount)],
    });
  };

  const handleListNFT = () => {
    if (!listTokenId || !listPrice) return;
    listNFT({
      address: CONTRACTS_PERMIT.NFTMarketPermit as AddressType,
      abi: NFT_MARKET_PERMIT_ABI,
      functionName: 'list',
      args: [CONTRACTS_PERMIT.SimpleNFT as AddressType, BigInt(listTokenId), parseEther(listPrice)],
    });
  };

  // Sign permit for a buyer (owner function)
  const handleSignPermit = async () => {
    if (!buyListingId || !address || !chain || !isUserOwner) {
      alert('Only the market owner can sign permit purchases. If you are the owner, please ensure you are connected with the owner address.');
      return;
    }

    // Buyer address is required
    const targetBuyer = buyerAddress.trim();
    
    if (!targetBuyer) {
      alert('Please enter a buyer address');
      return;
    }
    
    if (!targetBuyer.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid buyer address');
      return;
    }

    const listingId = parseInt(buyListingId);
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Store for later use
    setPermitSignature({
      listingId,
      deadline,
      buyerAddress: targetBuyer,
    });

    // EIP-712 Whitelist type data
    const domain = {
      name: 'NFTMarket',
      version: '1',
      chainId: chain.id,
      verifyingContract: CONTRACTS_PERMIT.NFTMarketPermit as AddressType,
    };

    const types = {
      Whitelist: [
        { name: 'user', type: 'address' },
        { name: 'listingId', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      user: targetBuyer as `0x${string}`,
      listingId: BigInt(listingId),
      deadline: BigInt(deadline),
    };

    signTypedData({
      domain,
      types,
      primaryType: 'Whitelist',
      message,
    });
  };

  // Use stored signature to buy (for buyer)
  const handleBuyWithSignature = () => {
    if (!signedSignature || !address) return;

    // Verify the signature is for the current user
    if (signedSignature.buyerAddress.toLowerCase() !== address.toLowerCase()) {
      alert(`This signature is for address ${signedSignature.buyerAddress}, but you are ${address}. Please connect with the correct wallet.`);
      return;
    }

    permitBuy({
      address: CONTRACTS_PERMIT.NFTMarketPermit as AddressType,
      abi: NFT_MARKET_PERMIT_ABI,
      functionName: 'permitBuy',
      args: [
        BigInt(signedSignature.listingId),
        BigInt(signedSignature.deadline),
        signedSignature.v,
        signedSignature.r,
        signedSignature.s,
      ],
    });
  };

  const handleCancelListing = () => {
    if (!cancelListingId) return;
    cancelListing({
      address: CONTRACTS_PERMIT.NFTMarketPermit as AddressType,
      abi: NFT_MARKET_PERMIT_ABI,
      functionName: 'cancelListing',
      args: [BigInt(cancelListingId)],
    });
  };

  // Read a specific listing
  const ListingDisplay = ({ listingId }: { listingId: number }) => {
    const { data: listing } = useReadContract({
      address: CONTRACTS_PERMIT.NFTMarketPermit as AddressType,
      abi: NFT_MARKET_PERMIT_ABI,
      functionName: 'getListing',
      args: [BigInt(listingId)],
    });

    if (!listing || !(listing as Listing).active) return null;

    const listingData = listing as Listing;

    return (
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Listing #{listingId}</h4>
            <p className="text-sm text-gray-600 mt-1">
              NFT: {listingData.nftContract.slice(0, 6)}...{listingData.nftContract.slice(-4)} #{listingData.tokenId.toString()}
            </p>
            <p className="text-sm text-gray-600">
              Price: {formatEther(listingData.price)} {tokenSymbol || 'MTKP'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Seller: {listingData.seller.slice(0, 6)}...{listingData.seller.slice(-4)}
            </p>
          </div>
          {listingData.seller.toLowerCase() === address?.toLowerCase() && (
            <button
              onClick={() => {
                cancelListing({
                  address: CONTRACTS_PERMIT.NFTMarketPermit as AddressType,
                  abi: NFT_MARKET_PERMIT_ABI,
                  functionName: 'cancelListing',
                  args: [BigInt(listingId)],
                });
              }}
              disabled={isCancelling || isCancelConfirming}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded disabled:bg-gray-300"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">NFT Market (EIP-712)</h1>
        <p className="text-gray-600">Please connect your wallet to continue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">NFT Market (EIP-712)</h1>
        <p className="text-gray-600">Whitelist-based NFT marketplace with EIP-712 signatures</p>
      </div>

      {/* Owner Notice */}
      {isUserOwner && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>You are the market owner!</strong> You can sign permit purchases for whitelisted users.
          </p>
        </div>
      )}

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">NFT Balance</h3>
          <p className="text-2xl font-semibold text-gray-900">
            {nftBalance ? nftBalance.toString() : '0'} NFTs
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-sm text-gray-500 mb-1">Token Balance</h3>
          <p className="text-2xl font-semibold text-gray-900">
            {tokenBalance ? formatEther(tokenBalance as bigint) : '0'} {tokenSymbol || 'MTKP'}
          </p>
        </div>
      </div>

      {/* Transaction Status */}
      {(mintHash || approveNFTHash || approveTokenHash || listHash || permitBuyHash || cancelHash) && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Recent Transactions</h3>
          <div className="space-y-2">
            {mintHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  Mint NFT: {isMintConfirming ? 'Confirming...' : isMintSuccess ? 'Success' : 'Pending'}
                </span>
                <a href={`${EXPLORER_URL}${mintHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  View on Etherscan
                </a>
              </div>
            )}
            {approveNFTHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  Approve NFT: {isApproveNFTConfirming ? 'Confirming...' : isApproveNFTSuccess ? 'Success' : 'Pending'}
                </span>
                <a href={`${EXPLORER_URL}${approveNFTHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  View on Etherscan
                </a>
              </div>
            )}
            {listHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  List NFT: {isListConfirming ? 'Confirming...' : isListSuccess ? 'Success' : 'Pending'}
                </span>
                <a href={`${EXPLORER_URL}${listHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  View on Etherscan
                </a>
              </div>
            )}
            {permitBuyHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  Permit Buy: {isPermitBuyConfirming ? 'Confirming...' : isPermitBuySuccess ? 'Success' : 'Pending'}
                </span>
                <a href={`${EXPLORER_URL}${permitBuyHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  View on Etherscan
                </a>
              </div>
            )}
            {cancelHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  Cancel Listing: {isCancelConfirming ? 'Confirming...' : isCancelSuccess ? 'Success' : 'Pending'}
                </span>
                <a href={`${EXPLORER_URL}${cancelHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                  View on Etherscan
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mint NFT Section */}
      {isUserOwner && (
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Mint NFT (Owner Only)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Token URI</label>
              <input
                type="text"
                value={mintURI}
                onChange={(e) => setMintURI(e.target.value)}
                placeholder="ipfs://..."
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
              />
            </div>
            <button
              onClick={handleMintNFT}
              disabled={isMinting || isMintConfirming || !mintURI}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
            >
              {isMinting || isMintConfirming ? 'Minting...' : 'Mint NFT'}
            </button>
          </div>
        </div>
      )}

      {/* List NFT Section */}
      <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">List NFT for Sale</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Token ID</label>
            <input
              type="number"
              value={listTokenId}
              onChange={(e) => setListTokenId(e.target.value)}
              placeholder="Enter NFT token ID"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Price ({tokenSymbol || 'MTKP'})</label>
            <input
              type="number"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="Enter price"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
            />
          </div>
          <div className="text-sm text-gray-600">
            NFT Approved for Market: {isApprovedForAll ? 'Yes' : 'No'}
          </div>
          {!isApprovedForAll && (
            <button
              onClick={handleApproveNFT}
              disabled={isApprovingNFT || isApproveNFTConfirming}
              className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
            >
              {isApprovingNFT || isApproveNFTConfirming ? 'Approving...' : 'Approve NFT Market'}
            </button>
          )}
          {isApprovedForAll && (
            <button
              onClick={handleListNFT}
              disabled={isListing || isListConfirming || !listTokenId || !listPrice}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
            >
              {isListing || isListConfirming ? 'Listing...' : 'List NFT'}
            </button>
          )}
        </div>
      </div>

      {/* Approve Payment Token Section */}
      <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Approve Payment Token</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount to Approve ({tokenSymbol || 'MTKP'})</label>
            <input
              type="number"
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
            />
          </div>
          <div className="text-sm text-gray-600">
            Current Allowance: {tokenAllowance ? formatEther(tokenAllowance as bigint) : '0'} {tokenSymbol || 'MTKP'}
          </div>
          <button
            onClick={handleApproveToken}
            disabled={isApprovingToken || isApproveTokenConfirming || !approveAmount}
            className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
          >
            {isApprovingToken || isApproveTokenConfirming ? 'Approving...' : 'Approve Payment Token'}
          </button>
        </div>
      </div>

      {/* Owner: Sign Permit Section */}
      {isUserOwner && (
        <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-300 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Sign Permit for Buyer (Owner Only)</h2>
              <p className="text-sm text-gray-600 mt-1">Create EIP-712 whitelist signature for buyers</p>
            </div>
            <span className="px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full">Owner</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Listing ID</label>
              <input
                type="number"
                value={buyListingId}
                onChange={(e) => setBuyListingId(e.target.value)}
                placeholder="Enter listing ID"
                className="w-full px-4 py-2 bg-white border border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Buyer Address *</label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 bg-white border border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900"
              />
            </div>
            <button
              onClick={handleSignPermit}
              disabled={isSigning || !buyListingId || !buyerAddress.trim()}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
            >
              {isSigning ? 'Signing...' : 'Sign Permit'}
            </button>
            {signedSignature && (
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-2">Signature Generated!</h4>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <strong>Buyer:</strong> {signedSignature.buyerAddress}
                  </div>
                  <div>
                    <strong>Listing ID:</strong> {signedSignature.listingId}
                  </div>
                  <div>
                    <strong>Deadline:</strong> {new Date(signedSignature.deadline * 1000).toLocaleString()}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <strong>Signature (v, r, s):</strong>
                    <div className="mt-1 space-y-1">
                      <div>v: {signedSignature.v}</div>
                      <div>r: {signedSignature.r}</div>
                      <div>s: {signedSignature.s}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const signatureData = JSON.stringify({
                        v: signedSignature.v,
                        r: signedSignature.r,
                        s: signedSignature.s,
                        listingId: signedSignature.listingId,
                        deadline: signedSignature.deadline,
                        buyerAddress: signedSignature.buyerAddress,
                      }, null, 2);
                      navigator.clipboard.writeText(signatureData);
                      alert('Signature copied to clipboard!');
                    }}
                    className="mt-2 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs"
                  >
                    Copy Signature JSON
                  </button>
                </div>
              </div>
            )}
            <div className="text-xs text-gray-600 bg-white p-3 rounded border border-purple-200">
              <strong>How it works:</strong> As the market owner, you sign an off-chain message (EIP-712) that whitelists a buyer address for a specific listing.
              After signing, share the signature with the buyer so they can use it to purchase the NFT.
            </div>
          </div>
        </div>
      )}

      {/* Buyer: Use Signature Section */}
      {signedSignature && signedSignature.buyerAddress.toLowerCase() === address?.toLowerCase() && (
        <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border-2 border-green-300 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Buy with Permit Signature</h2>
              <p className="text-sm text-gray-600 mt-1">Use the signed permit to purchase the NFT</p>
            </div>
            <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">EIP-712</span>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border border-green-200">
              <p className="text-sm text-gray-700 mb-2">
                You have a valid permit signature for Listing #{signedSignature.listingId}
              </p>
              <p className="text-xs text-gray-500">
                Deadline: {new Date(signedSignature.deadline * 1000).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleBuyWithSignature}
              disabled={isPermitBuying || isPermitBuyConfirming}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
            >
              {isPermitBuying || isPermitBuyConfirming ? 'Processing...' : 'Buy NFT with Permit'}
            </button>
            <div className="text-xs text-gray-600 bg-white p-3 rounded border border-green-200">
              <strong>Note:</strong> Make sure you have approved enough payment tokens to the market contract before buying!
            </div>
          </div>
        </div>
      )}

      {/* Non-owner notice */}
      {!isUserOwner && (
        <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Buyer Instructions</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>To purchase an NFT with permit:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Contact the market owner to get a whitelist signature for the listing you want to buy</li>
              <li>The owner will provide you with a signature (v, r, s values)</li>
              <li>Paste the signature data here or ask the owner to use this page to sign for your address</li>
              <li>Make sure you have approved payment tokens to the market contract</li>
              <li>Click "Buy NFT with Permit" to complete the purchase</li>
            </ol>
          </div>
        </div>
      )}

      {/* Active Listings */}
      {listingCounter && Number(listingCounter) > 0 && (
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Active Listings</h2>
          <div className="space-y-3">
            {Array.from({ length: Number(listingCounter) }, (_, i) => (
              <ListingDisplay key={i} listingId={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
