/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernRegistry = artifacts.require('WyvernRegistry')
const AuthenticatedProxy = artifacts.require('AuthenticatedProxy')
const OwnableDelegateProxy = artifacts.require('OwnableDelegateProxy')
const TestAuthenticatedProxy = artifacts.require('TestAuthenticatedProxy')
const TestERC20 = artifacts.require('TestERC20')

const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const {increaseTime,increaseTimePromise,assertIsRejected} = require('./util')

contract('WyvernRegistry',accounts => {
  it('is deployed',async () => {
    return await WyvernRegistry.deployed()
  })

  it('does not allow additional grant',async () => {
    let registry = await WyvernRegistry.deployed()
    return assertIsRejected(
      registry.grantInitialAuthentication(registry.address),
      /Wyvern Protocol Proxy Registry initial address already set/,
      'Should not have allowed additional grant'
      )
  })

  it('has a delegateproxyimpl',async () => {
    let registry = await WyvernRegistry.deployed()
    let delegateproxyimpl = await registry.delegateProxyImplementation()
    assert.equal(delegateproxyimpl.length,42,'delegateproxyimpl was not set')
  })

  it('allows proxy registration',async () => {
    let registry = await WyvernRegistry.deployed()
    await registry.registerProxy({from: accounts[3]})
    let proxy = await registry.proxies(accounts[3])
    assert.ok(proxy.length > 0)
  })

  it('allows proxy registration',async () => {
    let registry = await WyvernRegistry.deployed()
    await registry.registerProxy({from: accounts[2]})
    let proxy = await registry.proxies(accounts[2])
    assert.ok(proxy.length > 0)
  })

  it('allows proxy override',async () => {
    let registry = await WyvernRegistry.deployed()
    await registry.registerProxyOverride({from: accounts[2]})
    let proxy = await registry.proxies(accounts[2])
    assert.isTrue(proxy.length > 0)
  })

  it('allows proxy upgrade',async () => {
    let registry = await WyvernRegistry.deployed()
    await registry.registerProxy({from: accounts[5]})
    let proxy = await registry.proxies(accounts[5])
    let contract = new web3.eth.Contract(OwnableDelegateProxy.abi, proxy)
    let implementation = await registry.delegateProxyImplementation()
    assert.isOk(await contract.methods.upgradeTo(registry.address).send({from: accounts[5]}))
    assert.isOk(await contract.methods.upgradeTo(implementation).send({from: accounts[5]}))
  })

  it('allows proxy to receive ether',async () => {
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[3])
    assert.isOk(await web3.eth.sendTransaction({to: proxy, from: accounts[0], value: 1000}))
  })

  it('allows proxy to receive tokens before approval',async () => {
    const amount = '1000'
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[3])
    let erc20 = await TestERC20.deployed()
    let contract = new web3.eth.Contract(AuthenticatedProxy.abi,proxy)
    return assertIsRejected(
      contract.methods.receiveApproval(accounts[3],amount,erc20.address,'0x').send({from: accounts[3]}),
      /ERC20: transfer amount exceeds balance/,
      'Should not have succeeded'
      )
  })

  it('allows proxy to receive tokens',async () => {
    const amount = '1000'
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[3])
    let erc20 = await TestERC20.deployed()
    await Promise.all([erc20.mint(accounts[3],amount),erc20.approve(proxy,amount,{from: accounts[3]})])
    let contract = new web3.eth.Contract(AuthenticatedProxy.abi,proxy)
    assert.isOk(contract.methods.receiveApproval(accounts[3],amount,erc20.address,'0x').send({from: accounts[3]}))
  })

  it('does not allow proxy upgrade to same implementation',async () => {
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[3])
    let implementation = await registry.delegateProxyImplementation()
    let contract = new web3.eth.Contract(OwnableDelegateProxy.abi,proxy)
    return assertIsRejected(
      contract.methods.upgradeTo(implementation).send({from: accounts[3]}),
      /Returned error: VM Exception while processing transaction: revert/,
      'Allowed upgrade to same implementation'
      )
  })

  it('returns proxy type',async () => {
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[3])
    let contract = new web3.eth.Contract(OwnableDelegateProxy.abi,proxy)
    assert.equal(await contract.methods.proxyType().call(),2,'Incorrect proxy type')
  })

  it('does not allow proxy update from another account',async () => {
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[3])
    let contract = new web3.eth.Contract(OwnableDelegateProxy.abi,proxy)
    return assertIsRejected(
      contract.methods.upgradeTo(registry.address).send({from: accounts[1]}),
      /Returned error: VM Exception while processing transaction: revert/,
      'Allowed proxy update from another account'
      )
  })

  it('allows proxy ownership transfer',async () => {
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[3])
    let contract = new web3.eth.Contract(OwnableDelegateProxy.abi,proxy)
    assert.isOk(await contract.methods.transferProxyOwnership(accounts[4]).send({from: accounts[3]}))
    assert.isOk(await contract.methods.transferProxyOwnership(accounts[3]).send({from: accounts[4]}))
  })

  it('allows start but not end of authentication process',async () => {
    let registry = await WyvernRegistry.deployed()
    await registry.startGrantAuthentication(accounts[0])
    let timestamp = await registry.pending.call(accounts[0])
    assert.isTrue(timestamp.toNumber() > 0,'Invalid timestamp')
    return assertIsRejected(
      registry.endGrantAuthentication(accounts[0]),
      /Contract is no longer pending or has already been approved by registry/,
      'Allowed end authentication process')
  })

  it('does not allow start twice',async () => {
    let registry = await WyvernRegistry.deployed()
    return assertIsRejected(
      registry.startGrantAuthentication(accounts[0]),
      /Contract is already allowed in registry, or pending/,
      'Start of authentication process allowed twice'
      )
  })

  it('does not allow end without start',async () => {
    let registry = await WyvernRegistry.deployed()
    return assertIsRejected(
      registry.endGrantAuthentication(accounts[1]),
      /Contract is no longer pending or has already been approved by registry/,
      'End of authentication process allowed without start'
      )
  })

  it('allows end after time has passed',async () => {
    let registry = await WyvernRegistry.deployed()
    await increaseTime(86400 * 7 * 3)
    await registry.endGrantAuthentication(accounts[0])
    let result = await registry.contracts.call(accounts[0])
    assert.isTrue(result,'Auth was not granted')
    await registry.revokeAuthentication(accounts[0])
    result = await registry.contracts.call(accounts[0])
    assert.isFalse(result,'Auth was not revoked')
  })

  it('allows proxy registration for another user',async () => {
    let registry = await WyvernRegistry.deployed()
    await registry.registerProxyFor(accounts[1])
    let proxy = await registry.proxies(accounts[1])
    assert.isTrue(proxy.length > 0)
  })

  it('does not allow proxy registration for another user if a proxy already exists',async () => {
    let registry = await WyvernRegistry.deployed()
    return assertIsRejected(
      registry.registerProxyFor(accounts[1]),
      /User already has a proxy/,
      'Should not have succeeded'
      )
  })

  it('does not allow proxy transfer from another account',async () => {
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[2])
    return assertIsRejected(
      registry.transferAccessTo(proxy,accounts[2]),
      /Proxy transfer can only be called by the proxy/,
      'Should not have succeeded'
      )
  })

  it('allows proxy revocation',async () => {
    let [registry,testProxy] = await Promise.all([WyvernRegistry.deployed(),TestAuthenticatedProxy.deployed()])
    let proxy = await registry.proxies(accounts[1])
    let contract_at = await AuthenticatedProxy.at(proxy)
    let contract = new web3.eth.Contract(AuthenticatedProxy.abi,proxy)
    let user = await contract_at.user()
    assert.equal(user,accounts[1])
    await contract.methods.setRevoke(true).send({from: accounts[1]})
    assert.isTrue(await contract.methods.revoked().call(),'Should be revoked')
    assert.isOk(await contract.methods.setRevoke(false).send({from: accounts[1]}),'Should be unrevoked')
  })

  it('does not allow revoke from another account',async () => {
    let registry = await WyvernRegistry.deployed()
    let proxy = await registry.proxies(accounts[3])
    let contract = new web3.eth.Contract(AuthenticatedProxy.abi,proxy)
    return assertIsRejected(
      contract.methods.setRevoke(true).send({from: accounts[1]}),
      /Authenticated proxy can only be revoked by its user/,
      'Revocation was allowed from another account'
      )
  })

  it('should not allow proxy reinitialization',async () => {
    let [registry,testProxy] = await Promise.all([WyvernRegistry.deployed(),TestAuthenticatedProxy.deployed()])
    let proxy = await registry.proxies(accounts[1])
    let contract_at = await AuthenticatedProxy.at(proxy)
    let user = await contract_at.user()
    let contract = new web3.eth.Contract(AuthenticatedProxy.abi,proxy)
    return assertIsRejected(
      contract.methods.initialize(registry.address, registry.address).send({from: accounts[1]}),
      /Authenticated proxy already initialized/,
      'Should not have succeeded'
      )
  })

  it('allows delegateproxy owner change, but only from owner',async () => {
    let [registry,testProxy] = await Promise.all([WyvernRegistry.deployed(),TestAuthenticatedProxy.deployed()])
    let proxy = await registry.proxies(accounts[1])
    let contract_at = await AuthenticatedProxy.at(proxy)
    let user = await contract_at.user()
    assert.equal(user,accounts[1])
    let contract = new web3.eth.Contract(TestAuthenticatedProxy.abi, testProxy.address)
    let call = contract.methods.setUser(accounts[4]).encodeABI()
    await assertIsRejected(
      contract_at.proxyAssert(testProxy.address,1,call,{from: accounts[4]}),
      /Authenticated proxy can only be called by its user, or by a contract authorized by the registry as long as the user has not revoked access/,
      'Should not have succeeded'
      )
    await contract_at.proxyAssert(testProxy.address,1,call,{from: accounts[1]})
    user = await contract_at.user()
    assert.equal(user,accounts[4],'User was not changed')
  })
})
