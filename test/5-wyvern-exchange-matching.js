/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC721 = artifacts.require('TestERC721')

const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const { wrap, ZERO_BYTES32, randomUint } = require('./aux.js')

contract('WyvernExchange', (accounts) => {
  const withContracts = () => {
    return WyvernExchange
      .deployed()
      .then(exchange => {
        exchange = wrap(exchange)
        return WyvernStatic
          .deployed()
          .then(statici => {
            return WyvernRegistry
              .deployed()
              .then(registry => {
                return TestERC20
                  .deployed()
                  .then(erc20 => {
                    return TestERC721
                      .deployed()
                      .then(erc721 => {
                        return WyvernAtomicizer
                          .deployed()
                          .then(atomicizer => {
                            return { atomicizer, exchange, statici, registry, erc20, erc721 }
                          })
                      })
                  })
              })
          })
      })
  }

  const withSomeTokens = () => {
    return withContracts().then(({erc20, erc721}) => {
      const amount = randomUint()
      return erc20.mint(accounts[0], amount).then(() => {
        const a = randomUint()
        return erc721.mint(accounts[0], a).then(() => {
          const b = randomUint()
          return erc721.mint(accounts[0], b).then(() => {
            const c = randomUint()
            return erc721.mint(accounts[0], c).then(() => {
              return {tokens: amount, nfts: [a, b, c]}
            })
          })
        })
      })
    })
  }

  it('should allow proxy registration', () => {
    return withContracts().then(({registry, erc20, erc721}) => {
      return registry.registerProxy().then(() => {
        return registry.proxies(accounts[0]).then(proxy => {
          return erc20.approve(proxy, 100000).then(() => {
            return erc721.setApprovalForAll(proxy, true)
          })
        })
      })
    })
  })

  it('should match any-any nop order', () => {
    return withContracts()
      .then(({exchange, statici}) => {
        const extradata = web3.eth.abi.encodeFunctionSignature('any(address[5],uint8[2],uint256[4],bytes,bytes)')
        const one = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: statici.address, staticExtradata: extradata, maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
        const two = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: statici.address, staticExtradata: extradata, maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '1'}
        const sig = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
        const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        return exchange.atomicMatch(one, sig, call, two, sig, call, ZERO_BYTES32).then(() => {
        })
      })
  })

  it('should match nft-nft order', () => {
    return withContracts()
      .then(({atomicizer, exchange, statici, erc20, erc721}) => {
        return withSomeTokens()
          .then(({tokens, nfts}) => {
            const atomicizerc = new web3.eth.Contract(atomicizer.abi, atomicizer.address)
            const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
            const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
            const extradata = web3.eth.abi.encodeFunctionSignature('any(address[5],uint8[2],uint256[4],bytes,bytes)')
            const one = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: statici.address, staticExtradata: extradata, maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
            const two = {exchange: exchange.inst.address, maker: accounts[0], staticTarget: statici.address, staticExtradata: extradata, maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '1'}
            const sig = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
            const firstERC20Call = erc20c.methods.transferFrom(accounts[0], accounts[1], 2).encodeABI()
            const firstERC721Call = erc721c.methods.transferFrom(accounts[0], accounts[1], nfts[0]).encodeABI()
            const firstData = atomicizerc.methods.atomicize(
              [erc20.address, erc721.address],
              [0, 0],
              [(firstERC20Call.length - 2) / 2, (firstERC721Call.length - 2) / 2],
              firstERC20Call + firstERC721Call.slice(2)
            ).encodeABI()
            const secondERC20Call = erc20c.methods.transferFrom(accounts[0], accounts[2], 2).encodeABI()
            const secondERC721Call = erc721c.methods.transferFrom(accounts[0], accounts[2], nfts[1]).encodeABI()
            const secondData = atomicizerc.methods.atomicize(
              [erc721.address, erc20.address],
              [0, 0],
              [(secondERC721Call.length - 2) / 2, (secondERC20Call.length - 2) / 2],
              secondERC721Call + secondERC20Call.slice(2)
            ).encodeABI()
            const firstCall = {target: atomicizer.address, howToCall: 1, data: firstData}
            const secondCall = {target: atomicizer.address, howToCall: 1, data: secondData}
            return exchange.atomicMatch(one, sig, firstCall, two, sig, secondCall, ZERO_BYTES32).then(() => {
              return erc20.balanceOf(accounts[1]).then(balance => {
                assert.equal(2, balance, 'Incorrect balance')
              })
            })
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
