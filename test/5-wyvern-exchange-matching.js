/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')

const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const { wrap, ZERO_BYTES32 } = require('./aux.js')

contract('WyvernExchange', (accounts) => {
  const withContracts = () => {
    return WyvernExchange
      .deployed()
      .then(exchange => {
        exchange = wrap(exchange)
        return WyvernStatic
          .deployed()
          .then(statici => {
            return { exchange, statici }
          })
      })
  }

  it('should match any-any nop order', () => {
    return withContracts()
      .then(({exchange, statici}) => {
        const extradata = web3.eth.abi.encodeFunctionSignature('any(address[5],uint8[2],uint[4],bytes,bytes)')
        const one = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: statici.address, staticExtradata: extradata, listingTime: '0', expirationTime: '100000000000', salt: '0'}
        const two = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: statici.address, staticExtradata: extradata, listingTime: '0', expirationTime: '100000000000', salt: '1'}
        const sig = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
        const call = {target: accounts[0], howToCall: '0', data: '0x'}
        return exchange.atomicMatch(one, sig, call, two, sig, call, ZERO_BYTES32).then(() => {
          assert.equal(true, true, '')
        })
      })
  })

  it('should not match with invalid first order auth', () => {
  })

  it('should not match with invalid second order auth', () => {
  })

  it('should not match with invalid first order params', () => {
  })

  it('should not match with invalid second order params', () => {
  })

  it('should not match with cancelled first order', () => {
  })

  it('should not match with cancelled second order', () => {
  })

  it('should not match with nonexistent first proxy', () => {
  })

  it('should not match with nonexistent second proxy', () => {
  })

  it('should allow value transfer', () => {
  })

  it('should not allow reentrancy', () => {
  })
})
