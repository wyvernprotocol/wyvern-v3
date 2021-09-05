import { expect, assert } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Interface } from "ethers/lib/utils";
import StaticUtilABI from "../build/abis/StaticUtil.json";
import StaticERC20ABI from "../build/abis/StaticERC20.json";
import StaticERC1155ABI from "../build/abis/StaticERC1155.json"
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
  TestERC1155
} from '../build/types';
import { NULL_SIG } from './auxiliary';

describe('WyvernRegistry', () => {
  let accounts: SignerWithAddress[];
  let coder = new ethers.utils.AbiCoder();
  let staticInterface = new Interface(StaticUtilABI);
  let staticERC20Interface = new Interface(StaticERC20ABI);
  let StaticERC1155Interface = new Interface(StaticERC1155ABI);
  let registry: WyvernRegistry;
  let atomicizer;
  let statici;
  let exchange: WyvernExchange;
  let erc20: TestERC20;
  let erc1155: TestERC1155;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const WyvernRegistry = new WyvernRegistry__factory(accounts[0]);
    registry = await WyvernRegistry.deploy();
    await registry.deployed();

    const WyvernExchange = new WyvernExchange__factory(accounts[0]);
    exchange = await WyvernExchange.deploy(1337, [registry.address], "0x00");
    await exchange.deployed();

    const TestERC20 = new TestERC20__factory(accounts[0]);
    erc20 = await TestERC20.deploy();
    await erc20.deployed();

    const TestERC1155 = new TestERC1155__factory(accounts[0]);
    erc1155 = await TestERC1155.deploy();
    await erc1155.deployed();

    // const atomicizerc = new web3.eth.Contract(abi, atomicizer.address)
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

    await erc20.mint(account_a.address, price);
    await erc1155['mint(address,uint256,uint256)'](account_a.address, tokenId, 1);
    await erc1155['mint(address,uint256,uint256)'](account_b.address, tokenId, 1);

    await erc20.connect(account_a).approve(proxyA, price)
    await erc1155.connect(account_a).setApprovalForAll(proxyA, true)
    await erc1155.connect(account_b).setApprovalForAll(proxyB, true)
    const selectorOne = staticInterface.getSighash('split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)');
    const selectorOneA = staticInterface.getSighash('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
    const selectorOneB = staticInterface.getSighash('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
    const firstEDSelector = staticERC20Interface.getSighash('transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)')
    const firstEDParams = coder.encode(['address', 'uint256'], [erc20.address, price])
    const secondEDSelector = StaticERC1155Interface.getSighash('transferERC1155Exact(bytes,address[7],uint8,uint256[6],bytes)')
    const secondEDParams = coder.encode(['address', 'uint256', 'uint256'], [erc1155.address, tokenId, 1])
    const extradataOneA = coder.encode(
      ['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
      [[statici.address, statici.address],
      [(firstEDParams.length - 2) / 2, (secondEDParams.length - 2) / 2],
      [firstEDSelector, secondEDSelector],
      firstEDParams + secondEDParams.slice(2)]
    )
    const bEDParams = coder.encode(['address', 'uint256', 'uint256'], [erc1155.address, tokenId, 1])
    const bEDSelector = StaticERC1155Interface.getSighash('transferERC1155Exact(bytes,address[7],uint8,uint256[6],bytes)')
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
    const selectorTwo = "0x00000000" // Web3EthAbi.encodeFunctionSignature('any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
    const extradataTwo = '0x'
    const one = {registry: registry.address, maker: account_a, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: extradataOne, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3352'}
    const two = {registry: registry.address, maker: account_b, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: extradataTwo, maximumFill: '1', listingTime: '0', expirationTime: '10000000000', salt: '3335'}
    // const sig = NULL_SIG
    // const firstERC20Call = erc20c.methods.transferFrom(account_a, account_b, price).encodeABI()
    // const firstERC1155Call = erc1155c.methods.safeTransferFrom(account_a, account_b, tokenId, 1, "0x").encodeABI() + ZERO_BYTES32.substr(2)
    // const firstData = atomicizerc.methods.atomicize(
    //   [erc20.address, erc1155.address],
    //   [0, 0],
    //   [(firstERC20Call.length - 2) / 2, (firstERC1155Call.length - 2) / 2],
    //   firstERC20Call + firstERC1155Call.slice(2)
    // ).encodeABI()
    
    // const secondERC1155Call = erc1155c.methods.safeTransferFrom(account_b, account_a, tokenId, 1, "0x").encodeABI() + ZERO_BYTES32.substr(2)
    // const secondData = atomicizerc.methods.atomicize(
    //   [erc1155.address],
    //   [0],
    //   [(secondERC1155Call.length - 2) / 2],
    //   secondERC1155Call
    // ).encodeABI()
    
    // const firstCall = {target: atomicizer.address, howToCall: 1, data: firstData}
    // const secondCall = {target: atomicizer.address, howToCall: 1, data: secondData}
    
    // let twoSig = await exchange.sign(two, account_b)
    // await exchange.atomicMatch(one, sig, firstCall, two, twoSig, secondCall, ZERO_BYTES32)
    // let [new_balance1,new_balance2] = await Promise.all([erc1155.balanceOf(account_a, tokenId),erc1155.balanceOf(account_b, tokenId)])
    // assert.isTrue(new_balance1.toNumber() > 0,'Incorrect balance')
    // assert.isTrue(new_balance2.toNumber() > 0,'Incorrect balance')
    // assert.equal(await erc20.balanceOf(account_b), price, 'Incorrect balance')
    })

})