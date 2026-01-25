# NFTMarket V2 Gas Report

## 运行命令

```bash
forge test --gas-report --match-path test/NFTMarketV2.t.sol
```

## 测试结果

```
Ran 5 tests for test/NFTMarketV2.t.sol:NFTMarketV2Test
[PASS] testBuyNFT() (gas: 362268)
[PASS] testCancelListing() (gas: 215409)
[PASS] testGetListing() (gas: 192479)
[PASS] testList() (gas: 192433)
[PASS] testTokensReceived() (gas: 311043)
Suite result: ok. 5 passed; 0 failed; 0 skipped
```

## Gas Report

### NFTMarketV2 Contract

| 指标 | 值 |
|------|-----|
| Deployment Cost | 1,395,166 |
| Deployment Size | 6,610 bytes |

| Function | Min | Avg | Median | Max | # Calls |
|----------|-----|-----|--------|-----|---------|
| `list` | 108,285 | 108,285 | 108,285 | 108,285 | 5 |
| `buyNFT` | 111,467 | 111,467 | 111,467 | 111,467 | 1 |
| `cancelListing` | 30,385 | 30,385 | 30,385 | 30,385 | 1 |
| `getListing` | 8,359 | 8,359 | 8,359 | 8,359 | 5 |

### BaseERC20 Contract

| Function | Min | Avg | Median | Max | # Calls |
|----------|-----|-----|--------|-----|---------|
| `approve` | 46,963 | 46,963 | 46,963 | 46,963 | 1 |
| `balanceOf` | 2,917 | 2,917 | 2,917 | 2,917 | 2 |
| `transfer` | 51,929 | 51,929 | 51,929 | 51,929 | 5 |
| `transferWithCallback` | 122,684 | 122,684 | 122,684 | 122,684 | 1 |

### SimpleNFT Contract

| Function | Min | Avg | Median | Max | # Calls |
|----------|-----|-----|--------|-----|---------|
| `mint` | 115,017 | 115,017 | 115,017 | 115,017 | 5 |
| `ownerOf` | 3,049 | 3,049 | 3,049 | 3,049 | 7 |
| `isApprovedForAll` | 3,264 | 3,264 | 3,264 | 3,264 | 5 |
| `setApprovalForAll` | 46,696 | 46,696 | 46,696 | 46,696 | 5 |
