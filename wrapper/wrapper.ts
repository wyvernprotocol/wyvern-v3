import { ethers, Signer, BigNumberish, BigNumber, Transaction } from 'ethers';
import { Interface } from "ethers/lib/utils";
import ERC20ABI from "../dist/build/abis/ERC20.json";
import ERC721ABI from "../dist/build/abis/ERC721.json";
import ERC1155ABI from "../dist/build/abis/ERC1155.json";
import {
  ZERO_BYTES32,
  ZERO_ADDRESS,
  eip712Order,
  anyERC1155ForERC20Selector,
  anyERC20ForERC1155Selector,
  anyERC20ForERC20Selector,
  ERC721ForERC20Selector,
  ERC20ForERC721Selector,
  tokenTypes,
  zero,
} from './constants';
import { 
  WyvernExchange,
  WyvernExchange__factory,
  WyvernRegistry,
  WyvernRegistry__factory,
  OwnableDelegateProxy,
  OwnableDelegateProxy__factory,
  ERC20__factory,
  ERC721__factory,
  ERC1155__factory,
} from '../dist/build/types';
import addressesByChainId from './addresses.json';

const ERC20Interface = new Interface(ERC20ABI);
const ERC721Interface = new Interface(ERC721ABI);
const ERC1155Interface = new Interface(ERC1155ABI);

type WyvernSystem = {
  WyvernRegistry: string;
  WyvernExchange: string;
  StaticMarket: string;
}

type Order = {
  registry: string;
  maker: string;
  staticTarget: string;
  staticSelector: string;
  staticExtradata: string;
  maximumFill: BigNumberish;
  listingTime: number;
  expirationTime: string;
  salt: number;
}

type Sig = {
  v: number;
  r: string;
  s: string;
}

type Call = {
  target: string;
  howToCall: number;
  data: string
}

