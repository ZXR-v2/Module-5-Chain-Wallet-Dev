import "dotenv/config";
import { sepolia } from "viem/chains";
import BaseERC20ABI from "./contracts/BaseERC20.json" with { type: "json" };

export const CHAIN = sepolia;
export const RPC_URL = process.env.RPC_URL;
export const ERC20_ADDRESS = "0x1F7cA1b9e2dE35d2c08092fd32E28Fb505ee30b6";
export const ERC20_ABI = BaseERC20ABI;
