import { run } from "hardhat";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { WyvernRegistry__factory } from "../dist/build/types/factories/WyvernRegistry__factory";
import fs from "fs";

async function main() {
  // await run("compile");

  // const chainId = process.argv.slice(2)[0];
  // if (chainId === undefined) {
  //   throw new Error("chain id is required (1=mainnet, 4=rinkeby, other=local");
  // }
  const path = `${process.cwd()}/.env.dev`;

  await require("dotenv").config({ path });

  const provider = new JsonRpcProvider(process.env.RPC_ENDPOINT);
  const wallet = new Wallet(`${process.env.DEPLOY_PRIVATE_KEY}`, provider);

  // Island ERC 1155 Deployment
  const WyvernRegistry = new WyvernRegistry__factory(wallet);
  console.log(
    `Deploying WyvernRegistry from deployment address ${wallet.address}`
  );
  const wyvernRegistry = await WyvernRegistry.deploy();
  console.log(
    `WyvernRegistry deploying to ${wyvernRegistry.address}. Awaiting confirmation...`
  );
  await wyvernRegistry.deployed();
  console.log("WyvernRegistry contract deployed");

  const addressPath = `${process.cwd()}/4.json`;

  const addressBook = {
    WyvernRegistry: wyvernRegistry.address,
  };

  console.log(addressPath);
  console.log(addressBook);

  // fs.writeFileSync(
  //   addressPath,
  //   JSON.stringify(addressBook, null, 2)
  // );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
