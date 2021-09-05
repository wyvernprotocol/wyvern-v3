import { expect, assert} from 'chai';
import { ethers } from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import { eip712Domain, structHash, signHash } from './eip712';
import { defaultAccounts } from '@ethereum-waffle/provider';

const url = 'http://localhost:8545';
const jsonRPCProvider = new ethers.providers.JsonRpcProvider(url);
const decoder = new ethers.utils.AbiCoder();
const signer = jsonRPCProvider.getSigner(0);

export const increaseTime = seconds => {
  return new Promise(resolve =>
    jsonRPCProvider.send('evm_increaseTime', [seconds])
    )
  }

const eip712Order = {
  name: 'Order',
  fields: [
    { name: 'registry', type: 'address' },
    { name: 'maker', type: 'address' },
    { name: 'staticTarget', type: 'address' },
    { name: 'staticSelector', type: 'bytes4' },
    { name: 'staticExtradata', type: 'bytes' },
    { name: 'maximumFill', type: 'uint256' },
    { name: 'listingTime', type: 'uint256' },
    { name: 'expirationTime', type: 'uint256' },
    { name: 'salt', type: 'uint256' }
  ]
}

export const hashOrder = (order) => {
  return '0x' + structHash(eip712Order.name, eip712Order.fields, order).toString('hex')
}

const structToSign = (order, exchange) => {
  return {
    name: eip712Order.name,
    fields: eip712Order.fields,
    domain: {
      name: 'Wyvern Exchange',
      version: '3.1',
      chainId: 50,
      verifyingContract: exchange
    },
    data: order
  }
}

export const hashToSign = (order, exchange) => {
  return '0x' + signHash(structToSign(order, exchange)).toString('hex')
}

const parseSig = (bytes) => {
  bytes = bytes.substr(2);
  const r = '0x' + bytes.slice(0, 64);
  const s = '0x' + bytes.slice(64, 128);
  const v = parseInt('0x' + bytes.slice(128, 130), 16);
  let suffix;
  return {v, r, s, suffix}
}

export const wrap = (inst) => {
  var obj = {
    inst: inst,
    hashOrder: (order) => inst.hashOrder_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
    hashToSign: (order) => {
      return inst.hashOrder_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt).then(hash => {
        return inst.hashToSign_.call(hash)
      })
    },
    validateOrderParameters: (order) => inst.validateOrderParameters_.call(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt),
    validateOrderAuthorization: (hash, maker, sig, misc) => inst.validateOrderAuthorization_.call(hash, maker, decoder.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''), misc),
    approveOrderHash: (hash) => inst.approveOrderHash_(hash),
    approveOrder: (order, inclusion, misc) => inst.approveOrder_(order.registry, order.maker, order.staticTarget, order.staticSelector, order.staticExtradata, order.maximumFill, order.listingTime, order.expirationTime, order.salt, inclusion, misc),
    setOrderFill: (order, fill) => inst.setOrderFill_(hashOrder(order), fill),
    atomicMatch: (order, sig, call, counterorder, countersig, countercall, metadata) => inst.atomicMatch_(
      [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime, order.salt, call.target,
        counterorder.registry, counterorder.maker, counterorder.staticTarget, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt, countercall.target],
      [order.staticSelector, counterorder.staticSelector],
      order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
      [call.howToCall, countercall.howToCall],
      metadata,
      decoder.encode(['bytes', 'bytes'], [
        decoder.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''),
        decoder.encode(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s]) + (countersig.suffix || '')
      ])
    ),
    atomicMatchWith: (order, sig, call, counterorder, countersig, countercall, metadata, misc) => inst.atomicMatch_(
      [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime, order.salt, call.target,
        counterorder.registry, counterorder.maker, counterorder.staticTarget, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt, countercall.target],
      [order.staticSelector, counterorder.staticSelector],
      order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
      [call.howToCall, countercall.howToCall],
      metadata,
      decoder.encode(['bytes', 'bytes'], [
        decoder.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]) + (sig.suffix || ''),
        decoder.encode(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s]) + (countersig.suffix || '')
      ]),
      misc
    ),
    sign: (order, account) => {
      const { domain } = structToSign(order, inst.address);
      const types = { Order: eip712Order.fields };
      return account._signTypedData(
        domain,
        types,
        order
      ).then(sigBytes => {
        const sig = parseSig(sigBytes)
        return sig
      })
    },
    personalSign: (order, account) => {
      const calculatedHashToSign = hashToSign(order, inst.address)
      return signer.signMessage(calculatedHashToSign).then(sigBytes => {
        let sig = parseSig(sigBytes)
        sig.v += 27
        sig.suffix = '03' // EthSign suffix like 0xProtocol
        return sig
      })
    }
  }
  return obj
}

export const randomUint = () => {
  return Math.floor(Math.random() * 1e10)
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const NULL_SIG = {v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32}
export const CHAIN_ID = 50
