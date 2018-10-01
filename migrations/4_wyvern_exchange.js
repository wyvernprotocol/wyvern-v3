/* global artifacts:false */

const WyvernExchange = artifacts.require('./WyvernExchange.sol')
const { setConfig } = require('./config.js')

module.exports = (deployer, network) => {
  return deployer.deploy(WyvernExchange).then(() => {
    setConfig('deployed.' + network + '.WyvernExchange', WyvernExchange.address)
  })
}
