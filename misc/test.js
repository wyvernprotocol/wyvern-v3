const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://51.79.17.5:8545')
const web3 = new Web3(provider)

const proxyRegistryABI = JSON.parse('[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"initialAddressSet","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"addr","type":"address"}],"name":"endGrantAuthentication","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"addr","type":"address"}],"name":"revokeAuthentication","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"pending","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"contracts","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"delegateProxyImplementation","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"proxies","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"addr","type":"address"}],"name":"startGrantAuthentication","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"registerProxy","outputs":[{"name":"proxy","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"DELAY_PERIOD","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"authAddress","type":"address"}],"name":"grantInitialAuthentication","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"}],"name":"OwnershipRenounced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"}]')
const atomicizerABI = JSON.parse('[{"constant":false,"inputs":[{"name":"addrs","type":"address[]"},{"name":"values","type":"uint256[]"},{"name":"calldataLengths","type":"uint256[]"},{"name":"calldatas","type":"bytes"}],"name":"atomicize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]')
const daoProxyABI = JSON.parse('[{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"value","type":"uint256"},{"name":"token","type":"address"},{"name":"extraData","type":"bytes"}],"name":"receiveApproval","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"dest","type":"address"},{"name":"calldata","type":"bytes"}],"name":"delegateProxyAssert","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"dest","type":"address"},{"name":"calldata","type":"bytes"}],"name":"delegateProxy","outputs":[{"name":"result","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"}],"name":"OwnershipRenounced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"ReceivedEther","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":true,"name":"token","type":"address"},{"indexed":false,"name":"extraData","type":"bytes"}],"name":"ReceivedTokens","type":"event"}]')
const delegateProxyAssert = daoProxyABI.filter(m => m.name === 'delegateProxyAssert')[0]
const atomicize = atomicizerABI.filter(m => m.name === 'atomicize')[0]
const startGrantAuthentication = proxyRegistryABI.filter(m => m.name === 'startGrantAuthentication')[0]

const encodedAuth = web3.eth.abi.encodeFunctionCall(startGrantAuthentication,
  ['0xd7ca74ff003c90e62505d21ec7dac36bcfd9f6f2']
)
console.log('Encoded startAuth call: ' + encodedAuth)
const atomicized = web3.eth.abi.encodeFunctionCall(atomicize,
  [['0xa5409ec958C83C3f309868babACA7c86DCB077c1'], [0], [(encodedAuth.length - 2) / 2], encodedAuth]
)
console.log('Atomicized: ' + atomicized)
const final = web3.eth.abi.encodeFunctionCall(delegateProxyAssert,
  ['0xC99f70bFD82fb7c8f8191fdfbFB735606b15e5c5', atomicized]
)

web3.eth.call({
  to: '0x17F68886d00845867C154C912b4cCc506EC92Fc7',
  from: '0xa839D4b5A36265795EbA6894651a8aF3d0aE2e68',
  data: encodedAuth,
  value: 0
}).then(r => {
  console.log('encodedAuth result: ' + r)
}).catch(e => {
  console.log('encodedAuth error: ' + e)
})

web3.eth.call({
  to: '0xa839D4b5A36265795EbA6894651a8aF3d0aE2e68',
  from: '0x17F68886d00845867C154C912b4cCc506EC92Fc7',
  data: final,
  value: 0
}).then(r => {
  console.log('final result: ' + r)
}).catch(e => {
  console.log('final error: ' + e)
})

console.log('Final: ' + final)
