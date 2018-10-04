/* global artifacts:false */

const Migrations = artifacts.require('./Migrations.sol')
const { setConfig } = require('./config.js')

module.exports = (deployer, network) => {
  return deployer.deploy(Migrations).then(() => {
    if (network !== 'development') setConfig('deployed.' + network + '.Migrations', Migrations.address)
  })
}
