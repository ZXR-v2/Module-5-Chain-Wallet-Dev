# NFTMarket V1 Gas Report

## 运行命令

```bash
forge test --gas-report --match-path test/NFTMarketV1.t.sol
```

## 测试结果

```
Ran 5 tests for test/NFTMarketV1.t.sol:NFTMarketV1Test
[PASS] testBuyNFT() (gas: 406666)
[PASS] testCancelListing() (gas: 253286)
[PASS] testGetListing() (gas: 240051)
[PASS] testList() (gas: 240005)
[PASS] testTokensReceived() (gas: 357417)
Suite result: ok. 5 passed; 0 failed; 0 skipped
```

## Gas Report

### NFTMarket Contract

| 指标 | 值 |
|------|-----|
| Deployment Cost | 1,687,660 |
| Deployment Size | 7,963 bytes |

| Function | Min | Avg | Median | Max | # Calls |
|----------|-----|-----|--------|-----|---------|
| `list` | 152,028 | 152,028 | 152,028 | 152,028 | 5 |
| `buyNFT` | 113,087 | 113,087 | 113,087 | 113,087 | 1 |
| `cancelListing` | 25,484 | 25,484 | 25,484 | 25,484 | 1 |
| `getListing` | 12,200 | 12,200 | 12,200 | 12,200 | 5 |

### BaseERC20 Contract

| Function | Min | Avg | Median | Max | # Calls |
|----------|-----|-----|--------|-----|---------|
| `approve` | 46,963 | 46,963 | 46,963 | 46,963 | 1 |
| `balanceOf` | 2,917 | 2,917 | 2,917 | 2,917 | 2 |
| `transfer` | 51,929 | 51,929 | 51,929 | 51,929 | 5 |
| `transferWithCallback` | 125,306 | 125,306 | 125,306 | 125,306 | 1 |

### SimpleNFT Contract

| Function | Min | Avg | Median | Max | # Calls |
|----------|-----|-----|--------|-----|---------|
| `mint` | 115,017 | 115,017 | 115,017 | 115,017 | 5 |
| `ownerOf` | 3,049 | 3,049 | 3,049 | 3,049 | 7 |
| `isApprovedForAll` | 3,264 | 3,264 | 3,264 | 3,264 | 5 |
| `setApprovalForAll` | 46,696 | 46,696 | 46,696 | 46,696 | 5 |
