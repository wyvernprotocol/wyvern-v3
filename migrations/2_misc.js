/* global artifacts:false */

const WyvernAtomicizer = artifacts.require('./WyvernAtomicizer.sol')
const WyvernStatic = artifacts.require('./WyvernStatic.sol')
const { setConfig } = require('./config.js')

module.exports = (deployer, network) => {
  return deployer.deploy(WyvernAtomicizer).then(() => {
    if (network !== 'development') setConfig('deployed.' + network + '.WyvernAtomicizer', WyvernAtomicizer.address)
    return deployer.deploy(WyvernStatic, WyvernAtomicizer.address).then(() => {
      if (network !== 'development') setConfig('deployed.' + network + '.WyvernStatic', WyvernStatic.address)
    })
  })
}