type EIP712Domain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export class WrappedExchange {
  public exchange: WyvernExchange;
  public registry: WyvernRegistry;
  public addresses: WyvernSystem;
  public signer: any; // Signer but also implements _signTypedData
  public chainId: number;
  public EIP712Domain: EIP712Domain;
  
  constructor(signer: Signer, chainId: number) {
    this.signer = signer;
    this.chainId = chainId;
    this.addresses = addressesByChainId[chainId];
    this.exchange = WyvernExchange__factory.connect(this.addresses.WyvernExchange, signer);
    this.registry = WyvernRegistry__factory.connect(this.addresses.WyvernRegistry, signer);
    this.EIP712Domain ={ name: 'Wyvern Exchange', version: '3.1', chainId, verifyingContract: this.exchange.address };
  }

  private async sign(order: Order) {
    // see https://docs.ethers.io/v5/api/signer/#Signer-signTypedData
    return this.signer._signTypedData(
      this.EIP712Domain,
      { Order: eip712Order.fields },
      order
    ).then((sigBytes: string) => {
      sigBytes = sigBytes.substr(2);
      const r = '0x' + sigBytes.slice(0, 64);
      const s = '0x' + sigBytes.slice(64, 128);
      const v = parseInt('0x' + sigBytes.slice(128, 130), 16);
      return { v, r, s };
    });
  }

  private async atomicMatch(order: Order, sig: Sig, call: Call, counterorder: Order, countersig: Sig, countercall: Call, metadata: string) {
    return await this.exchange.atomicMatch_(
      [order.registry, order.maker, order.staticTarget, order.maximumFill, order.listingTime, order.expirationTime, order.salt, call.target,
        counterorder.registry, counterorder.maker, counterorder.staticTarget, counterorder.maximumFill, counterorder.listingTime, counterorder.expirationTime, counterorder.salt, countercall.target],
      [order.staticSelector, counterorder.staticSelector],
      order.staticExtradata, call.data, counterorder.staticExtradata, countercall.data,
      [call.howToCall, countercall.howToCall],
      metadata,
      ethers.utils.defaultAbiCoder.encode(['bytes', 'bytes'], [
        ethers.utils.defaultAbiCoder.encode(['uint8', 'bytes32', 'bytes32'], [sig.v, sig.r, sig.s]),
        ethers.utils.defaultAbiCoder.encode(['uint8', 'bytes32', 'bytes32'], [countersig.v, countersig.r, countersig.s])
      ])
    );
  }

  private generateSalt(): number {
    return Math.floor(Math.random() * 10000);
  }

  private async getBlockTimestamp(): Promise<number> {
    const blockNumber = await this.signer.provider.getBlockNumber();
    return (await this.signer.provider.getBlock(blockNumber)).timestamp;
  }

  public async offerERC721ForERC20(
    erc721Address: string,
    erc721Id: BigNumberish,
    erc20Address: string,
    erc20SellPrice: BigNumberish,
    expirationTime: string
  ) : Promise<{ order: Order, signature: Sig }> {
    const maker = await this.signer.getAddress();
    const staticExtradata = ethers.utils.defaultAbiCoder.encode(
      ['address[2]', 'uint256[2]'],
      [
        [erc721Address, erc20Address],
        [erc721Id, erc20SellPrice]
      ]
    );
    const order = {
      registry: this.addresses.WyvernRegistry,
      maker,
      staticTarget: this.addresses.StaticMarket,
      staticSelector: ERC721ForERC20Selector,
      staticExtradata,
      maximumFill: 1,
      listingTime: await this.getBlockTimestamp(),
      expirationTime,
      salt: this.generateSalt()
    };

    const signature = await this.sign(order);

    return { order, signature };
  }
  
  public async offerERC20ForERC721(
    erc721Address: string,
    erc721Id: BigNumberish,
    erc20Address: string,
    erc20BuyPrice: BigNumberish,
    expirationTime: string
  ) : Promise<{ order: Order, signature: Sig }> {
    const maker = await this.signer.getAddress();
    const staticExtradata = ethers.utils.defaultAbiCoder.encode(
      ['address[2]', 'uint256[2]'],
      [
        [erc20Address, erc721Address],
        [erc721Id, erc20BuyPrice]
      ]
    );
    const order = {
      registry: this.addresses.WyvernRegistry,
      maker,
      staticTarget: this.addresses.StaticMarket,
      staticSelector: ERC20ForERC721Selector,
      staticExtradata,
      maximumFill: erc20BuyPrice,
      listingTime: await this.getBlockTimestamp(),
      expirationTime: expirationTime,
      salt: this.generateSalt()
    };

    const signature = await this.sign(order);

    return {
      order,
      signature,
    };
  }
  
  public async matchERC721ForERC20(
    sellOrder: Order,
    sellSig: Sig,
    buyOrder: Order,
    buySig: Sig
  ) : Promise<Transaction> {
    const [[erc721Address, erc20Address], [tokenId, buyingPrice]] = ethers.utils.defaultAbiCoder.decode(['address[2]', 'uint256[2]'], sellOrder.staticExtradata);
    const [[erc20AddressOther, erc721AddressOther], [tokenIdOther, buyingPriceOther]] = ethers.utils.defaultAbiCoder.decode(['address[2]', 'uint256[2]'], buyOrder.staticExtradata);
    
    if (erc721Address != erc721AddressOther) throw new Error('ERC721 Addresses don\'t match on orders');
    if (erc20Address != erc20AddressOther) throw new Error('ERC20 Addresses don\'t match on orders');
    if (!tokenId.eq(tokenIdOther)) throw new Error('ERC721 token IDs don\'t match on orders');
    if (!buyingPrice.eq(buyingPriceOther)) throw new Error('ERC20 buying prices don\'t match on orders');

    const firstData = ERC721Interface.encodeFunctionData("transferFrom", [sellOrder.maker, buyOrder.maker, tokenId]); // this might be weird bc passing in BigNumbers...
    const secondData = ERC20Interface.encodeFunctionData("transferFrom", [buyOrder.maker, sellOrder.maker, buyingPrice]);
    
    const firstCall = {target: erc721Address, howToCall: 0, data: firstData};
    const secondCall = {target: erc20Address, howToCall: 0, data: secondData};

    return await this.atomicMatch(sellOrder, sellSig, firstCall, buyOrder, buySig, secondCall, ZERO_BYTES32);
  }

  public async offerERC1155ForERC20(
    erc1155Address: string,
    erc1155Id: BigNumberish,
    erc1155SellAmount: BigNumberish,
    erc1155SellNumerator: BigNumberish,
    erc20Address: string,
    erc20SellPrice: BigNumberish,
    expirationTime: string
  ) : Promise<{ order: Order, signature: Sig }> {
    
    const maker = await this.signer.getAddress();
    const staticExtradata = ethers.utils.defaultAbiCoder.encode(
      ['address[2]', 'uint256[3]'],
      [
        [erc1155Address, erc20Address],
        [erc1155Id, erc1155SellNumerator, erc20SellPrice]
      ]
    );
    const order = {
      registry: this.addresses.WyvernRegistry,
      maker,
      staticTarget: this.addresses.StaticMarket,
      staticSelector: anyERC1155ForERC20Selector,
      staticExtradata,
      maximumFill: BigNumber.from(erc1155SellNumerator).mul(BigNumber.from(erc1155SellAmount)),
      listingTime: await this.getBlockTimestamp(),
      expirationTime: expirationTime,
      salt: this.generateSalt()
    };

    const signature = await this.sign(order);
    
    return { order, signature };
  }

  public async offerERC20ForERC1155(
    erc1155Address: string,
    erc1155Id: BigNumberish,
    erc1155BuyAmount: BigNumberish,
    erc1155BuyDenominator: BigNumberish,
    erc20Address: string,
    erc20BuyPrice: BigNumberish,
    expirationTime: string
  ) : Promise<{ order: Order, signature: Sig }> {
    const maker = await this.signer.getAddress();
    const staticExtradata = ethers.utils.defaultAbiCoder.encode(
      ['address[2]', 'uint256[3]'],
      [
        [erc20Address, erc1155Address],
        [erc1155Id, erc20BuyPrice, erc1155BuyDenominator]
      ]
    );
    const order = {
      registry: this.addresses.WyvernRegistry,
      maker,
      staticTarget: this.addresses.StaticMarket,
      staticSelector: anyERC20ForERC1155Selector,
      staticExtradata,
      maximumFill: BigNumber.from(erc20BuyPrice).mul(BigNumber.from(erc1155BuyAmount)),
      listingTime: await this.getBlockTimestamp(),
      expirationTime,
      salt: this.generateSalt()
    };

    const signature = await this.sign(order);

    return {
      order,
      signature,
    };
  }

  public async matchERC1155ForERC20(
    sellOrder: Order,
    sellSig: Sig,
    buyOrder: Order,
    buySig: Sig,
    buyAmount: BigNumberish
  ) : Promise<Transaction> {
    const [[erc1155Address, erc20Address], [tokenId, erc1155Numerator, erc20SellPrice]] = ethers.utils.defaultAbiCoder.decode(['address[2]', 'uint256[3]'], sellOrder.staticExtradata);
    const [[erc20AddressOther, erc1155AddressOther], [tokenIdOther, erc20BuyPrice, erc1155Denominator]] = ethers.utils.defaultAbiCoder.decode(['address[2]', 'uint256[3]'], buyOrder.staticExtradata);
    
    if (erc1155Address != erc1155AddressOther) throw new Error('ERC1155 Addresses don\'t match on orders');
    if (erc20Address != erc20AddressOther) throw new Error('ERC20 Addresses don\'t match on orders');
    if (!tokenId.eq(tokenIdOther)) throw new Error('ERC1155 token IDs don\'t match on orders');
    if (!erc20SellPrice.eq(erc20BuyPrice)) throw new Error('ERC20 buying prices don\'t match on orders');
    if (!erc1155Numerator.eq(erc1155Denominator)) throw new Error('ERC1155 Numerator and Denominator don\'t match');
  
    const firstData = ERC1155Interface.encodeFunctionData("safeTransferFrom", [sellOrder.maker, buyOrder.maker, tokenId, buyAmount, "0x"]) + ZERO_BYTES32.substr(2);
    const secondData = ERC20Interface.encodeFunctionData("transferFrom", [buyOrder.maker, sellOrder.maker, buyOrder.maximumFill]);
    
    const firstCall = { target: erc1155Address, howToCall: 0, data: firstData };
    const secondCall = { target: erc20Address, howToCall: 0, data: secondData };

    return await this.atomicMatch(sellOrder, sellSig, firstCall, buyOrder, buySig, secondCall, ZERO_BYTES32);
  }

  public async offerERC20ForERC20(
    erc20SellerAddress: string,
    sellingPrice: BigNumberish,
    sellAmount: BigNumberish,
    erc20BuyerAddress: string,
    buyingPrice: BigNumberish,
    expirationTime: string
  ) : Promise<{ order: Order, signature: Sig }> {
    const maker = await this.signer.getAddress();
    const staticExtradata = ethers.utils.defaultAbiCoder.encode(
      ['address[2]', 'uint256[2]'],
      [
        [erc20SellerAddress, erc20BuyerAddress],
        [sellingPrice, buyingPrice]
      ]
    );

    const order = {
      registry: this.addresses.WyvernRegistry,
      maker,
      staticTarget: this.addresses.StaticMarket,
      staticSelector: anyERC20ForERC20Selector,
      staticExtradata,
      maximumFill: sellAmount,
      listingTime: await this.getBlockTimestamp(),
      expirationTime,
      salt: this.generateSalt()
    };

    const signature = await this.sign(order);

    return { order, signature };
  }

  public async matchERC20ForERC20(
    sellOrder: Order,
    sellSig: Sig,
    buyOrder: Order,
    buySig: Sig,
    buyAmount: BigNumberish
  ) : Promise<Transaction> {
    const [[erc20SellerAddress, erc20BuyerAddress], [sellingPrice, buyingPrice]] = ethers.utils.defaultAbiCoder.decode(['address[2]', 'uint256[2]'], sellOrder.staticExtradata);
    const [[erc20BuyerAddressOther, erc20SellerAddressOther], [buyingPriceOther, sellingPriceOther]] = ethers.utils.defaultAbiCoder.decode(['address[2]', 'uint256[2]'], buyOrder.staticExtradata);
    
    if (erc20SellerAddress != erc20SellerAddressOther) throw new Error('ERC20 Addresses don\'t match on orders');
    if (erc20BuyerAddress != erc20BuyerAddressOther) throw new Error('ERC20 Addresses don\'t match on orders');
    if (!sellingPrice.eq(sellingPriceOther)) throw new Error('ERC20 selling prices don\'t match on orders');
    if (!buyingPrice.eq(buyingPriceOther)) throw new Error('ERC20 buying prices don\'t match on orders');

    const firstData = ERC20Interface.encodeFunctionData("transferFrom", [sellOrder.maker, buyOrder.maker, buyAmount]);
    const secondData = ERC20Interface.encodeFunctionData("transferFrom", [buyOrder.maker, sellOrder.maker, BigNumber.from(buyAmount).mul(BigNumber.from(sellingPrice))]);
    
    const firstCall = {target: erc20SellerAddress, howToCall: 0, data: firstData};
    const secondCall = {target: erc20BuyerAddress, howToCall: 0, data: secondData};

    return await this.atomicMatch(sellOrder, sellSig, firstCall, buyOrder, buySig, secondCall, ZERO_BYTES32);
  }

  public async getOrderHash(order: Order): Promise<string> {
    return this.exchange.hashOrder_(
      order.registry,
      order.maker,
      order.staticTarget,
      order.staticSelector,
      order.staticExtradata,
      order.maximumFill,
      order.listingTime,
      order.expirationTime,
      order.salt
    );
  }

  public async getOrRegisterProxy(): Promise<OwnableDelegateProxy> {
    const proxy = await this.registry.proxies(await this.signer.getAddress());
    if (proxy !== ZERO_ADDRESS) {
      return OwnableDelegateProxy__factory.connect(proxy, this.signer);
    }
    const tx = await this.registry.registerProxy();
    tx.wait();
    return this.getOrRegisterProxy();
  }

  public async getOrIncreaseApproval(tokenType: string, tokenAddress: string, amount?: BigNumber): Promise<boolean | BigNumber> {
    const proxy = await this.registry.proxies(await this.signer.getAddress());
    if (proxy === ZERO_ADDRESS) throw new Error('Signer does not have a proxy registered');
    
    switch (tokenType) {
    case tokenTypes.ERC20: {
      const contract = ERC20__factory.connect(tokenAddress, this.signer);
      const allowance = await contract.allowance(this.signer.address, proxy);
      if ((amount && allowance.gt(amount)) || allowance.gt(zero) ) return allowance;
      (await contract.approve(proxy, amount)).wait();
      return this.getOrIncreaseApproval(tokenType, tokenAddress, amount);
    } case tokenTypes.ERC721: {
      const contract = ERC721__factory.connect(tokenAddress, this.signer);
      const approval = await contract.isApprovedForAll(this.signer.address, proxy);
      if (approval) return approval;
      (await contract.setApprovalForAll(proxy, true)).wait();
      return this.getOrIncreaseApproval(tokenType, tokenAddress);
    } case tokenTypes.ERC1155: {
      const contract = ERC1155__factory.connect(tokenAddress, this.signer);
      const approval = await contract.isApprovedForAll(this.signer.address, proxy);
      if (approval) return approval;
      (await contract.setApprovalForAll(proxy, true)).wait();
      return this.getOrIncreaseApproval(tokenType, tokenAddress);
    } default:
      throw new Error('This method only works for ERC20, 721, or 1155 tokens');
    }
  }
}
