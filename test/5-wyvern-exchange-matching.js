/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')

contract('WyvernExchange', (accounts) => {
  it('should match any-any nop order', () => {
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
