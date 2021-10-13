export type WyvernSystem = {
  WyvernRegistry: string;
  WyvernExchange: string;
  StaticMarket: string;
}

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

export type Sig = {
  v: number;
  r: string;
  s: string;
}

export type Call = {
  target: string;
  howToCall: number;
  data: string
}

export type EIP712Domain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}