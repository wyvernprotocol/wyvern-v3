import { run } from "hardhat";
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { StaticMarket__factory } from "../build/types/factories/StaticMarket__factory";
import fs from 'fs';

async function main() {
  await run("compile");

  const chainId = process.argv.slice(2)[0];
  if (chainId === undefined) {
    throw new Error("chain id is required (1=mainnet, 4=rinkeby, other=local");
  }
  const path = `${process.cwd()}/.env${
    chainId === "1"? ".prod" : chainId === "4"? ".dev" : ".local"
  }`;

  await require("dotenv").config({ path });

  const provider = new JsonRpcProvider(process.env.RPC_ENDPOINT);
  const wallet = new Wallet(`0x${process.env.DEPLOY_PRIVATE_KEY}`, provider)
  
  // Island ERC 1155 Deployment
  const StaticMarket = new StaticMarket__factory(wallet);
  console.log(`Deploying StaticMarket from deployment address ${wallet.address}`);
  const staticMarket = await StaticMarket.deploy();
  console.log(`StaticMarket deploying to ${staticMarket.address}. Awaiting confirmation...`);
  await staticMarket.deployed();
  console.log("StaticMarket contract deployed");

  const addressPath = `${process.cwd()}/${chainId}.json`

  const addressBook = {
    StaticMarket: staticMarket.address,
  }

  fs.writeFileSync(
    addressPath,
    JSON.stringify(addressBook, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });