/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC721 = artifacts.require('TestERC721')
const TestERC1271 = artifacts.require('TestERC1271')

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
                            return TestERC1271
                              .deployed()
                              .then(erc1271 => {
                                return { atomicizer, exchange, statici, registry, erc20, erc721, erc1271 }
                              })
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

  const withAsymmetricalTokens2 = () => {
    return withContracts().then(({erc20, erc721}) => {
      return erc721.mint(accounts[0], 6).then(() => {
        return erc721.mint(accounts[6], 7).then(() => {
          return { nfts: [6, 7], erc721 }
        })
      })
    })
  }

  const withSomeTokens = () => {
    return withContracts().then(({erc20, erc721}) => {
      const amount = randomUint() + 2
      return erc20.mint(accounts[0], amount).then(() => {
        return {tokens: amount, nfts: [1, 2, 3], erc20, erc721}
      })
    })
  }

  const withTokens = () => {
    return withContracts().then(({erc20, erc721}) => {
      const amount = randomUint() + 2
      return erc20.mint(accounts[0], amount).then(() => {
        return erc20.mint(accounts[6], amount).then(() => {
          return { erc20 }
        })
      })
    })
  }

  it('should allow proxy transfer approval', () => {
    return withContracts().then(({ registry, erc20, erc721 }) => {
      return registry.registerProxy({from: accounts[0]}).then(() => {
        return registry.proxies(accounts[0]).then(proxy => {
          assert.equal(true, proxy.length > 0, 'no proxy address')
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
          return erc20.approve(proxy, 100000, {from: accounts[6]}).then(() => {
            return erc721.setApprovalForAll(proxy, true, {from: accounts[6]})
          })
        })
      })
    })
  })

  it('should allow proxy registration, erc1271', () => {
    return withContracts().then(({registry, erc20, erc721, erc1271}) => {
      return registry.registerProxyFor(erc1271.address).then(() => {
        return registry.proxies(erc1271.address).then(proxy => {
          assert.equal(true, proxy.length > 0, 'no proxy address')
        })
      })
    })
  })

  it('should match any-any nop order', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
        const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '1'}
        const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        return exchange.atomicMatch(one, nullSig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
        })
      })
  })

  it('should not match any-any nop order with wrong registry', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '2330'}
        const two = {registry: statici.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '2331'}
        const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        return exchange.atomicMatch(one, nullSig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
          assert.equal(true, false, 'should not have matched')
        }).catch(err => {
          assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
        })
      })
  })

  it('should match any-any nop order, erc 1271', () => {
    return withContracts()
      .then(({exchange, registry, statici, erc1271}) => {
        erc1271.setOwner(accounts[0]).then(() => {
          const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
          const one = {registry: registry.address, maker: erc1271.address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '410'}
          const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '411'}
          const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
          return exchange.sign(one, accounts[0]).then(oneSig => {
            return exchange.atomicMatch(one, oneSig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
            })
          })
        })
      })
  })

  it('should not match any-any nop order with bad sig, erc 1271', () => {
    return withContracts()
      .then(({exchange, registry, statici, erc1271}) => {
        erc1271.setOwner(accounts[0]).then(() => {
          const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
          const one = {registry: registry.address, maker: erc1271.address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '410'}
          const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '411'}
          const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
          return exchange.sign(two, accounts[0]).then(oneSig => {
            return exchange.atomicMatch(one, oneSig, call, two, nullSig, call, ZERO_BYTES32).then(() => {
              assert.equal(true, false, 'should not have matched')
            })
          }).catch(err => {
            assert.include(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
          })
        })
      })
  })

  it('should match any-any nop order twice with no fill', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('anyNoFill(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('anyAddOne(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '2', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '2', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '4'}
        const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '5'}
        const exchangec = new web3.eth.Contract(exchange.inst.abi, exchange.inst.address)
        const call1 = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
        const data = exchangec.methods.atomicMatch_(
          [one.registry, one.maker, one.staticTarget, one.maximumFill, one.listingTime, one.expirationTime, one.salt, call1.target,
            two.registry, two.maker, two.staticTarget, two.maximumFill, two.listingTime, two.expirationTime, two.salt, call1.target],
          [one.staticSelector, two.staticSelector],
          one.staticExtradata, call1.data, two.staticExtradata, call1.data,
          [call1.howToCall, call1.howToCall],
          ZERO_BYTES32,
          web3.eth.abi.encodeParameters(['bytes', 'bytes'], [
            web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [nullSig.v, nullSig.r, nullSig.s]),
            web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [nullSig.v, nullSig.r, nullSig.s])
          ])).encodeABI()
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
      .then(({atomicizer, exchange, registry, statici}) => {
        return withAsymmetricalTokens().then(({ nfts, erc721 }) => {
          const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
          const selector = web3.eth.abi.encodeFunctionSignature('swapOneForOne(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
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

  it('should match nft-nft swap order, abi-decoding instead', () => {
    return withContracts()
      .then(({atomicizer, exchange, registry, statici}) => {
        return withAsymmetricalTokens2()
          .then(({ nfts, erc721 }) => {
            const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
            const selector = web3.eth.abi.encodeFunctionSignature('swapOneForOneDecoding(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            const paramsOne = web3.eth.abi.encodeParameters(
              ['address[2]', 'uint256[2]'],
              [[erc721.address, erc721.address], [nfts[0], nfts[1]]]
            )
            const paramsTwo = web3.eth.abi.encodeParameters(
              ['address[2]', 'uint256[2]'],
              [[erc721.address, erc721.address], [nfts[1], nfts[0]]]
            )

            const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: paramsOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '333123'}
            const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: paramsTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '123344'}

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
            const abi = [{'constant': false, 'inputs': [{'name': 'addrs', 'type': 'address[]'}, {'name': 'values', 'type': 'uint256[]'}, {'name': 'calldataLengths', 'type': 'uint256[]'}, {'name': 'calldatas', 'type': 'bytes'}], 'name': 'atomicize', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}]
            const atomicizerc = new web3.eth.Contract(abi, atomicizer.address)
            const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
            const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
            const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '2'}
            const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3'}
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

  it('should match two nft + erc20 orders, real static call', () => {
    return withContracts()
      .then(({atomicizer, exchange, registry, statici, erc20, erc721}) => {
        return withSomeTokens()
          .then(({tokens, nfts}) => {
            const abi = [{'constant': false, 'inputs': [{'name': 'addrs', 'type': 'address[]'}, {'name': 'values', 'type': 'uint256[]'}, {'name': 'calldataLengths', 'type': 'uint256[]'}, {'name': 'calldatas', 'type': 'bytes'}], 'name': 'atomicize', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}]
            const atomicizerc = new web3.eth.Contract(abi, atomicizer.address)
            const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
            const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
            const selectorOne = web3.eth.abi.encodeFunctionSignature('split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            // const selectorOneA = web3.eth.abi.encodeFunctionSignature('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
            const selectorOneB = web3.eth.abi.encodeFunctionSignature('anySingle(bytes,address[7],uint8,uint256[6],bytes)')
            const firstEDSelector = web3.eth.abi.encodeFunctionSignature('transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)')
            const firstEDParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [erc20.address, '2'])
            const secondEDSelector = web3.eth.abi.encodeFunctionSignature('transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)')
            const secondEDParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [erc721.address, nfts[2]])
            const extradataOneA = web3.eth.abi.encodeParameters(
              ['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
              [[statici.address, statici.address],
                [(firstEDParams.length - 2) / 2, (secondEDParams.length - 2) / 2],
                [firstEDSelector, secondEDSelector],
                firstEDParams + secondEDParams.slice(2)]
            )
            const paramsOneA = web3.eth.abi.encodeParameters(
              ['address[2]', 'bytes4[2]', 'bytes', 'bytes'],
              [[statici.address, statici.address],
                [selectorOneB, selectorOneB],
                extradataOneA, '0x']
            )
            const extradataOne = paramsOneA
            const selectorTwo = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
            const extradataTwo = '0x'
            const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: extradataOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3352'}
            const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: extradataTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3335'}
            const sig = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
            const firstERC20Call = erc20c.methods.transferFrom(accounts[0], accounts[6], 2).encodeABI()
            const firstERC721Call = erc721c.methods.transferFrom(accounts[0], accounts[6], nfts[2]).encodeABI()
            const firstData = atomicizerc.methods.atomicize(
              [erc20.address, erc721.address],
              [0, 0],
              [(firstERC20Call.length - 2) / 2, (firstERC721Call.length - 2) / 2],
              firstERC20Call + firstERC721Call.slice(2)
            ).encodeABI()
            const secondERC721Call = erc721c.methods.transferFrom(accounts[6], accounts[0], nfts[0]).encodeABI()
            const secondData = atomicizerc.methods.atomicize(
              [erc721.address],
              [0],
              [(secondERC721Call.length - 2) / 2],
              secondERC721Call
            ).encodeABI()
            const firstCall = {target: atomicizer.address, howToCall: 1, data: firstData}
            const secondCall = {target: atomicizer.address, howToCall: 1, data: secondData}
            return exchange.sign(two, accounts[6]).then(twoSig => {
              return exchange.atomicMatch(one, sig, firstCall, two, twoSig, secondCall, ZERO_BYTES32).then(() => {
                return erc20.balanceOf(accounts[6]).then(balance => {
                  assert.equal(4, balance, 'Incorrect balance')
                })
              })
            })
          })
      })
  })

  it('should match erc20-erc20 swap order', () => {
    return withContracts().then(({atomicizer, exchange, registry, statici}) => {
      return withTokens().then(({ erc20 }) => {
        const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)

        const selector = web3.eth.abi.encodeFunctionSignature('swapExact(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const paramsOne = web3.eth.abi.encodeParameters(
          ['address[2]', 'uint256[2]'],
          [[erc20.address, erc20.address], ['1', '2']]
        )
        const paramsTwo = web3.eth.abi.encodeParameters(
          ['address[2]', 'uint256[2]'],
          [[erc20.address, erc20.address], ['2', '1']]
        )

        const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: paramsOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '412312'}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: paramsTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '4434'}

        const firstData = erc20c.methods.transferFrom(accounts[0], accounts[6], 1).encodeABI()
        const secondData = erc20c.methods.transferFrom(accounts[6], accounts[0], 2).encodeABI()

        const firstCall = {target: erc20.address, howToCall: 0, data: firstData}
        const secondCall = {target: erc20.address, howToCall: 0, data: secondData}
        const sigOne = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
        return exchange.sign(two, accounts[6]).then(sigTwo => {
          return exchange.atomicMatch(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32).then(() => {
            return erc20.balanceOf(accounts[0]).then(balance => {
            })
          })
        })
      })
    })
  })

  it('should match with signatures', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: 2344}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: 2345}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
            })
          })
        })
      })
  })

  it('should not match with signatures twice', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: 2344}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: 2345}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
              assert.equal(true, false, 'Should not have matched twice')
            }).catch(err => {
              assert.equal(err.message, 'Returned error: VM Exception while processing transaction: revert First order has invalid parameters -- Reason given: First order has invalid parameters.', '')
            })
          })
        })
      })
  })

  it('should match with signatures no-fill', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('anyNoFill(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32).then(() => {
            })
          })
        })
      })
  })

  it('should match with signatures no-fill, value', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('anyNoFill(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[6]).then(oneSig => {
          return exchange.sign(two, accounts[6]).then(twoSig => {
            const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
            return exchange.atomicMatchWith(one, oneSig, call, two, twoSig, call, ZERO_BYTES32, {value: 3}).then(() => {
            })
          })
        })
      })
  })

  it('should match with approvals', () => {
    return withContracts()
      .then(({exchange, registry, statici}) => {
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        return exchange.sign(one, accounts[6]).then(sig => {
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[7], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[7], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
        const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
        const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
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
