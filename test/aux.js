const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const hashOrder = (order) => {
  return web3.utils.soliditySha3(
    {type: 'address', value: order.exchange},
    {type: 'address', value: order.registry},
    {type: 'address', value: order.maker},
    {type: 'address', value: order.staticTarget},
    {type: 'bytes', value: order.staticExtradata},
    {type: 'uint', value: order.maximumFill},
    {type: 'uint', value: order.listingTime},
    {type: 'uint', value: order.expirationTime},
    {type: 'uint', value: order.salt}
  ).toString('hex')
}

const hashToSign = (order) => {
  return web3.utils.soliditySha3(
    {type: 'string', value: '\x19Ethereum Signed Message:\n32'},
    {type: 'bytes32', value: hashOrder(order)}
  )
}

const parseSig = (bytes) => {
  bytes = bytes.substr(2)
  const r = '0x' + bytes.slice(0, 64)
  const s = '0x' + bytes.slice(64, 128)
  const v = 27 + parseInt('0x' + bytes.slice(128, 130), 16)
  return {v, r, s}
}

const wrap = (inst) => {
  var obj = {
    inst: inst,
    hashOrder: (order) => inst.hashOrder_.call(order.exchange, order.registry, order.maker, order.staticTarget, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
    hashToSign: (order) => {
      return inst.hashOrder_.call(order.exchange, order.registry, order.maker, order.staticTarget, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt).then(hash => {
        return inst.hashToSign_.call(hash)
      })
    },
    validateOrderParameters: (order) => inst.validateOrderParameters_.call(order.exchange, order.registry, order.maker, order.staticTarget, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
    validateOrderAuthorization: (hash, maker, sig, misc) => inst.validateOrderAuthorization_.call(hash, maker, sig.v, sig.r, sig.s, misc),
    approveOrderHash: (hash) => inst.approveOrderHash_(hash),
    approveOrder: (order, inclusion, misc) => inst.approveOrder_(order.exchange, order.registry, order.maker, order.staticTarget, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt, inclusion, misc),
    setOrderFill: (order, fill) => inst.setOrderFill_(hashOrder(order), fill),
    atomicMatch: (order, sig, call, counterorder, countersig, countercall, metadata) => inst.atomicMatch_(
      [order.exchange, order.registry, order.maker, order.staticTarget, call.target, counterorder.exchange, counterorder.registry, counterorder.maker, counterorder.staticTarget, countercall.target],
      [order.maximumFill, order.listingTime, order.expirationTime, order.salt, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt],
      order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
      [sig.v, call.howToCall, countersig.v, countercall.howToCall],
      [sig.r, sig.s, countersig.r, countersig.s, metadata]
    )
  }
  obj.sign = (order, account) => {
    const hash = hashOrder(order)
    return web3.eth.sign(hash, account).then(sigBytes => {
      const sig = parseSig(sigBytes)
      return sig
    })
  }
  return obj
}

const randomUint = () => {
  return Math.floor(Math.random() * 1e10)
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

module.exports = {
  hashOrder,
  hashToSign,
  wrap,
  randomUint,
  ZERO_ADDRESS,
  ZERO_BYTES32
}
