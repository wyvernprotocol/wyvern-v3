const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const hashOrder = (order) => {
  return web3.utils.soliditySha3(
    {type: 'address', value: order.exchange},
    {type: 'address', value: order.maker},
    {type: 'address', value: order.staticTarget},
    {type: 'bytes', value: order.staticExtradata},
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
    hashOrder: (order) => inst.hashOrder_.call(order.exchange, order.maker, order.staticTarget, order.staticExtradata, order.listingTime, order.expirationTime, order.salt),
    hashToSign: (order) => {
      return inst.hashOrder_.call(order.exchange, order.maker, order.staticTarget, order.staticExtradata, order.listingTime, order.expirationTime, order.salt).then(hash => {
        return inst.hashToSign_.call(hash)
      })
    },
    validateOrderParameters: (order) => inst.validateOrderParameters_.call(order.exchange, order.maker, order.staticTarget, order.staticExtradata, order.listingTime, order.expirationTime, order.salt),
    validateOrderAuthorization: (hash, maker, sig) => inst.validateOrderAuthorization_.call(hash, maker, sig.v, sig.r, sig.s),
    approveOrder: (order, inclusion) => inst.approveOrder_(order.exchange, order.maker, order.staticTarget, order.staticExtradata, order.listingTime, order.expirationTime, order.salt, inclusion),
    cancelOrder: (order) => inst.cancelOrder_(order.exchange, order.maker, order.staticTarget, order.staticExtradata, order.listingTime, order.expirationTime, order.salt),
    atomicMatch: (order, sig, call, counterorder, countersig, countercall, metadata) => inst.atomicMatch(
      [order.exchange, order.maker, order.staticTarget, call.target, counterorder.exchange, counterorder.maker, counterorder.staticTarget, countercall.target],
      [order.listingTime, order.expirationTime, order.salt, counterorder.listingTime, counterorder.expirationTime, counterorder.salt],
      order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
      [call.howToCall, sig.v, countercall.howToCall, countersig.v],
      [sig.r, sig.s, countersig.r, countersig.s, metadata]
    )
  }
  obj.sign = (order, account) => {
    return hashOrder(order).then(hash => {
      return web3.eth.sign(hash, account).then(sigBytes => {
        const sig = parseSig(sigBytes)
        return sig
      })
    })
  }
  return obj
}

module.exports = {
  hashOrder,
  hashToSign,
  wrap
}
