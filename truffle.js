var HDWalletProvider = require('truffle-hdwallet-provider')
var rinkebyMnemonic = ''
var mainnetMnemonic = ''

module.exports = {
  mocha: {
    enableTimeouts: false
  },
  networks: {
    mainnet: {
      provider: function () {
        return new HDWalletProvider(mainnetMnemonic, 'https://mainnet.infura.io')
      },
      from: '',
      port: 8545,
      network_id: '1',
      gasPrice: 4310000000,
      confirmations: 2
    },
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '50',
      gas: 6700000
    },
    coverage: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 0xfffffffffff,
      gasPrice: 0x01
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(rinkebyMnemonic, 'https://rinkeby.infura.io')
      },
      from: '',
      port: 8545,
      network_id: '4',
      gas: 6700000,
      gasPrice: 21110000000,
      confirmations: 2
    }
  },
  compilers: {
    solc: {
      version: '0.5.6',
      settings: {
        optimizer: {
          enabled: true,
          runs: 500
        }
      }
    }
  }
}
