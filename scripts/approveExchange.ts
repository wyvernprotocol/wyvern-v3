import { WebSocketProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { WyvernRegistry__factory } from "../dist/build/types/factories/WyvernRegistry__factory";

async function main() {
  const path = `${process.cwd()}/.env`;

  await require("dotenv").config({ path });

  const provider = new WebSocketProvider(process.env.INFURA_WSS, "rinkeby");
  const wallet = new Wallet(`${process.env.DEPLOY_PRIVATE_KEY}`, provider);

  const WyvernRegistry = new WyvernRegistry__factory(wallet);

  const wyvernRegistry = await WyvernRegistry.attach(
    "0xFe8BFFa73Ee810aAAa2596BD2E782F24F10f21E3"
  );

  await wyvernRegistry.startGrantAuthentication(
    "0xAcFBeE08bf226ff243c3e70521cf42a63A1D839E"
  );

  await new Promise((resolve) => setTimeout(resolve, 24000));

  await wyvernRegistry.endGrantAuthentication(
    "0xAcFBeE08bf226ff243c3e70521cf42a63A1D839E"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
