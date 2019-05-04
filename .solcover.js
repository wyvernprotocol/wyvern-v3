module.exports = {
  port: 8545,
  copyPackages: ['openzeppelin-solidity'],
  skipFiles: [
    'static/',
    'lib/',
    'TestERC20.sol',
    'TestERC721.sol',
    'TestAuthenticatedProxy.sol',
    'WyvernAtomicizer.sol',
    'WyvernStatic.sol'
  ],
  compileCommand: '../node_modules/.bin/truffle compile',
  testCommand: '../node_modules/.bin/truffle test --network coverage'
}
