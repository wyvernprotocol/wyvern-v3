import { expect, assert } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Interface } from "ethers/lib/utils";
import WyvernStaticABI from "../build/abis/WyvernStatic.json"
import StaticUtilABI from "../build/abis/StaticUtil.json";
import StaticERC20ABI from "../build/abis/StaticERC20.json";
import StaticERC1155ABI from "../build/abis/StaticERC1155.json";
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
} from '../build/types';
import { wrap, NULL_SIG, ZERO_ADDRESS, ZERO_BYTES32 } from './auxiliary';
import { BigNumber } from 'ethers';

describe('WyvernRegistry', () => {
  let accounts: SignerWithAddress[];
  let coder = new ethers.utils.AbiCoder();

  let atomicizerInterface = new Interface(AtomicizerABI);
  let staticInterface = new Interface(WyvernStaticABI);
  let ERC20Interface = new Interface(ERC20ABI);
  let ERC1155Interface = new Interface(ERC1155ABI);

  let registry: WyvernRegistry;
  let atomicizer: WyvernAtomicizer;
  let statici: WyvernStatic;
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
    exchange = await WyvernExchange.deploy(1337, [registry.address], "0x00");
    await exchange.deployed();

    const StaticI = new WyvernStatic__factory(accounts[0]);
    statici = await StaticI.deploy(atomicizer.address);
    await statici.deployed();
		
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
      [[statici.address, statici.address],
      [(firstEDParams.length - 2) / 2, (secondEDParams.length - 2) / 2],
      [firstEDSelector, secondEDSelector],
      firstEDParams + secondEDParams.slice(2)]
    )
    const bEDParams = coder.encode(['address', 'uint256', 'uint256'], [erc1155.address, tokenId, 1])
    const bEDSelector = staticInterface.getSighash('transferERC1155Exact(bytes,address[7],uint8,uint256[6],bytes)')
    const extradataOneB = coder.encode(
      ['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
      [[statici.address], [(bEDParams.length - 2) / 2], [bEDSelector], bEDParams]
    )
    const paramsOneA = coder.encode(
      ['address[2]', 'bytes4[2]', 'bytes', 'bytes'],
      [[statici.address, statici.address],
      [selectorOneA, selectorOneB],
      extradataOneA, extradataOneB]
    )
    const extradataOne = paramsOneA
    const selectorTwo = "0x837b54ad" // Web3EthAbi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const extradataTwo = '0x'
    const one = {registry: registry.address, maker: account_a.address, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: extradataOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3352'}
    const two = {registry: registry.address, maker: account_b.address, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: extradataTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3335'}
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
});