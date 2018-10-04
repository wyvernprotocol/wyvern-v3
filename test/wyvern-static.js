/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernStatic = artifacts.require('WyvernStatic')

contract('WyvernStatic', (accounts) => {
  it('should be deployed', () => {
    return WyvernStatic
      .deployed()
      .then(staticInstance => {
      })
  })

  it('should have correct atomicizer address', () => {
    return WyvernAtomicizer
      .deployed()
      .then(atomicizerInstance => {
        return WyvernStatic
          .deployed()
          .then(staticInstance => {
            return staticInstance.atomicizer()
              .then(address => {
                assert.equal(address, WyvernAtomicizer.address, 'incorrect atomicizer address')
              })
          })
      })
  })
})
