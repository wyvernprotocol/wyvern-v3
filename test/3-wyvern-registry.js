/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernRegistry = artifacts.require('WyvernRegistry')
const AuthenticatedProxy = artifacts.require('AuthenticatedProxy')
const TestAuthenticatedProxy = artifacts.require('TestAuthenticatedProxy')

const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

contract('WyvernRegistry', (accounts) => {
  it('should be deployed', () => {
    return WyvernRegistry
      .deployed()
      .then(() => {})
  })

  it('should allow proxy registration', () => {
    return WyvernRegistry
      .deployed()
      .then(instance => {
        return instance.registerProxy({from: accounts[2]}).then(() => {
          return instance.proxies(accounts[2]).then(addr => {
            assert.equal(addr.length > 0, true)
          })
        })
      })
  })

  it('should allow proxy registration for another user', () => {
    return WyvernRegistry
      .deployed()
      .then(instance => {
        return instance.registerProxyFor(accounts[1]).then(() => {
          return instance.proxies(accounts[1]).then(addr => {
            assert.equal(addr.length > 0, true)
          })
        })
      })
  })

  it('should allow delegateproxy owner change', () => {
    return WyvernRegistry
      .deployed()
      .then(registry => {
        return TestAuthenticatedProxy
          .deployed()
          .then(testProxy => {
            return registry.proxies(accounts[1]).then(addr => {
              return AuthenticatedProxy.at(addr).then(proxy => {
                return proxy.user().then(user => {
                  assert.equal(user, accounts[1])
                  const inst = new web3.eth.Contract(TestAuthenticatedProxy.abi, testProxy.address)
                  const call = inst.methods.setUser(accounts[3]).encodeABI()
                  return proxy.proxyAssert(testProxy.address, 1, call, {from: accounts[1]}).then(() => {
                    return proxy.user().then(user => {
                      assert.equal(user, accounts[3], 'User was not changed')
                    })
                  })
                })
              })
            })
          })
      })
  })
})
