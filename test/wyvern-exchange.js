/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernExchange = artifacts.require('WyvernExchange')

contract('WyvernExchange', (accounts) => {
  it('should be deployed', () => {
    return WyvernExchange
      .deployed()
      .then(exchangeInstance => {
        assert.equal(true, true, '')
      })
  })
})
