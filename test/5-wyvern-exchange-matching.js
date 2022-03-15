/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC721 = artifacts.require('TestERC721')
const TestERC1271 = artifacts.require('TestERC1271')
const TestSmartContractWallet = artifacts.require('TestSmartContractWallet')

const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const { wrap,hashOrder,ZERO_BYTES32,randomUint,NULL_SIG,assertIsRejected} = require('./util')

contract('WyvernExchange', (accounts) => {
  const deploy = async contracts => Promise.all(contracts.map(contract => contract.deployed()))

  const withContracts = async () =>
    {
    let [exchange,statici,registry,atomicizer,erc20,erc721,erc1271,smartContractWallet] = await deploy(
      [WyvernExchange,WyvernStatic,WyvernRegistry,WyvernAtomicizer,TestERC20,TestERC721,TestERC1271,TestSmartContractWallet])
    return {exchange:wrap(exchange),statici,registry,atomicizer,erc20,erc721,erc1271,smartContractWallet}
    }

  // Returns an array of two NFTs, one to give and one to get
  const withAsymmetricalTokens = async () => {
    let {erc721} = await withContracts()
    let nfts = [4,5]
    await Promise.all([erc721.mint(accounts[0], nfts[0]),erc721.mint(accounts[6], nfts[1])])
    return {nfts,erc721}
  }

  const withAsymmetricalTokens2 = async () => {
    let {erc721} = await withContracts()
    let nfts = [6,7]
    await Promise.all([erc721.mint(accounts[0], nfts[0]),erc721.mint(accounts[6], nfts[1])])
    return {nfts,erc721}
  }

  const withSomeTokens = async () => {
    let {erc20, erc721} = await withContracts()
    const amount = randomUint() + 2
    await erc20.mint(accounts[0],amount)
    return {tokens: amount, nfts: [1, 2, 3], erc20, erc721}
  }

  const withTokens = async () => {
    let {erc20} = await withContracts()
    const amount = randomUint() + 2
    await Promise.all([erc20.mint(accounts[0], amount),erc20.mint(accounts[6], amount)])
    return {erc20}
  }

  it('allows proxy transfer approval',async () => {
    let {registry,erc20,erc721} = await withContracts()
    await registry.registerProxy({from: accounts[0]})
    let proxy = await registry.proxies(accounts[0])
    assert.isTrue(proxy.length > 0,'No proxy address')
    assert.isOk(await erc20.approve(proxy, 100000))
    assert.isOk(await erc721.setApprovalForAll(proxy, true))
  })

  it('allows proxy registration',async () => {
    let {registry, erc20, erc721} = await withContracts()
    await registry.registerProxy({from: accounts[6]})
    let proxy = await registry.proxies(accounts[6])
    assert.isTrue(proxy.length > 0,'No proxy address')
    assert.isOk(await erc20.approve(proxy, 100000, {from: accounts[6]}))
    assert.isOk(await erc721.setApprovalForAll(proxy, true, {from: accounts[6]}))
  })

  it('allows proxy registration, erc1271',async () => {
    let {registry, erc20, erc721, erc1271} = await withContracts()
    await registry.registerProxyFor(erc1271.address)
    let proxy = await registry.proxies(erc1271.address)
    assert.isTrue(proxy.length > 0,'No proxy address')
  })

  it('matches any-any nop order',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
    const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '1'}
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    assert.isOk(await exchange.atomicMatch(one, NULL_SIG, call, two, NULL_SIG, call, ZERO_BYTES32))
  })

  it('does not match any-any nop order with wrong registry',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '2330'}
    const two = {registry: statici.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '2331'}
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, NULL_SIG, call, two, NULL_SIG, call, ZERO_BYTES32),
      /VM Exception while processing transaction: revert/,
      'Should not have matched'
      )
  })

  it('matches any-any nop order, erc 1271',async () => {
    let {exchange, registry, statici, erc1271} = await withContracts()
    await erc1271.setOwner(accounts[0])
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: erc1271.address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '410'}
    const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '411'}
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    let signature = await exchange.sign(one, accounts[0])
    assert.isOk(await exchange.atomicMatch(one, signature, call, two, NULL_SIG, call, ZERO_BYTES32))
  })

  it('does not match any-any nop order with bad sig, erc 1271',async () => {
    let {exchange, registry, statici, erc1271} = await withContracts()
    await erc1271.setOwner(accounts[0])
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: erc1271.address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '410'}
    const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '411'}
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    let signature = await exchange.sign(two, accounts[0])
    return assertIsRejected(
      exchange.atomicMatch(one, signature, call, two, NULL_SIG, call, ZERO_BYTES32),
      /First order has invalid parameters/,
      'Should not have matched'
      )
  })

  it('matches any-any nop order twice with no fill',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('anyNoFill(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    assert.isOk(await exchange.atomicMatch(one, NULL_SIG, call, two, NULL_SIG, call, ZERO_BYTES32))
    assert.isOk(await exchange.atomicMatch(one, NULL_SIG, call, two, NULL_SIG, call, ZERO_BYTES32))
  })

  it('matches exactly twice with two-fill',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('anyAddOne(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '2', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '2', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    let [signature1,signature2] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    await Promise.all(
      [
        exchange.atomicMatch(one, signature1, call, two, signature2, call, ZERO_BYTES32),
        exchange.atomicMatch(one, signature1, call, two, signature2, call, ZERO_BYTES32)
      ])
    return assertIsRejected(
      exchange.atomicMatch(one, signature1, call, two, signature2, call, ZERO_BYTES32),
      /First order has invalid parameters/,
      'Should not have succeeded'
    )
  })

  it('should not self-match',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, NULL_SIG, call, one, NULL_SIG, call, ZERO_BYTES32),
      /Self-matching orders is prohibited/,
      'Should not have succeeded'
    )
  })

  it('does not match any-any reentrant order',async () => {
    let {exchange, registry, statici} = await withContracts()
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
        web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [NULL_SIG.v, NULL_SIG.r, NULL_SIG.s]),
        web3.eth.abi.encodeParameters(['uint8', 'bytes32', 'bytes32'], [NULL_SIG.v, NULL_SIG.r, NULL_SIG.s])
      ])).encodeABI()
    const call2 = {target: exchange.inst.address, howToCall: 0, data: data}
    return assertIsRejected(
      exchange.atomicMatch(one, NULL_SIG, call1, two, NULL_SIG, call2, ZERO_BYTES32),
      /Second call failed/,
      'Should not have succeeded'
      )
  })

  it('matches nft-nft swap order',async () => {
    let {atomicizer, exchange, registry, statici} = await withContracts()
    let {nfts, erc721} = await withAsymmetricalTokens()
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
    const selector = web3.eth.abi.encodeFunctionSignature('swapOneForOneERC721(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
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
    const sigOne = NULL_SIG
    
    let sigTwo = await exchange.sign(two, accounts[6])
    await exchange.atomicMatch(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32)
    assert.equal(await erc721.ownerOf(nfts[0]), accounts[6], 'Incorrect owner')
  })

  it('matches nft-nft swap order, abi-decoding instead',async () => {
    let {atomicizer, exchange, registry, statici} = await withContracts()
    let {nfts, erc721} = await withAsymmetricalTokens2()
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
    const selector = web3.eth.abi.encodeFunctionSignature('swapOneForOneERC721Decoding(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
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
    const sigOne = NULL_SIG
    
    let sigTwo = await exchange.sign(two, accounts[6])
    await exchange.atomicMatch(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32)
    assert.equal(await erc721.ownerOf(nfts[0]), accounts[6], 'Incorrect owner')
  })

  it('matches two nft + erc20 orders',async () => {
    let {atomicizer, exchange, registry, statici, erc20, erc721} = await withContracts()
    let {tokens, nfts} = await withSomeTokens()
    const abi = [{'constant': false, 'inputs': [{'name': 'addrs', 'type': 'address[]'}, {'name': 'values', 'type': 'uint256[]'}, {'name': 'calldataLengths', 'type': 'uint256[]'}, {'name': 'calldatas', 'type': 'bytes'}], 'name': 'atomicize', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}]
    const atomicizerc = new web3.eth.Contract(abi, atomicizer.address)
    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '2'}
    const two = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3'}
    const sig = NULL_SIG
    
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
    
    await exchange.atomicMatch(one, sig, firstCall, two, sig, secondCall, ZERO_BYTES32)
    assert.equal(await erc20.balanceOf(accounts[6]), 2, 'Incorrect balance')
  })

  it('matches two nft + erc20 orders, real static call',async () => {
    let {atomicizer, exchange, registry, statici, erc20, erc721} = await withContracts()
    let {tokens, nfts} = await withSomeTokens()
    const abi = [{'constant': false, 'inputs': [{'name': 'addrs', 'type': 'address[]'}, {'name': 'values', 'type': 'uint256[]'}, {'name': 'calldataLengths', 'type': 'uint256[]'}, {'name': 'calldatas', 'type': 'bytes'}], 'name': 'atomicize', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}]
    const atomicizerc = new web3.eth.Contract(abi, atomicizer.address)
    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
    const selectorOne = web3.eth.abi.encodeFunctionSignature('split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const selectorOneA = web3.eth.abi.encodeFunctionSignature('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
    const selectorOneB = web3.eth.abi.encodeFunctionSignature('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
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
    const bEDParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [erc721.address, nfts[0]])
    const bEDSelector = web3.eth.abi.encodeFunctionSignature('transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)')
    const extradataOneB = web3.eth.abi.encodeParameters(
      ['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
      [[statici.address], [(bEDParams.length - 2) / 2], [bEDSelector], bEDParams]
    )
    const paramsOneA = web3.eth.abi.encodeParameters(
      ['address[2]', 'bytes4[2]', 'bytes', 'bytes'],
      [[statici.address, statici.address],
        [selectorOneA, selectorOneB],
        extradataOneA, extradataOneB]
    )
    const extradataOne = paramsOneA
    const selectorTwo = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const extradataTwo = '0x'
    const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: extradataOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3352'}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: extradataTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3335'}
    const sig = NULL_SIG
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
    
    let twoSig = await exchange.sign(two, accounts[6])
    await exchange.atomicMatch(one, sig, firstCall, two, twoSig, secondCall, ZERO_BYTES32)
    assert.equal(await erc20.balanceOf(accounts[6]), 4, 'Incorrect balance')
  })

  it('matches erc20-erc20 swap order',async () => {
    let {atomicizer, exchange, registry, statici} = await withContracts()
    let {erc20} = await withTokens()    
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
    const sigOne = NULL_SIG
    
    let sigTwo = await exchange.sign(two, accounts[6])
    await exchange.atomicMatch(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32)
    //TODO: missing assertion
  })

  it('matches with signatures',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: 2344}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: 2345}
    
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    assert.isOk(await exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32))
  })

  it('should not match with signatures twice',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: 2344}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: 2345}
    
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32),
      /First order has invalid parameters/,
      'Should not have matched twice'
    )
  })

  it('matches with signatures no-fill',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('anyNoFill(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    assert.isOk(await exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32))
  })

  it('should match with signatures no-fill, value',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('anyNoFill(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    assert.isOk(exchange.atomicMatchWith(one, oneSig, call, two, twoSig, call, ZERO_BYTES32, {value: 3}))
  })

  it('should match with approvals',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    await Promise.all([exchange.approveOrder(one, false, {from: accounts[6]}),exchange.approveOrder(two, false, {from: accounts[6]})])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    assert.isOk(exchange.atomicMatch(one, NULL_SIG, call, two, NULL_SIG, call, ZERO_BYTES32))
  })

  it('does not match with invalid first order auth',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    let signature = await exchange.sign(one, accounts[6])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, NULL_SIG, call, two, signature, call, ZERO_BYTES32),
      /First order failed authorization/,
      'Should not have matched'
      )
  })

  it('does not match with invalid second order auth',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    let signature = await exchange.sign(one, accounts[6])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, signature, call, two, NULL_SIG, call, ZERO_BYTES32),
      /Second order failed authorization/,
      'Should not have matched'
    )
  })

  it('does not match with invalid first order params',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    await exchange.inst.setOrderFill_(hashOrder(one), '10', {from: accounts[6]})
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32),
      /First order has invalid parameters/,
      'Should not have matched'
      )
  })

  it('does not match with invalid second order params',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    await exchange.inst.setOrderFill_(hashOrder(two), '3', {from: accounts[6]})
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32),
      /Second order has invalid parameters/,
      'Should not have matched'
      )
  })

  it('does not match with nonexistent first proxy',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[7], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[7]),exchange.sign(two, accounts[7])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32),
      /Second order failed authorization/,
      'Should not have matched'
      )
  })

  it('does not match with nonexistent second proxy',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[7], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32),
      /Second order failed authorization/,
      'Should not have matched'
    )
  })

  it('should not match with nonexistent target',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: accounts[7], howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    return assertIsRejected(
      exchange.atomicMatch(one, oneSig, call, two, twoSig, call, ZERO_BYTES32),
      /Call target does not exist/,
      'Should not have matched'
    )
  })

  it('should allow value transfer',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    let [oneSig,twoSig] = await Promise.all([exchange.sign(one, accounts[6]),exchange.sign(two, accounts[6])])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    assert.isOk(await exchange.atomicMatchWith(one, oneSig, call, two, twoSig, call, ZERO_BYTES32, {value: 200}))
  })

  it('allows proxy registration for smart contract',async () => {
    let {registry, erc721, smartContractWallet} = await withContracts()
    // this registration carries over to the following test and is necessary for the value exchange.
    await smartContractWallet.registerProxy(registry.address, {from: accounts[6]})
    let proxy = await registry.proxies(smartContractWallet.address)
    assert.isTrue(proxy.length > 0,'No proxy address')
    assert.isOk(await smartContractWallet.setApprovalForAll(proxy, erc721.address, true, {from: accounts[6]}))
  })

  it('should match with approvals and value to contract',async () => {
    const value = 200
    let {exchange, registry, statici, smartContractWallet} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    const two = {registry: registry.address, maker: smartContractWallet.address, staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: randomUint()}
    
    await Promise.all([exchange.approveOrder(one, false, {from: accounts[6]}),smartContractWallet.approveOrder_(exchange.inst.address, two.registry, two.maker, two.staticTarget, two.staticSelector, two.staticExtradata, two.maximumFill, two.listingTime, two.expirationTime, two.salt, false, {from: accounts[6]})])
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    assert.isOk(await exchange.atomicMatchWith(two, NULL_SIG, call, one, NULL_SIG, call, ZERO_BYTES32, {value: value, from: accounts[6]}))
    assert.equal(await web3.eth.getBalance(smartContractWallet.address), value.toString())
  })

  it('matches orders signed with personal_sign',async () => {
    let {exchange, registry, statici} = await withContracts()
    const selector = web3.eth.abi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const one = {registry: registry.address, maker: accounts[0], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '0'}
    const two = {registry: registry.address, maker: accounts[6], staticTarget: statici.address, staticSelector: selector, staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '100000000000', salt: '1'}
    const call = {target: statici.address, howToCall: 0, data: web3.eth.abi.encodeFunctionSignature('test()')}
    let sigOne = await exchange.personalSign(one,accounts[0])
    let sigTwo = await exchange.personalSign(two,accounts[6])
    assert.isOk(await exchange.atomicMatchWith(one, sigOne, call, two, sigTwo, call, ZERO_BYTES32, {from: accounts[5]}))
  })
})
