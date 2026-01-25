# NFTMarket Gas 对比报告

## 测试命令

```bash
# V1 测试
forge test --gas-report --match-path test/NFTMarketV1.t.sol

# V2 测试
forge test --gas-report --match-path test/NFTMarketV2.t.sol
```

---

## V1 Gas Report (NFTMarket.sol)

```
Ran 5 tests for test/NFTMarketV1.t.sol:NFTMarketV1Test
[PASS] testBuyNFT() (gas: 406666)
[PASS] testCancelListing() (gas: 253286)
[PASS] testGetListing() (gas: 240051)
[PASS] testList() (gas: 240005)
[PASS] testTokensReceived() (gas: 357417)
Suite result: ok. 5 passed; 0 failed; 0 skipped; finished in 5.48ms (3.12ms CPU time)

╭--------------------------------------+-----------------+--------+--------+--------+---------╮
| src/NFTMarket.sol:NFTMarket Contract |                 |        |        |        |         |
+=============================================================================================+
| Deployment Cost                      | Deployment Size |        |        |        |         |
|--------------------------------------+-----------------+--------+--------+--------+---------|
| 1687660                              | 7963            |        |        |        |         |
|--------------------------------------+-----------------+--------+--------+--------+---------|
|                                      |                 |        |        |        |         |
|--------------------------------------+-----------------+--------+--------+--------+---------|
| Function Name                        | Min             | Avg    | Median | Max    | # Calls |
|--------------------------------------+-----------------+--------+--------+--------+---------|
| buyNFT                               | 113087          | 113087 | 113087 | 113087 | 1       |
|--------------------------------------+-----------------+--------+--------+--------+---------|
| cancelListing                        | 25484           | 25484  | 25484  | 25484  | 1       |
|--------------------------------------+-----------------+--------+--------+--------+---------|
| getListing                           | 12200           | 12200  | 12200  | 12200  | 5       |
|--------------------------------------+-----------------+--------+--------+--------+---------|
| list                                 | 152028          | 152028 | 152028 | 152028 | 5       |
╰--------------------------------------+-----------------+--------+--------+--------+---------╯
```

---

## V2 Gas Report (NFTMarket_V2.sol)

```
Ran 5 tests for test/NFTMarketV2.t.sol:NFTMarketV2Test
[PASS] testBuyNFT() (gas: 362268)
[PASS] testCancelListing() (gas: 215409)
[PASS] testGetListing() (gas: 192479)
[PASS] testList() (gas: 192433)
[PASS] testTokensReceived() (gas: 311043)
Suite result: ok. 5 passed; 0 failed; 0 skipped; finished in 5.54ms (3.11ms CPU time)

╭-------------------------------------------+-----------------+--------+--------+--------+---------╮
| src/NFTMarket_V2.sol:NFTMarketV2 Contract |                 |        |        |        |         |
+==================================================================================================+
| Deployment Cost                           | Deployment Size |        |        |        |         |
|-------------------------------------------+-----------------+--------+--------+--------+---------|
| 1395166                                   | 6610            |        |        |        |         |
|-------------------------------------------+-----------------+--------+--------+--------+---------|
|                                           |                 |        |        |        |         |
|-------------------------------------------+-----------------+--------+--------+--------+---------|
| Function Name                             | Min             | Avg    | Median | Max    | # Calls |
|-------------------------------------------+-----------------+--------+--------+--------+---------|
| buyNFT                                    | 111467          | 111467 | 111467 | 111467 | 1       |
|-------------------------------------------+-----------------+--------+--------+--------+---------|
| cancelListing                             | 30385           | 30385  | 30385  | 30385  | 1       |
|-------------------------------------------+-----------------+--------+--------+--------+---------|
| getListing                                | 8359            | 8359   | 8359   | 8359   | 5       |
|-------------------------------------------+-----------------+--------+--------+--------+---------|
| list                                      | 108285          | 108285 | 108285 | 108285 | 5       |
╰-------------------------------------------+-----------------+--------+--------+--------+---------╯
```

---

## Gas 对比总结

| 指标 | V1 | V2 | 差异 | 节省比例 |
|------|-----|-----|------|----------|
| **部署成本** | 1,687,660 | 1,395,166 | -292,494 | **-17.3%** ✅ |
| **合约大小** | 7,963 bytes | 6,610 bytes | -1,353 | **-17.0%** ✅ |
| `list()` | 152,028 | 108,285 | -43,743 | **-28.8%** ✅ |
| `buyNFT()` | 113,087 | 111,467 | -1,620 | **-1.4%** ✅ |
| `getListing()` | 12,200 | 8,359 | -3,841 | **-31.5%** ✅ |
| `cancelListing()` | 25,484 | 30,385 | +4,901 | **+19.2%** ❌ |

