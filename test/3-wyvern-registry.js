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

  it('should not allow additional grant', () => {
    return WyvernRegistry
      .deployed()
      .then(registry => {
        return registry.grantInitialAuthentication(registry.address).then(() => {
          assert.equal(true, false, 'Should not have succeeded')
        }).catch(err => {
          assert.equal(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
        })
      })
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

  it('should allow proxy revocation', () => {
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
                  const inst = new web3.eth.Contract(AuthenticatedProxy.abi, addr)
                  return inst.methods.setRevoke(true).send({from: accounts[1]}).then(() => {
                    return inst.methods.revoked().call().then(ret => {
                      assert.equal(ret, true, 'Should be revoked')
                      return inst.methods.setRevoke(false).send({from: accounts[1]}).then(() => {
                        return inst.methods.revoked().call().then(ret => {
                          assert.equal(ret, false, 'Should be unrevoked')
                        })
                      })
                    })
                  })
                })
              })
            })
          })
      })
  })

  it('should not allow proxy reinitialization', () => {
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
                  const inst = new web3.eth.Contract(AuthenticatedProxy.abi, addr)
                  return inst.methods.initialize(registry.address, registry.address).send({from: accounts[1]}).then(ret => {
                    assert.equal(true, false, 'Should not have succeeded')
                  }).catch(err => {
                    assert.equal(err.message, 'Returned error: VM Exception while processing transaction: revert', 'Incorrect error')
                  })
                })
              })
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
