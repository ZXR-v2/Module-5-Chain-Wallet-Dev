import { createWallet } from "./wallet.js";
import { queryBalance } from "./balance.js";
import { transferERC20 } from "./transfer.js";

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "create":
      createWallet();
      break;

    case "balance":
      await queryBalance();
      break;

    case "transfer":
      if (args.length < 2) {
        console.log("用法: node cli.js transfer <to> <amount>");
        return;
      }
      await transferERC20(args[0], args[1]);
      break;

    default:
      console.log(`
可用命令:
  create
  balance
  transfer <to> <amount>
`);
  }
}

main();
