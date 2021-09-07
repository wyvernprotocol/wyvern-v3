import { expect, assert } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Interface } from "ethers/lib/utils";
import WyvernStaticABI from "../build/abis/WyvernStatic.json";
import StaticMarketABI from "../build/abis/StaticMarket.json"
import ERC20ABI from "../build/abis/ERC20.json"
import ERC1155ABI from "../build/abis/ERC1155.json"
import AtomicizerABI from "../build/abis/WyvernAtomicizer.json"

import { 
  WyvernRegistry__factory, 
  WyvernRegistry,
  WyvernExchange,
  AuthenticatedProxy__factory,
  AuthenticatedProxy,
  OwnableDelegateProxy__factory,
  OwnableDelegateProxy,
  TestAuthenticatedProxy__factory,
  TestAuthenticatedProxy,
  TestERC20__factory,
  TestERC20,
  TestERC721__factory,
  TestERC721,
  WyvernExchange__factory,
  TestERC1155__factory,
  TestERC1155,
  WyvernStatic,
  WyvernStatic__factory,
  WyvernAtomicizer,
  WyvernAtomicizer__factory,
  StaticMarket,
  StaticMarket__factory,
} from '../build/types';
import { wrap, NULL_SIG, ZERO_BYTES32 } from './auxiliary';
import { BigNumber } from 'ethers';

