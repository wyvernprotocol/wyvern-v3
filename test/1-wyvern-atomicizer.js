/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')

contract('WyvernAtomicizer',() => {
  it('should be deployed',async () => {
    return await WyvernAtomicizer.deployed()
  })
})
