/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernRegistry = artifacts.require('WyvernRegistry')

contract('WyvernRegistry', (accounts) => {
  it('should be deployed', () => {
    return WyvernRegistry
      .deployed()
      .then(() => {})
  })

  // register proxies for several accounts
})
