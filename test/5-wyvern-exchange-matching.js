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

const { wrap, hashOrder, ZERO_BYTES32, randomUint } = require('./aux.js')

const nullSig = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}

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

  // Returns an array of two NFTs, one to give and one to get
  const withAsymmetricalTokens = () => {
    return withContracts().then(({erc20, erc721}) => {
      return erc721.mint(accounts[0], 4).then(() => {
        return erc721.mint(accounts[6], 5).then(() => {
          return { nfts: [4, 5], erc721 }
        })
      })
    })
  }

  const withSomeTokens = () => {
    return withContracts().then(({erc20, erc721}) => {
      const amount = randomUint()
      return erc20.mint(accounts[0], amount).then(() => {
        return {tokens: amount, nfts: [1, 2, 3], erc20, erc721}
      })
    })
  }

  it('should allow proxy transfer approval', () => {
    return withContracts().then(({ registry, erc20, erc721 }) => {
      return registry.registerProxy({from: accounts[0]}).then(() => {
        return registry.proxies(accounts[0]).then(proxy => {
          return erc20.approve(proxy, 100000).then(() => {
            return erc721.setApprovalForAll(proxy, true)
          })
        })
      })
    })
  })

  it('should allow proxy registration', () => {
    return withContracts().then(({registry, erc20, erc721}) => {
      return registry.registerProxy({from: accounts[6]}).then(() => {
        return registry.proxies(accounts[6]).then(proxy => {
          assert.equal(true, proxy.length > 0, 'no proxy address')
          // Also approve erc20 and erc721
          return erc20.approve(proxy, 100000, {from: accounts[6]}).then(() => {
            return erc721.setApprovalForAll(proxy, true, {from: accounts[6]})
          })
        })
      })
    })
  })

  it('should match any-any nop order', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
        const two = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '1'}
        const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        return exchange.atomicMatch(one, nullSig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
        })
      })
  })

  it('should match any-any nop order twice with no fill', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('anyNoFill(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        return exchange.atomicMatch(one, nullSig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
          return exchange.atomicMatch(one, nullSig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
          })
        })
      })
  })

  it('should match exactly twice with two-fill', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('anyAddOne(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '2', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '2', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
              return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
                return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
                  assert.equal(true, false, 'should not have succeeded')
                }).catch(err => {
                  assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
                })
              })
            })
          })
        })
      })
  })

  it('should not self-match', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
        const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        return exchange.atomicMatch(one, nullSig, call, one, nullSig, call, ZERO_BYTES32).then(() => {
          assert.equal(true, false, 'should not have succeeded')
        }).catch(err => {
          assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
        })
      })
  })

  it('should not match any-any reentrant order', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '4'}
        const two = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '5'}
        const exchangec = new web3.eth.Contract(exchange.inst.abi, exchange.inst.address)
        const call1 = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        const data = exchangec.methods.atomicMatch_(
          [one.maker, one.staticTarget, one.maximumFill, one.listingTime, one.expirationTime, one.salt, call1.target,
            two.maker, two.staticTarget, two.maximumFill, two.listingTime, two.expirationTime, two.salt, call1.target],
          [one.staticSelector, two.staticSelector],
          one.staticExtradata, call1.data, two.staticExtradata, call1.data,
          [nullSig.v, call1.howToCall, nullSig.v, call1.howToCall],
          [nullSig.r, nullSig.s, nullSig.r, nullSig.s, ZERO_BYTES32]).encodeABI()
        const call2 = {target: exchange.inst.address, howToCall: 0, data: data}
        return exchange.atomicMatch(one, nullSig, call1, two, nullSig, call2, ZERO_BYTES32).then(() => {
          assert.equal(true, false, 'should not have succeeded')
        }).catch(err => {
          assert.include(err.message, 'Returned error: VM Exception while processing transaction: invalid opcode', 'Incorrect error')
        })
      })
  })

  it('should match nft-nft swap order', () => {
    return withContracts()
      .then(({atomicizer, exchange, registry, statici }) => {
        return withAsymmetricalTokens()
          .then(({ nfts, erc721 }) => {
            const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
            const selector = web3.eth.abi.encodeFunctionSignature('swapOneForOne(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
            const paramsOne = web3.eth.abi.encodeParameters(
              ['address[2]', 'uint256[2]'],
              [[erc721.address, erc721.address], [nfts[0], nfts[1]]]
            )
            const paramsTwo = web3.eth.abi.encodeParameters(
              ['address[2]', 'uint256[2]'],
              [[erc721.address, erc721.address], [nfts[1], nfts[0]]]
            )

            const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: paramsOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '2'}
            const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: paramsTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3'}

            const firstData = erc721c.methods.transferFrom(accounts[0], accounts[6], nfts[0]).encodeABI()
            const secondData = erc721c.methods.transferFrom(accounts[6], accounts[0], nfts[1]).encodeABI()

            const firstCall = {target: erc721.address, howToCall: 0, data: firstData}
            const secondCall = {target: erc721.address, howToCall: 0, data: secondData}
            const sigOne = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
            return exchange.sign(two, accounts[6]).then(sigTwo => {
              return exchange.atomicMatch(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32).then(() => {
                return erc721.ownerOf(nfts[0]).then(owner => {
                  assert.equal(owner, accounts[6], 'Incorrect owner')
                })
              })
            })
          })
      })
  })

  it('should match two nft + erc20 orders', () => {
    return withContracts()
      .then(({atomicizer, exchange, registry, statici, erc20, erc721}) => {
        return withSomeTokens()
          .then(({tokens, nfts}) => {
            const atomicizerc = new web3.eth.Contract(atomicizer.abi, atomicizer.address)
            const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
            const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
            const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
            const one = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '2'}
            const two = {maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3'}
            const sig = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
            const firstERC20Call = erc20c.methods.transferFrom(accounts[0], accounts[6], 2).encodeABI()
            const firstERC721Call = erc721c.methods.transferFrom(accounts[0], accounts[6], nfts[0]).encodeABI()
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
              return erc20.balanceOf(accounts[6]).then(balance => {
                assert.equal(2, balance, 'Incorrect balance')
              })
            })
          })
      })
  })

  it('should match with signatures', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
            })
          })
        })
      })
  })

  it('should match with approvals', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.approveOrder(one, false, {from: accounts[6]}).then(() => {
          return exchange.approveOrder(two, false, {from: accounts[6]}).then(() => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatch(one, nullSig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
            })
          })
        })
      })
  })

  it('should not match with invalid first order auth', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[6]).then(sig => {
          const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
          return exchange.atomicMatch(one, nullSig, call, two, sig, call, ZERO_BYTES32).then(() => {
            assert.equal(true, false, 'should not have matched')
          }).catch(err => {
            assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
          })
        })
      })
  })

  it('should not match with invalid second order auth', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(two, accounts[6]).then(sig => {
          const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
          return exchange.atomicMatch(one, sig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
            assert.equal(true, false, 'should not have matched')
          }).catch(err => {
            assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
          })
        })
      })
  })

  it('should not match with invalid first order params', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.inst.setOrderFill_(hashOrder(one), '10', {from: accounts[6]}).then(() => {
          return exchange.sign(one, accounts[6]).then(oneSig => {
            return exchange.sign(two, accounts[6]).then(twoSig => {
              const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
              return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
                assert.equal(true, false, 'should not have matched')
              }).catch(err => {
                assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
              })
            })
          })
        })
      })
  })

  it('should not match with invalid second order params', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.inst.setOrderFill_(hashOrder(two), '3', {from: accounts[6]}).then(() => {
          return exchange.sign(one, accounts[6]).then(oneSig => {
            return exchange.sign(two, accounts[6]).then(twoSig => {
              const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
              return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
                assert.equal(true, false, 'should not have matched')
              }).catch(err => {
                assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
              })
            })
          })
        })
      })
  })

  it('should not match with nonexistent first proxy', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[7], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[7]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
              assert.equal(true, false, 'should not have matched')
            }).catch(err => {
              assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
            })
          })
        })
      })
  })

  it('should not match with nonexistent second proxy', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[7], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[7]).then(twoSig => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
              assert.equal(true, false, 'should not have matched')
            }).catch(err => {
              assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
            })
          })
        })
      })
  })

  it('should not match with nonexistent target', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            const call = {target: accounts[7], howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
              assert.equal(true, false, 'should not have matched')
            }).catch(err => {
              assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
            })
          })
        })
      })
  })

  it('should allow value transfer', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[5],uint8[2],uint256[6],bytes,bytes)')
        const one = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatchWith(one, oneSig, call, two, twoSig, call, ZERO_BYTES32, {value: 200}).then(() => {
            })
          })
        })
      })
  })
})
