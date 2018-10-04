/* global artifacts:false */

const WyvernRegistry = artifacts.require('./WyvernRegistry.sol')
const WyvernExchange = artifacts.require('./WyvernExchange.sol')
const { setConfig } = require('./config.js')

module.exports = (deployer, network) => {
  return deployer.deploy(WyvernRegistry).then(() => {
    if (network !== 'development') setConfig('deployed.' + network + '.WyvernRegistry', WyvernRegistry.address)
    return WyvernRegistry.deployed().then(registry => {
      return registry.grantInitialAuthentication(WyvernExchange.address)
    })
  })
}
