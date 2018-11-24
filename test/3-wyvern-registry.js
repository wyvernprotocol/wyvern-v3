/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernRegistry = artifacts.require('WyvernRegistry')

contract('WyvernRegistry', (accounts) => {
  it('should be deployed', () => {
    return WyvernRegistry
      .deployed()
      .then(() => {})
  })

  it('should allow proxy registration', () => {
    return WyvernRegistry
      .deployed()
      .then(instance => {
        return instance.registerProxy().then(() => {
          return instance.proxies(accounts[0]).then(addr => {
            assert.equal(addr.length > 0, true)
          })
        })
      })
  })

  it('should allow proxy registration for another user', () => {
    return WyvernRegistry
      .deployed()
      .then(instance => {
        return instance.registerProxyFor(accounts[1]).then(() => {
          return instance.proxies(accounts[1]).then(addr => {
            assert.equal(addr.length > 0, true)
          })
        })
      })
  })
})
