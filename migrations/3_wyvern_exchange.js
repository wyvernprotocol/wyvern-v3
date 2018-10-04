/* global artifacts:false */

const WyvernExchange = artifacts.require('./WyvernExchange.sol')
const { setConfig } = require('./config.js')

module.exports = (deployer, network) => {
  return deployer.deploy(WyvernExchange).then(() => {
    if (network !== 'development') setConfig('deployed.' + network + '.WyvernExchange', WyvernExchange.address)
  })
}
