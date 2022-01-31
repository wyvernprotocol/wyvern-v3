/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernRegistry = artifacts.require('WyvernRegistry')

const {wrap, hashOrder, hashToSign, ZERO_ADDRESS, ZERO_BYTES32, CHAIN_ID, assertIsRejected} = require('./util')

contract('WyvernExchange',accounts => {
  const withExchangeAndRegistry = async () => {
    let [exchange,registry] = await Promise.all([WyvernExchange.deployed(),WyvernRegistry.deployed()])
    return {exchange: wrap(exchange),registry}
  }

  it('is deployed',async () => {
    return await withExchangeAndRegistry()
  })

  it('correctly hashes order',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[0],staticTarget: ZERO_ADDRESS,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '0',salt: '0'}
    let hash = await exchange.hashOrder(example)
    assert.equal(hashOrder(example),hash,'Incorrect order hash')
  })

  it('correctly hashes order to sign',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[0],staticTarget: ZERO_ADDRESS,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '0',salt: '0'}
    let hash = await exchange.hashToSign(example)
    assert.equal(hashToSign(example,exchange.inst.address),hash,'Incorrect order hash')
  })

  it('does not allow set-fill to same fill',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address, maker: accounts[1], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '6'}
    return assertIsRejected(
      exchange.setOrderFill(example,'0',{from: accounts[1]}),
      /Fill is already set to the desired value/,
      'Should not have suceeded'
      )
  })

  it('validates valid order parameters',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[0],staticTarget: exchange.inst.address,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '1000000000000',salt: '0'}
    assert.isTrue(await exchange.validateOrderParameters(example),'Should have validated')
  })

  it('does not validate order parameters with invalid staticTarget',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[0],staticTarget: ZERO_ADDRESS,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '1000000000000',salt: '0'}
    assert.isFalse(await exchange.validateOrderParameters(example),'Should not have validated')
  })

  it('does not validate order parameters with listingTime after now',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[0],staticTarget: exchange.inst.address,staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '1000000000000', expirationTime: '1000000000000', salt: '0'}
    assert.isFalse(await exchange.validateOrderParameters(example),'Should not have validated')
  })

  it('does not validate order parameters with expirationTime before now',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[0],staticTarget: exchange.inst.address,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '1',salt: '0'}
    assert.isFalse(await exchange.validateOrderParameters(example),'Should not have validated')
  })

  it('validates valid authorization by signature (sign_typed_data)',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[1],staticTarget: exchange.inst.address,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '1000000000000',salt: '100230'}
    let signature = await exchange.sign(example,accounts[1])
    let hash = hashOrder(example)
    assert.isTrue(await exchange.validateOrderAuthorization(hash,accounts[1],signature,{from: accounts[5]}),'Should have validated')
  })

  it('validates valid authorization by signature (personal_sign)',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[1],staticTarget: exchange.inst.address,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '1000000000000',salt: '100231'}
    let hash = hashOrder(example)
    let signature = await exchange.personalSign(example,accounts[1])
    assert.isTrue(await exchange.validateOrderAuthorization(hash,accounts[1],signature, {from: accounts[5]}),'Should have validated')
  })

  it('does not validate authorization by signature with different prefix (personal_sign)',async () => {
    const prefix = Buffer.from("\x19Bogus Signed Message:\n",'binary');
    let registry = await WyvernRegistry.new()
    let exchange = await WyvernExchange.new(CHAIN_ID,[registry.address],prefix)
    await registry.grantInitialAuthentication(exchange.address)
    let wrappedExchange = wrap(exchange)
    let example = {registry: registry.address,maker: accounts[1],staticTarget: wrappedExchange.inst.address,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '1000000000000',salt: '100231'}
    let hash = hashOrder(example)
    let signature = await wrappedExchange.personalSign(example,accounts[1])
    assert.isFalse(await wrappedExchange.validateOrderAuthorization(hash,accounts[1],signature, {from: accounts[5]}),'Should not have validated')
  })

  it('does not allow approval twice',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    let example = {registry: registry.address,maker: accounts[1],staticTarget: exchange.inst.address,staticSelector: '0x00000000',staticExtradata: '0x',maximumFill: '1',listingTime: '0',expirationTime: '1000000000000',salt: '1010'}
    await exchange.approveOrder(example,false,{from: accounts[1]})
    return assertIsRejected(
      exchange.approveOrder(example,false,{from: accounts[1]}),
      /Order has already been approved/,
      'Should not have succeeded'
      )
  })

  it('does not allow approval from another user',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[1], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '10101234'}
    return assertIsRejected(
      exchange.approveOrder(example,false,{from: accounts[2]}),
      /Sender is not the maker of the order and thus not authorized to approve it/,
      'Should not have succeeded')
  })

  it('validates valid authorization by approval',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[1], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '10'}
    await exchange.approveOrder(example,false,{from: accounts[1]})
    const hash = hashOrder(example)
    let valid = await exchange.validateOrderAuthorization(hash, accounts[0], {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32})
    assert.isTrue(valid,'Should have validated')
  })

  it('validates valid authorization by hash-approval',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[1], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '1'}
    const hash = hashOrder(example)
    await exchange.approveOrderHash(hash,{from: accounts[1]})
    let valid = await exchange.validateOrderAuthorization(hash,accounts[5],{v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}, {from: accounts[5]});
    assert.isTrue(valid,'Should have validated')
  })

  it('validates valid authorization by maker',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[0], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '5'}
    const hash = hashOrder(example)
    let valid = await exchange.validateOrderAuthorization(hash, accounts[0], {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}, {from: accounts[0]})
    assert.isTrue(valid,'Should have validated')
  })

  it('validates valid authorization by cache',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[1], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '6'}
    await exchange.setOrderFill(example, '2', {from: accounts[1]})
    const hash = hashOrder(example)
    let valid = await exchange.validateOrderAuthorization(hash, accounts[0], {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}, {from: accounts[0]})
    assert.isTrue(valid,'Should have validated')
  })

  it('does not validate authorization without signature',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[1], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '0'}
    const hash = hashOrder(example)
    let valid = await exchange.validateOrderAuthorization(hash, accounts[1], {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32})
    assert.isFalse(valid,'Should not have validated')    
  })

  it('does not validate cancelled order',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[0], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '20'}
    let signature = await exchange.sign(example, accounts[0])
    await exchange.setOrderFill(example, 1)
    let valid = await exchange.validateOrderParameters(example)
    assert.isFalse(valid,'Should not have validated')
  })

  it('allows order cancellation by maker',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[0], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '3'}
    assert.isOk(await exchange.setOrderFill(example, 1))
  })

  it('allows order cancellation by non-maker',async () => {
    let {exchange,registry} = await withExchangeAndRegistry()
    const example = {registry: registry.address, maker: accounts[1], staticTarget: exchange.inst.address, staticSelector: '0x00000000', staticExtradata: '0x', maximumFill: '1', listingTime: '0', expirationTime: '1000000000000', salt: '4'}
    assert.isOk(await exchange.setOrderFill(example, 1))
  })
})
