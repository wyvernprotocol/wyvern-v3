module.exports = {
  port: 8545,
  copyPackages: ['openzeppelin-solidity'],
  skipFiles: ['lib/StaticCaller.sol', 'lib/ArrayUtils.sol', 'static/StaticUtil.sol', 'static/StaticERC20.sol', 'static/StaticERC721.sol', 'static/StaticCompat.sol', 'static/StaticPayment.sol', 'WyvernAtomicizer.sol'],
  compileCommand: '../node_modules/.bin/truffle compile',
  testCommand: '../node_modules/.bin/truffle test --network coverage'
}
