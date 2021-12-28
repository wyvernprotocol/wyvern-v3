import { run } from "hardhat";
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { WyvernExchange__factory } from '../dist/build/types/factories/WyvernExchange__factory';
import fs from 'fs';

async function main() {
  // await run("compile");

  // const chainId = process.argv.slice(2)[0];
  // if (chainId === undefined) {
  //   throw new Error("chain id is required (1=mainnet, 4=rinkeby, other=local");
  // }
  const path = `${process.cwd()}/.env.prod`;

  await require("dotenv").config({ path });

  const provider = new JsonRpcProvider(process.env.RPC_ENDPOINT);
  const wallet = new Wallet(`0x${process.env.DEPLOY_PRIVATE_KEY}`, provider)
  
  // Island ERC 1155 Deployment
  const WyvernExchange = new WyvernExchange__factory(wallet);
  console.log(`Deploying WyvernExchange from deployment address ${wallet.address}`);
  const wyvernExchange = await WyvernExchange.deploy(1, ['0xa5409ec958C83C3f309868babACA7c86DCB077c1'], '0x');
  console.log(`WyvernExchange deploying to ${wyvernExchange.address}. Awaiting confirmation...`);
  await wyvernExchange.deployed();
  console.log("WyvernExchange contract deployed");

  const addressPath = `${process.cwd()}/4.json`;

  const addressBook = {
    WyvernExchange: wyvernExchange.address,
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
  .catch(error => {
    console.error(error);
    process.exit(1);
  });