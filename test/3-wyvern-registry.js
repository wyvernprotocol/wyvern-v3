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
        })
      })
  })
})