describe('WyvernRegistry', () => {
  let accounts: SignerWithAddress[];
  let coder = new ethers.utils.AbiCoder();

  let atomicizerInterface = new Interface(AtomicizerABI);
  let staticInterface = new Interface(WyvernStaticABI);
  let marketStaticInterface = new Interface(StaticMarketABI);
  let ERC20Interface = new Interface(ERC20ABI);
  let ERC1155Interface = new Interface(ERC1155ABI);

  let registry: WyvernRegistry;
  let atomicizer: WyvernAtomicizer;
  let wyvernStatic: WyvernStatic;
  let staticMarket: StaticMarket;
  let exchange: WyvernExchange;
  let erc20: TestERC20;
  let erc1155: TestERC1155;
  let wrappedExchange;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const WyvernRegistry = new WyvernRegistry__factory(accounts[0]);
    registry = await WyvernRegistry.deploy();
    await registry.deployed();

    const WyvernAtomicizer = new WyvernAtomicizer__factory(accounts[0]);
    atomicizer = await WyvernAtomicizer.deploy();
    await atomicizer.deployed();

    const WyvernExchange = new WyvernExchange__factory(accounts[0]);
    exchange = await WyvernExchange.deploy(1337, [registry.address], "0x");
    await exchange.deployed();

    const WyvernStaticI = new WyvernStatic__factory(accounts[0]);
    wyvernStatic = await WyvernStaticI.deploy(atomicizer.address);
    await wyvernStatic.deployed();

    const StaticMarket = new StaticMarket__factory(accounts[0]);
    staticMarket = await StaticMarket.deploy();
    await staticMarket.deployed();
		
    await registry.grantInitialAuthentication(exchange.address)

    const TestERC20 = new TestERC20__factory(accounts[0]);
    erc20 = await TestERC20.deploy();
    await erc20.deployed();

    const TestERC1155 = new TestERC1155__factory(accounts[0]);
    erc1155 = await TestERC1155.deploy();
    await erc1155.deployed();

    wrappedExchange = wrap(exchange);
  });

  it('matches erc1155 + erc20 <> erc1155 orders, matched left, real static call', async () => {
    let account_a = accounts[0];
    let account_b = accounts[6];
    let price = 10000;
    let tokenId = 4;
        
    await registry.connect(account_a).registerProxy();
    let proxyA = await registry.proxies(account_a.address);
    assert.equal(true, proxyA.length > 0, 'no proxy address for account a');

    await registry.connect(account_b).registerProxy();
    let proxyB = await registry.proxies(account_b.address);
    assert.equal(true, proxyB.length > 0, 'no proxy address for account b');
    
    await erc20.connect(account_a).approve(proxyA, price)
    await erc1155.connect(account_a).setApprovalForAll(proxyA, true)
    await erc1155.connect(account_b).setApprovalForAll(proxyB, true)
    await erc20.mint(account_a.address, price);
    await erc1155['mint(address,uint256,uint256)'](account_a.address, tokenId, 1);
    await erc1155['mint(address,uint256,uint256)'](account_b.address, tokenId, 1);

    const selectorOne = staticInterface.getSighash('split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)');
    const selectorOneA = staticInterface.getSighash('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
    const selectorOneB = staticInterface.getSighash('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
    const firstEDSelector = staticInterface.getSighash('transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)')
    const firstEDParams = coder.encode(['address', 'uint256'], [erc20.address, price])
    const secondEDSelector = staticInterface.getSighash('transferERC1155Exact(bytes,address[7],uint8,uint256[6],bytes)')
    const secondEDParams = coder.encode(['address', 'uint256', 'uint256'], [erc1155.address, tokenId, 1])
    const extradataOneA = coder.encode(
      ['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
      [[wyvernStatic.address, wyvernStatic.address],
      [(firstEDParams.length - 2) / 2, (secondEDParams.length - 2) / 2],
      [firstEDSelector, secondEDSelector],
      firstEDParams + secondEDParams.slice(2)]
    )
    const bEDParams = coder.encode(['address', 'uint256', 'uint256'], [erc1155.address, tokenId, 1])
    const bEDSelector = staticInterface.getSighash('transferERC1155Exact(bytes,address[7],uint8,uint256[6],bytes)')
    const extradataOneB = coder.encode(
      ['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
      [[wyvernStatic.address], [(bEDParams.length - 2) / 2], [bEDSelector], bEDParams]
    )
    const paramsOneA = coder.encode(
      ['address[2]', 'bytes4[2]', 'bytes', 'bytes'],
      [[wyvernStatic.address, wyvernStatic.address],
      [selectorOneA, selectorOneB],
      extradataOneA, extradataOneB]
    )
    const extradataOne = paramsOneA
    const selectorTwo = "0x837b54ad" // Web3EthAbi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const extradataTwo = '0x'
    const one = {registry: registry.address, maker: account_a.address, staticTarget: wyvernStatic.address, staticSelector: selectorOne, staticExtradata: extradataOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3352'}
    const two = {registry: registry.address, maker: account_b.address, staticTarget: wyvernStatic.address, staticSelector: selectorTwo, staticExtradata: extradataTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3335'}
    const sig = NULL_SIG
    const firstERC20Call = ERC20Interface.encodeFunctionData("transferFrom", [account_a.address, account_b.address, price]);
    const firstERC1155Call = ERC1155Interface.encodeFunctionData("safeTransferFrom", [account_a.address, account_b.address, tokenId, 1, "0x"]) + ZERO_BYTES32.substr(2)
    const firstData = atomicizerInterface.encodeFunctionData("atomicize", [
      [erc20.address, erc1155.address],
      [0, 0],
      [(firstERC20Call.length - 2) / 2, (firstERC1155Call.length - 2) / 2],
      firstERC20Call + firstERC1155Call.slice(2)
    ])
    const secondERC1155Call = ERC1155Interface.encodeFunctionData("safeTransferFrom", [account_b.address, account_a.address, tokenId, 1, "0x"]) + ZERO_BYTES32.substr(2)
    const secondData = atomicizerInterface.encodeFunctionData("atomicize", [
      [erc1155.address],
      [0],
      [(secondERC1155Call.length - 2) / 2],
      secondERC1155Call
    ]);
    
    const firstCall = {target: atomicizer.address, howToCall: 1, data: firstData};
    const secondCall = {target: atomicizer.address, howToCall: 1, data: secondData};
    
    let twoSig = await wrappedExchange.sign(two, account_b);
    await wrappedExchange.atomicMatch(one, sig, firstCall, two, twoSig, secondCall, ZERO_BYTES32);
    let new_balance1 = await erc1155.balanceOf(account_a.address, tokenId);
    let new_balance2 = await erc1155.balanceOf(account_b.address, tokenId);
    assert.isTrue(new_balance1.toNumber() > 0,'Incorrect balance');
    assert.isTrue(new_balance2.toNumber() > 0,'Incorrect balance');
    expect(await erc20.balanceOf(account_b.address)).to.eq(BigNumber.from(price));
  });

  const any_erc1155_for_erc20_test = async (options) => {
    const {
      tokenId,
      buyTokenId,
      sellAmount,
      sellingPrice,
      sellingNumerator,
      buyingPrice,
      buyAmount,
      buyingDenominator,
      erc1155MintAmount,
      erc20MintAmount,
      account_a,
      account_b,
      sender,
      transactions
    } = options

    const txCount = transactions || 1
  
    
    await registry.connect(account_a).registerProxy();
    let proxyA = await registry.proxies(account_a.address);
    assert.equal(true, proxyA.length > 0, 'no proxy address for account a');

    await registry.connect(account_b).registerProxy();
    let proxyB = await registry.proxies(account_b.address);
    assert.equal(true, proxyB.length > 0, 'no proxy address for account b');
		
		await erc1155.connect(account_a).setApprovalForAll(proxyA, true)
    await erc20.connect(account_b).approve(proxyB, erc20MintAmount)
		await erc1155['mint(address,uint256,uint256)'](account_a.address, tokenId, erc1155MintAmount)
    await erc20.mint(account_b.address, erc20MintAmount)

		if (buyTokenId)
			await erc1155['mint(address,uint256,uint256)'](account_a.address, buyTokenId, erc1155MintAmount)

    const selectorOne = marketStaticInterface.getSighash('anyERC1155ForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const selectorTwo = marketStaticInterface.getSighash('anyERC20ForERC1155(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
        
		const paramsOne = coder.encode(
			['address[2]', 'uint256[3]'],
			[[erc1155.address, erc20.address], [tokenId, sellingNumerator || 1, sellingPrice]]
			) 
	
		const paramsTwo = coder.encode(
			['address[2]', 'uint256[3]'],
			[[erc20.address, erc1155.address], [buyTokenId || tokenId, buyingPrice, buyingDenominator || 1]]
			)

    const one = {registry: registry.address, maker: account_a.address, staticTarget: staticMarket.address, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: (sellingNumerator || 1) * sellAmount, listingTime: '0', expirationTime: '10000000000', salt: '11'}
    const two = {registry: registry.address, maker: account_b.address, staticTarget: staticMarket.address, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice*buyAmount, listingTime: '0', expirationTime: '10000000000', salt: '12'}

		const firstData = ERC1155Interface.encodeFunctionData("safeTransferFrom", [account_a.address, account_b.address, tokenId, sellingNumerator || buyAmount, "0x"]) + ZERO_BYTES32.substr(2)
		const secondData = ERC20Interface.encodeFunctionData("transferFrom", [account_b.address, account_a.address, buyAmount*buyingPrice]);
		
    const firstCall = {target: erc1155.address, howToCall: 0, data: firstData}
    const secondCall = {target: erc20.address, howToCall: 0, data: secondData}

		let sigOne = await wrappedExchange.sign(one, account_a);
    
    for (var i = 0 ; i < txCount ; ++i)
      {
      let sigTwo = await wrappedExchange.sign(two, account_b);
      await wrappedExchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32, {from: sender || account_a})
      two.salt = two.salt + 1
      }
    
    let account_a_erc20_balance = await erc20.balanceOf(account_a.address)
    let account_b_erc1155_balance = await erc1155.balanceOf(account_b.address, tokenId)
    assert.equal(account_a_erc20_balance.toNumber(), sellingPrice*buyAmount*txCount,'Incorrect ERC20 balance')
    assert.equal(account_b_erc1155_balance.toNumber(), sellingNumerator || (buyAmount*txCount),'Incorrect ERC1155 balance')
  }


  it('asdf', async () => {
    const nftAmount = 3
		const buyAmount = 1
		const price = 10000
		const transactions = 3

		return any_erc1155_for_erc20_test({
			tokenId: 5,
			sellAmount: nftAmount,
			sellingPrice: price,
			buyingPrice: price,
			buyAmount,
			erc1155MintAmount: nftAmount,
			erc20MintAmount: buyAmount*price*transactions,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1],
			transactions
			})
  });
});