---

## V2 优化技术

### 1. 存储槽打包 (Storage Packing)

**V1 Listing 结构（5 个槽）：**
```solidity
struct Listing {
    address seller;      // slot 0: 20 bytes
    address nftContract; // slot 1: 20 bytes
    uint256 tokenId;     // slot 2: 32 bytes
    uint256 price;       // slot 3: 32 bytes
    bool active;         // slot 4: 1 byte (浪费 31 bytes)
}
```

**V2 Listing 结构（3 个槽）：**
```solidity
struct Listing {
    address seller;      // slot 0: 20 bytes
    uint96 price;        // slot 0: 12 bytes (与 seller 打包)
    address nftContract; // slot 1: 20 bytes
    bool active;         // slot 1: 1 byte (与 nftContract 打包)
    uint256 tokenId;     // slot 2: 32 bytes
}
```

**节省**：每次 `list()` 减少 2 个 SSTORE 操作

### 2. Immutable 变量

```solidity
// V1: 普通状态变量
IERC20 public paymentToken;

// V2: immutable (编译时内联到字节码)
IERC20 public immutable paymentToken;
```

**节省**：每次读取从 ~2100/100 gas 降至 ~3 gas

### 3. 自定义错误 (Custom Errors)

```solidity
// V1: require 字符串
require(_paymentToken != address(0), "Invalid token address");

// V2: 自定义错误
error InvalidTokenAddress();
if (_paymentToken == address(0)) revert InvalidTokenAddress();
```

**节省**：
- 部署时：减少合约字节码大小
- 回退时：约 200+ gas

### 4. Unchecked 递增

```solidity
// V1
uint256 listingId = listingCounter++;

// V2
listingId = listingCounter;
unchecked {
    listingCounter = listingId + 1;
}
```

**节省**：约 60-80 gas（跳过溢出检查）

### 5. 存储变量缓存

```solidity
// V2: 多次读取的存储变量缓存到内存
address seller = listing.seller;
uint256 price = listing.price;
address nftContract = listing.nftContract;
uint256 tokenId = listing.tokenId;
```

**节省**：每次额外 SLOAD 约 100 gas（热读取）

---

## cancelListing Gas 增加分析

### 问题

`cancelListing` 在 V2 中反而增加了 4,901 gas (+19.2%)，这是存储槽打包的**副作用**。

### 原因分析

**V1 行为**：`active` 独占 slot 4
- 设置 `active = false` 时，整个槽从非零变为零
- 触发 **gas 退款**（EIP-3529）
- 写入操作相对简单

**V2 行为**：`active` 与 `nftContract` 打包在 slot 1
- 设置 `active = false` 需要：
  1. **SLOAD**：读取整个 slot 1（包含 nftContract + active）
  2. **位操作**：只修改 `active` 那 1 byte，保留 nftContract
  3. **SSTORE**：写回整个 slot（仍然非零，因为 nftContract 还在）
- **无 gas 退款**（槽仍然包含非零数据）
- 读-改-写操作比直接写入更昂贵

### 权衡

虽然 `cancelListing` 成本增加，但：
- `list()` 节省了 **43,743 gas** (-28.8%)
- 部署成本节省了 **292,494 gas** (-17.3%)
- 整体优化效果依然显著

### 可选优化

如果业务场景中 `cancelListing` 调用频率远高于 `list()`，可以考虑将 `active` 单独放在一个槽：

```solidity
struct Listing {
    address seller;
    uint96 price;
    address nftContract;
    uint256 tokenId;
    bool active;         // 独占 slot 3
}
```

这样会增加 `list()` 成本（4 槽写入）但降低 `cancelListing` 成本。

---

## 结论

V2 优化版本在绝大多数场景下都能节省 gas：

- ✅ **上架 NFT** (`list`): 节省 28.8%
- ✅ **查询上架信息** (`getListing`): 节省 31.5%
- ✅ **购买 NFT** (`buyNFT`): 节省 1.4%
- ✅ **部署合约**: 节省 17.3%
- ❌ **取消上架** (`cancelListing`): 增加 19.2%

由于 `list()` 和 `getListing()` 通常是最频繁的操作，V2 的优化策略是合理的。
