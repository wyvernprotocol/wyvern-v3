import { expect, assert} from 'chai';
import { ethers } from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';

import { 
  WyvernRegistry__factory, 
  WyvernRegistry,
  AuthenticatedProxy__factory,
  AuthenticatedProxy,
  OwnableDelegateProxy__factory,
  OwnableDelegateProxy,
  TestAuthenticatedProxy__factory,
  TestAuthenticatedProxy,
  TestERC20__factory,
  TestERC20
} from '../build/types';

const {increaseTime, increaseTimePromise} = require('./auxiliary')

describe('WyvernRegistry', () => {

  let registry: WyvernRegistry;
  let signers;

  beforeEach(async () => {
    
    signers = await ethers.getSigners();
    const wyvernRegistryFactory = (await ethers.getContractFactory('WyvernRegistry', signers[0])) as WyvernRegistry__factory;
    registry = await wyvernRegistryFactory.deploy();
    await registry.deployed();
  })

  it('does not allow additional grant',async () => {
    return expect(
      registry.grantInitialAuthentication(registry.address)
      ).to.revertedWith('Should not have allowed additional grant');
  })

  it('has a delegateproxyimpl', async () => {
    let delegateproxyimpl = await registry.delegateProxyImplementation();
    assert.equal(delegateproxyimpl.length,42,'delegateproxyimpl was not set');
  })

  it('allows proxy registration', async () => {
    await registry.connect(signers[3]).registerProxy();
    let proxy = await registry.proxies(signers[3].address);
    assert.ok(proxy.length > 0);
  })

  it('allows proxy registration',async () => {
    await registry.connect(signers[2]).registerProxy();
    let proxy = await registry.proxies(signers[2].address);
    assert.ok(proxy.length > 0)
  })

  it('allows proxy override', async () => {
    await registry.connect(signers[2].address).registerProxyOverride();
    let proxy = await registry.proxies(signers[2].address);
    assert.isTrue(proxy.length > 0);
  })

  it('allows proxy upgrade', async () => {
    await registry.connect(signers[5]).registerProxy();
    let proxy = await registry.proxies(signers[5].address);
    let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);
    let implementation = await registry.delegateProxyImplementation();
    assert.isOk(await contract.upgradeTo({from: signers[5].address}, registry.address));
    assert.isOk(await contract.upgradeTo({from: signers[5].address}, implementation));
  })

  it('allows proxy to receive ether',async () => {
    let proxy = await registry.proxies(signers[5].address);
    assert.isOk(await signers[0].sendTransaction({to: proxy, value: 1000}));
  })

  it('allows proxy to receive tokens before approval',async () => {
    const amount = '1000';
    let proxy = await registry.proxies(signers[3].address);
    const testERC20Factory = (await ethers.getContractFactory('TestERC20', signers[0])) as TestERC20__factory;
    let erc20 = await testERC20Factory.deploy();
    await erc20.deployed();
    let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
    return expect(
      contract.receiveApproval(signers[3],amount,erc20.address,'0x', {from: signers[3]})
    ).to.be.revertedWith('Should not have succeeded')
  })

  it('allows proxy to receive tokens',async () => {
    const amount = '1000';
    let proxy = await registry.proxies(signers[3].address);
    const testERC20Factory = (await ethers.getContractFactory('TestERC20', signers[0])) as TestERC20__factory;
    let erc20 = await testERC20Factory.deploy();
    await erc20.deployed();
    await Promise.all([erc20.mint(signers[3].address,amount), erc20.approve(proxy,amount, {from: signers[3]})]);
    let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
    assert.isOk(contract.receiveApproval(signers[3].address,amount,erc20.address,'0x', {from: signers[3]}))
  })

  it('does not allow proxy upgrade to same implementation',async () => {
    let proxy = await registry.proxies(signers[3].address)
    let implementation = await registry.delegateProxyImplementation();
    let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);
    return expect(
      contract.upgradeTo(implementation, {from: signers[3]})
    ).to.be.revertedWith('Allowed upgrade to same implementation')
  })

  it('returns proxy type',async () => {
    let proxy = await registry.proxies(signers[3].address);
    let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);
    assert.equal(await contract.proxyType(),2,'Incorrect proxy type')
  })

  it('does not allow proxy update from another account',async () => {
    let proxy = await registry.proxies(signers[3].address);
    let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);
    return expect(contract.upgradeTo(registry.address, {from: signers[1]})
    ).to.be.revertedWith('Allowed proxy update from another account')
  })

  it('allows proxy ownership transfer',async () => {
    let proxy = await registry.proxies(signers[3].address);
    let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);
    assert.isOk(await contract.transferProxyOwnership(signers[4].address, {from: signers[3].address}));
    assert.isOk(await contract.transferProxyOwnership(signers[3].address, {from: signers[4].address}));
  })

  it('allows start but not end of authentication process',async () => {
    await registry.startGrantAuthentication(signers[0].address)
    let timestamp = await registry.pending(signers[0].address)
    assert.isTrue(timestamp.toNumber() > 0,'Invalid timestamp')
    return expect(
      registry.endGrantAuthentication(signers[0].address)
    ).to.be.revertedWith('Allowed end authentication process')
  })

  it('does not allow start twice',async () => {
    return expect(
      registry.startGrantAuthentication(signers[0].address)
    ).to.be.revertedWith('Start of authentication process allowed twice')
  })

  it('does not allow end without start',async () => {
    return expect(
      registry.endGrantAuthentication(signers[1].address)
    ).to.be.revertedWith('End of authentication process allowed without start')
  })

  it('allows end after time has passed',async () => {
    await increaseTime(86400 * 7 * 3);
    await registry.endGrantAuthentication(signers[0].address);
    let result = await registry.contracts(signers[0].address);
    assert.isTrue(result,'Auth was not granted');
    await registry.revokeAuthentication(signers[0].address);
    result = await registry.contracts(signers[0].address);
    assert.isFalse(result,'Auth was not revoked');
  })

  it('allows proxy registration for another user',async () => {
    await registry.registerProxyFor(signers[1].address);
    let proxy = await registry.proxies(signers[1].address);
    assert.isTrue(proxy.length > 0)
  })

  it('does not allow proxy registration for another user if a proxy already exists', async () => {
    return expect(
      registry.registerProxyFor(signers[1].address)
    ).to.be.revertedWith('Should not have succeeded')
  })

  it('does not allow proxy transfer from another account',async () => {
    let proxy = await registry.proxies(signers[2].address);
    return expect(
      registry.transferAccessTo(proxy, signers[2].address)
    ).to.be.revertedWith('Should not have succeeded')
  })

  it('allows proxy revocation',async () => {
    const testAuthenticatedProxyFactory = (await ethers.getContractFactory('TestAuthenticatedProxy', signers[0])) as TestAuthenticatedProxy__factory;
    let testProxy = await testAuthenticatedProxyFactory.deploy();
    await testProxy.deployed();
    let proxy = await registry.proxies(signers[1].address);
    let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
    let user = await contract.user();
    assert.equal(user, signers[1].address)
    await contract.methods.setRevoke(true, {from: signers[1]});
    assert.isTrue(await contract.revoked().call(),'Should be revoked')
    assert.isOk(await contract.setRevoke(false, {from: signers[1]}),'Should be unrevoked')
  })

  it('does not allow revoke from another account',async () => {
    let proxy = await registry.proxies(signers[3].address);
    let contract = await ethers.getContractAt('AuthenticatedProxy',proxy);
    return expect(
      contract.setRevoke(true, {from: signers[1]})
    ).to.be.revertedWith('Revocation was allowed from another account')
  })

  it('should not allow proxy reinitialization',async () => {
    const testAuthenticatedProxyFactory = (await ethers.getContractFactory('TestAuthenticatedProxy', signers[0])) as TestAuthenticatedProxy__factory;
    let testProxy = await testAuthenticatedProxyFactory.deploy();
    await testProxy.deployed();
    let proxy = await registry.proxies(signers[1].address);
    let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
    let user = await contract.user();
    return expect(
      contract.initialize(registry.address, registry.address, {from: signers[1]})
    ).to.be.revertedWith('Should not have succeeded')
  })

  it('allows delegateproxy owner change, but only from owner',async () => {
    const testAuthenticatedProxyFactory = (await ethers.getContractFactory('TestAuthenticatedProxy', signers[0])) as TestAuthenticatedProxy__factory;
    let testProxy = await testAuthenticatedProxyFactory.deploy();
    await testProxy.deployed();
    let proxy = await registry.proxies(signers[1].address);
    let contract_at = await ethers.getContractAt('AuthenticatedProxy', proxy);
    let user = await contract_at.user();
    assert.equal(user,signers[1].address)
    let contract = await ethers.getContractAt('TestAuthenticatedProxy', testProxy.address);
    let call = contract.setUser(signers[4].address).encodeABI();
    await expect(
      contract_at.proxyAssert(testProxy.address,1,call,{from: signers[4]})
    ).to.be.revertedWith('Should not have succeeded');
    await contract_at.proxyAssert(testProxy.address,1,call,{from: signers[1]})
    user = await contract_at.user()
    assert.equal(user,signers[4].address,'User was not changed')
  })
})
