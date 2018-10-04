/* global artifacts:false */

const WyvernRegistry = artifacts.require('./WyvernRegistry.sol')
const { setConfig } = require('./config.js')

module.exports = (deployer, network) => {
  return deployer.deploy(WyvernRegistry).then(() => {
    if (network !== 'development') setConfig('deployed.' + network + '.WyvernRegistry', WyvernRegistry.address)
  })
}
