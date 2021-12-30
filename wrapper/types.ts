/**
 * Addresses needed to use Wyvern
 */
export type WyvernSystem = {
  WyvernRegistry: string;
  WyvernExchange: string;
  StaticMarket: string;
}

/**
 * @param registry address of the WyvernRegistry.sol contract
 * @param maker address of the order creator
 * @param staticTarget address of the Staticmarket.sol (though can be any static contract)
 * @param staticSelector 4 byte function selector that indicates the function selector on the `staticTarget`
 * @param staticExtradata abi-encoded function parameters for the function called on the staticTarget
 * @param maximumFill number of times the order can be filled
 * @param listingTime unix timestamp in seconds
 * @param expirationTime unix timestamp in seconds
 * @param salt any number
 */
export type Order = {
  registry: string;
  maker: string;
  staticTarget: string;
  staticSelector: string;
  staticExtradata: string;
  maximumFill: string;
  listingTime: number;
  expirationTime: string;
  salt: number;
}

/**
 * split ECDSA signature
 */
export type Sig = {
  v: number;
  r: string;
  s: string;
}

/**
 * @param target address of the contract that will be called
 * @param howToCall enum { Call | DelegateCall }, which are two low level ways of calling other contracts on the EVM.
 * @param data abi-encoded byte string of call data
 */
export type Call = {
  target: string;
  howToCall: number;
  data: string
}

/**
 * see https://eips.ethereum.org/EIPS/eip-712 for more detailsa
 */
export type EIP712Domain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}