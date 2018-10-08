/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernExchange = artifacts.require('WyvernExchange')

const { wrap, hashOrder, hashToSign } = require('./aux.js')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('WyvernExchange', (accounts) => {
  const withExchange = () => {
    return WyvernExchange
      .deployed()
      .then(instance => {
        return wrap(instance)
      })
  }

  it('should be deployed', () => {
    return withExchange()
      .then(() => {})
  })

  it('should correctly hash order', () => {
    return withExchange()
      .then(exchange => {
        const example = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: ZERO_ADDRESS, staticExtradata: '0x', listingTime: '0', expirationTime: '0', salt: '0'}
        return exchange.hashOrder(example).then(hash => {
          assert.equal(hashOrder(example), hash, 'Incorrect order hash')
        })
      })
  })

  it('should correctly hash order to sign', () => {
    return withExchange()
      .then(exchange => {
        const example = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: ZERO_ADDRESS, staticExtradata: '0x', listingTime: '0', expirationTime: '0', salt: '0'}
        return exchange.hashToSign(example).then(hash => {
          assert.equal(hashToSign(example), hash, 'Incorrect order hash')
        })
      })
  })

  it('should validate valid order parameters', () => {
    return withExchange()
      .then(exchange => {
        const example = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: exchange.inst.address, staticExtradata: '0x', listingTime: '0', expirationTime: '1000000000000', salt: '0'}
        return exchange.validateOrderParameters(example).then(valid => {
          assert.equal(true, valid, 'Should have validated')
        })
      })
  })

  it('should not validate order parameters with invalid exchange', () => {
    return withExchange()
      .then(exchange => {
        const example = {exchange: accounts[0], maker: accounts[0], staticTarget: exchange.inst.address, staticExtradata: '0x', listingTime: '0', expirationTime: '1000000000000', salt: '0'}
        return exchange.validateOrderParameters(example).then(valid => {
          assert.equal(false, valid, 'Should not have validated')
        })
      })
  })

  it('should not validate order parameters with invalid staticTarget', () => {
    return withExchange()
      .then(exchange => {
        const example = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: ZERO_ADDRESS, staticExtradata: '0x', listingTime: '0', expirationTime: '1000000000000', salt: '0'}
        return exchange.validateOrderParameters(example).then(valid => {
          assert.equal(false, valid, 'Should not have validated')
        })
      })
  })

  it('should not validate order parameters with listingTime after now', () => {
    return withExchange()
      .then(exchange => {
        const example = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: exchange.inst.address, staticExtradata: '0x', listingTime: '1000000000000', expirationTime: '1000000000000', salt: '0'}
        return exchange.validateOrderParameters(example).then(valid => {
          assert.equal(false, valid, 'Should not have validated')
        })
      })
  })

  it('should not validate order parameters with expirationTime before now', () => {
    return withExchange()
      .then(exchange => {
        const example = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: exchange.inst.address, staticExtradata: '0x', listingTime: '0', expirationTime: '0', salt: '0'}
        return exchange.validateOrderParameters(example).then(valid => {
          assert.equal(false, valid, 'Should not have validated')
        })
      })
  })

  it('should validate valid authorization by signature', () => {
  })

  it('should validate valid authorization by approval', () => {
  })

  it('should validate valid authorization by maker', () => {
  })

  it('should not validate authorization without signature', () => {
  })

  it('should not validate cancelled order', () => {
  })

  it('should allow order cancellation by maker', () => {
  })

  it('should not allow order cancellation by non-maker', () => {
  })
})
