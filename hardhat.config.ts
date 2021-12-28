import * as dotenv from 'dotenv';
dotenv.config();

import { HardhatUserConfig } from 'hardhat/types';

// Plugins

import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-abi-exporter';
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';
import '@tenderly/hardhat-tenderly';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';


const config: HardhatUserConfig = {
  paths: {
    sources: './contracts',
    tests: './test',
    artifacts: './artifacts',
  },
  solidity: {
    compilers: [
      {
        version: '0.7.5',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: 1337,
      loggingEnabled: false,
      gas: "auto",
      gasPrice: 0,
      blockGasLimit: 12000000,
      hardfork: "berlin"
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.RPC_ENDPOINT}`,  // process.env.RPC_ENDPOINT,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.RPC_ENDPOINT}`,
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    showTimeSpent: true,
    currency: 'USD',
    outputFile: 'reports/gas-report.log',
  },
  typechain: {
    outDir: './dist/build/types',
    target: 'ethers-v5',
  },
  abiExporter: {
    path: './dist/build/abis',
    clear: false,
    flat: true,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: true,
  },
};

export default config;