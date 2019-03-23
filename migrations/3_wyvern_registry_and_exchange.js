/* global artifacts:false */

const WyvernRegistry = artifacts.require('./WyvernRegistry.sol')
const WyvernExchange = artifacts.require('./WyvernExchange.sol')
const { setConfig } = require('./config.js')

const chainIds = {
  development: 50,
  coverage: 50,
  rinkeby: 4,
  main: 1
}

module.exports = (deployer, network) => {
  return deployer.deploy(WyvernRegistry).then(() => {
    if (network !== 'development') setConfig('deployed.' + network + '.WyvernRegistry', WyvernRegistry.address)
    return deployer.deploy(WyvernExchange, chainIds[network], [WyvernRegistry.address]).then(() => {
      if (network !== 'development') setConfig('deployed.' + network + '.WyvernExchange', WyvernExchange.address)
      return WyvernRegistry.deployed().then(registry => {
        return registry.grantInitialAuthentication(WyvernExchange.address)
      })
    })
  })
}
