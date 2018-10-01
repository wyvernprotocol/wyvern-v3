/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')

contract('WyvernAtomicizer', (accounts) => {
  it('should be deployed', () => {
    return WyvernAtomicizer
      .deployed()
      .then(atomicizerInstance => {
        assert.equal(true, true, '')
      })
  })
})
