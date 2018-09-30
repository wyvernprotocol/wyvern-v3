module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 6700000
    },
    coverage: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 0xfffffffffff,
      gasPrice: 0x01
    }
  },
  compilers: {
    solc: {
      version: '0.5.0-nightly.2018.9.26+commit.d72498b3',
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}
