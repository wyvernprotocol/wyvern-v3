/* global artifacts:false */

const WyvernRegistry = artifacts.require('./WyvernRegistry.sol')
const WyvernExchange = artifacts.require('./WyvernExchange.sol')
const { setConfig } = require('./config.js')

const chainIds = {
  development: 50,
  coverage: 50,
  rinkeby: 4,
  mumbai: 80001,
  main: 1
}

const personalSignPrefixes = {
  default: "\x19Ethereum Signed Message:\n",
  klaytn: "\x19Klaytn Signed Message:\n",
  baobab: "\x19Klaytn Signed Message:\n"
}

module.exports = async (deployer, network) => {
  const personalSignPrefix = personalSignPrefixes[network] || personalSignPrefixes['default']
  await deployer.deploy(WyvernRegistry)
  await deployer.deploy(WyvernExchange, chainIds[network], [WyvernRegistry.address, '0xa5409ec958C83C3f309868babACA7c86DCB077c1'], Buffer.from(personalSignPrefix,'binary'))
  if (network !== 'development') {
    setConfig('deployed.' + network + '.WyvernRegistry', WyvernRegistry.address)
    setConfig('deployed.' + network + '.WyvernExchange', WyvernExchange.address)
  }
  const registry = await WyvernRegistry.deployed()
  await registry.grantInitialAuthentication(WyvernExchange.address)
}
