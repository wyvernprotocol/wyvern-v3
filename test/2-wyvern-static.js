/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernStatic = artifacts.require('WyvernStatic')

contract('WyvernStatic',() => {
  it('is deployed',async () => {
    return await WyvernStatic.deployed();
  })

  it('has the correct atomicizer address',async () => {
    let [atomicizerInstance,staticInstance] = await Promise.all([WyvernAtomicizer.deployed(),WyvernStatic.deployed()])
    assert.equal(await staticInstance.atomicizer(),atomicizerInstance.address,'incorrect atomicizer address')
  })
})
