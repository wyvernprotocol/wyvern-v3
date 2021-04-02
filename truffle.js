require('dotenv').config()

var HDWalletProvider = require('truffle-hdwallet-provider')
var KlaytnHDWalletProvider = require('truffle-hdwallet-provider-klaytn')
var Caver = require('caver-js')

var rinkebyMnemonic = process.env.RINKEBY_MNEMONIC || ''
var mumbaiMnemonic = process.env.MUMBAI_MNEMONIC || ''
var mainnetMnemonic = process.env.MAINNET_MNEMONIC || ''
var klaytnPrivateKey = process.env.KLAYTN_PRIVATE_KEY || ''
var baobabPrivateKey = process.env.BAOBAB_PRIVATE_KEY || ''
var infuraKey = process.env.INFURA_KEY || '';

var kasAccessKeyId = process.env.KAS_ACCESS_KEY_ID || ''
var kasSecretAccessKey = process.env.KAS_SECRET_KEY || ''


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
        return new HDWalletProvider(rinkebyMnemonic, 'https://rinkeby.infura.io/v3/'+infuraKey)
      },
      from: '',
      port: 8545,
      network_id: '4',
      gas: 6700000,
      networkCheckTimeout: 100000,
      gasPrice: 21110000000,
      confirmations: 2
    },
    mumbai: {
      provider: function () {
        return new HDWalletProvider(mumbaiMnemonic, 'https://rpc-mumbai.matic.today')
      },
      from: '',
      network_id: '80001'
    },
    baobab: {
      provider: () => {
        const options = {
          headers: [
            { name: 'Authorization', value: 'Basic ' + Buffer.from(kasAccessKeyId + ':' + kasSecretAccessKey).toString('base64') },
            { name: 'x-chain-id', value: '1001' }
          ],
          keepAlive: false,
        }
        return new KlaytnHDWalletProvider(baobabPrivateKey, new Caver.providers.HttpProvider("https://node-api.klaytnapi.com/v1/klaytn", options))
      },
      from: '',
      network_id: '1001',
      networkCheckTimeout: 10000,
      gas: '8500000',
      gasPrice:'25000000000'
    },
    klaytn: {
      provider: () => {
        const options = {
          headers: [
            { name: 'Authorization', value: 'Basic ' + Buffer.from(kasAccessKeyId + ':' + kasSecretAccessKey).toString('base64') },
            { name: 'x-chain-id', value: '8217' }
          ],
          keepAlive: false,
        }
        return new KlaytnHDWalletProvider(klaytnPrivateKey, new Caver.providers.HttpProvider("https://node-api.klaytnapi.com/v1/klaytn", options))
      },
      from: '',
      network_id: '8217',
      networkCheckTimeout: 10000,
      gas: '8500000',
      gasPrice:'25000000000'
    }
  },
  compilers: {
    solc: {
      version: '0.7.5',
      settings: {
        optimizer: {
          enabled: true,
          runs: 750
        }
      }
    }
  }
}