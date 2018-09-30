module.exports = {
  port: 8545,
  copyPackages: ['openzeppelin-solidity'],
  skipFiles: ['lib/ArrayUtils.sol'],
  compileCommand: '../node_modules/.bin/truffle compile',
  testCommand: '../node_modules/.bin/truffle test --network coverage'
}
