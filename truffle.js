module.exports = {
  mocha: {
    enableTimeouts: false
  },
  networks: {
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
      host: 'localhost',
      from: '0x71a1e902fc6a3001951c1eb29b5e039c2eb70557',
      port: 8545,
      network_id: '4',
      gas: 6700000,
      gasPrice: 4100000000,
      confirmations: 3
    }
  },
  compilers: {
    solc: {
      version: '0.5.1',
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  }
}
