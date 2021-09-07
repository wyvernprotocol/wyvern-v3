import chai from 'chai';
import asPromised from 'chai-as-promised';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Interface } from "ethers/lib/utils";
import StaticMarketABI from "../build/abis/StaticMarket.json"
import ERC20ABI from "../build/abis/ERC20.json"
import ERC721ABI from "../build/abis/ERC721.json"
import ERC1155ABI from "../build/abis/ERC1155.json"
import AtomicizerABI from "../build/abis/WyvernAtomicizer.json"

import { 
  WyvernRegistry__factory, 
  WyvernRegistry,
  WyvernExchange,
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
import { wrap, ZERO_BYTES32 } from './auxiliary';

chai.use(asPromised);

describe('WyvernRegistry', () => {
  let accounts: SignerWithAddress[];
  let coder = new ethers.utils.AbiCoder();

  let marketStaticInterface = new Interface(StaticMarketABI);
  let ERC20Interface = new Interface(ERC20ABI);
	let ERC721Interface = new Interface(ERC721ABI);
  let ERC1155Interface = new Interface(ERC1155ABI);

  let registry: WyvernRegistry;
  let atomicizer: WyvernAtomicizer;
  let wyvernStatic: WyvernStatic;
  let staticMarket: StaticMarket;
  let exchange: WyvernExchange;
  let erc20: TestERC20;
	let erc721: TestERC721;
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

		const TestERC721 = new TestERC721__factory(accounts[0]);
    erc721 = await TestERC721.deploy();
    await erc721.deployed();

    const TestERC1155 = new TestERC1155__factory(accounts[0]);
    erc1155 = await TestERC1155.deploy();
    await erc1155.deployed();

    wrappedExchange = wrap(exchange);
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
    chai.expect(true).to.eq(proxyA.length > 0);

    await registry.connect(account_b).registerProxy();
    let proxyB = await registry.proxies(account_b.address);
    chai.expect(true).to.eq(proxyB.length > 0);
		
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
    chai.expect(account_a_erc20_balance.toNumber()).to.eq(sellingPrice*buyAmount*txCount);
    chai.expect(account_b_erc1155_balance.toNumber()).to.eq(sellingNumerator || (buyAmount*txCount))
  }

	it('StaticMarket: matches erc1155 <> erc20 order, multiple fills in 1 transaction',async () =>
		{
		const amount = 3
		const price = 10000

		return any_erc1155_for_erc20_test({
			tokenId: 5,
			sellAmount: amount,
			sellingPrice: price,
			buyingPrice: price,
			buyAmount: amount,
			erc1155MintAmount: amount,
			erc20MintAmount: amount*price,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1]
			})
		})

	it('StaticMarket: matches erc1155 <> erc20 order, multiple fills in multiple transactions',async () =>
		{
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
		})

	it('StaticMarket: matches erc1155 <> erc20 order, allows any partial fill',async () =>
		{
		const nftAmount = 30
		const buyAmount = 4
		const price = 10000

		return any_erc1155_for_erc20_test({
			tokenId: 5,
			sellAmount: nftAmount,
			sellingPrice: price,
			buyingPrice: price,
			buyAmount,
			erc1155MintAmount: nftAmount,
			erc20MintAmount: buyAmount*price,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1]
			})
		})

	it('StaticMarket: matches erc1155 <> erc20 order with any matching ratio',async () =>
		{
		const lot = 83974
		const price = 972

		return any_erc1155_for_erc20_test({
			tokenId: 5,
			sellAmount: 6,
			sellingNumerator: lot,
			sellingPrice: price,
			buyingPrice: price,
			buyingDenominator: lot,
			buyAmount: 1,
			erc1155MintAmount: lot,
			erc20MintAmount: price,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1]
			})
		})

	it('StaticMarket: does not match erc1155 <> erc20 order beyond maximum fill',async () =>
		{
		const price = 10000

		await chai.expect(
			any_erc1155_for_erc20_test({
				tokenId: 5,
				sellAmount: 1,
				sellingPrice: price,
				buyingPrice: price,
				buyAmount: 1,
				erc1155MintAmount: 2,
				erc20MintAmount: price*2,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1],
				transactions: 2
				})
			).eventually.rejectedWith(/First order has invalid parameters/,)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order with different prices',async () =>
		{
		const price = 10000

		await chai.expect(
			any_erc1155_for_erc20_test({
				tokenId: 5,
				sellAmount: 1,
				sellingPrice: price,
				buyingPrice: price-10,
				buyAmount: 1,
				erc1155MintAmount: 1,
				erc20MintAmount: price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/Static call failed/,)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order with different ratios',async () =>
		{
		const price = 10000

		await chai.expect(
			any_erc1155_for_erc20_test({
				tokenId: 5,
				sellAmount: 1,
				sellingPrice: price,
				buyingPrice: price,
				buyingDenominator: 2,
				buyAmount: 1,
				erc1155MintAmount: 1,
				erc20MintAmount: price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				}),
			).eventually.rejectedWith(/Static call failed/,)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order beyond maximum sell amount',async () =>
		{
		const nftAmount = 2
		const buyAmount = 3
		const price = 10000

		await chai.expect(
			any_erc1155_for_erc20_test({
				tokenId: 5,
				sellAmount: nftAmount,
				sellingPrice: price,
				buyingPrice: price,
				buyAmount,
				erc1155MintAmount: nftAmount,
				erc20MintAmount: buyAmount*price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/First call failed/)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order if balance is insufficient',async () =>
		{
		const nftAmount = 1
		const buyAmount = 1
		const price = 10000

		await chai.expect(
			any_erc1155_for_erc20_test({
				tokenId: 5,
				sellAmount: nftAmount,
				sellingPrice: price,
				buyingPrice: price,
				buyAmount,
				erc1155MintAmount: nftAmount,
				erc20MintAmount: buyAmount*price-1,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/Second call failed/)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order if the token IDs are different',async () =>
		{
		const price = 10000

		await chai.expect(
			any_erc1155_for_erc20_test({
				tokenId: 5,
				buyTokenId: 6,
				sellAmount: 1,
				sellingPrice: price,
				buyingPrice: price,
				buyAmount: 1,
				erc1155MintAmount: 1,
				erc20MintAmount: price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1],
				})
			).eventually.rejectedWith(/Static call failed/)
		})

	const any_erc20_for_erc20_test = async (options) => {
		const {
			sellAmount,
			sellingPrice,
			buyingPrice,
			buyPriceOffset,
			buyAmount,
			erc20MintAmountSeller,
			erc20MintAmountBuyer,
			account_a,
			account_b,
			sender,
			transactions
		} = options

		const txCount = transactions || 1
		const takerPriceOffset = buyPriceOffset || 0
		
		const TestERC20 = new TestERC20__factory(accounts[0]);
    let erc20Seller = await TestERC20.deploy();
    await erc20Seller.deployed();
    let erc20Buyer = await TestERC20.deploy();
    await erc20.deployed();

    await registry.connect(account_a).registerProxy();
    let proxyA = await registry.proxies(account_a.address);
    chai.expect(true).to.eq(proxyA.length > 0);

    await registry.connect(account_b).registerProxy();
    let proxyB = await registry.proxies(account_b.address);
    chai.expect(true).to.eq(proxyB.length > 0);
		
		await erc20Seller.connect(account_a).approve(proxyA, erc20MintAmountSeller)
		await erc20Buyer.connect(account_b).approve(proxyB, erc20MintAmountBuyer)
		await erc20Seller.mint(account_a.address, erc20MintAmountSeller)
		await erc20Buyer.mint(account_b.address, erc20MintAmountBuyer)

		const selector = marketStaticInterface.getSighash('anyERC20ForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
			
		const paramsOne = coder.encode(
			['address[2]', 'uint256[2]'],
			[[erc20Seller.address, erc20Buyer.address], [sellingPrice, buyingPrice]]
			) 
	
		const paramsTwo = coder.encode(
			['address[2]', 'uint256[2]'],
			[[erc20Buyer.address, erc20Seller.address], [buyingPrice + takerPriceOffset, sellingPrice]]
			)
		const one = {registry: registry.address, maker: account_a.address, staticTarget: staticMarket.address, staticSelector: selector, staticExtradata: paramsOne, maximumFill: sellAmount, listingTime: '0', expirationTime: '10000000000', salt: '11'}
		const two = {registry: registry.address, maker: account_b.address, staticTarget: staticMarket.address, staticSelector: selector, staticExtradata: paramsTwo, maximumFill: txCount*sellingPrice*buyAmount, listingTime: '0', expirationTime: '10000000000', salt: '12'}

		const firstData = ERC20Interface.encodeFunctionData("transferFrom", [account_a.address, account_b.address, buyAmount]);
		const secondData = ERC20Interface.encodeFunctionData("transferFrom", [account_b.address, account_a.address, buyAmount * sellingPrice])
		
		const firstCall = {target: erc20Seller.address, howToCall: 0, data: firstData}
		const secondCall = {target: erc20Buyer.address, howToCall: 0, data: secondData}

		let sigOne = await wrappedExchange.sign(one, account_a)
		
		for (var i = 0 ; i < txCount ; ++i) {
			let sigTwo = await wrappedExchange.sign(two, account_b)
			await wrappedExchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32,{from: sender || account_a})
			two.salt = two.salt + 1
		}
		
		let account_a_erc20_balance = await erc20Buyer.balanceOf(account_a.address)
		let account_b_erc20_balance = await erc20Seller.balanceOf(account_b.address)
		chai.expect(account_a_erc20_balance.toNumber()).to.eq(sellingPrice*buyAmount*txCount)
		chai.expect(account_b_erc20_balance.toNumber()).to.eq(buyAmount*txCount)
	}

	it('StaticMarket: matches erc20 <> erc20 order, 1 fill', async () => {
		const price = 10000

		return any_erc20_for_erc20_test({
			sellAmount: 1,
			sellingPrice: price,
			buyingPrice: 1,
			buyAmount: 1,
			erc20MintAmountSeller: 1,
			erc20MintAmountBuyer: price,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1]
			})
		})

	it('StaticMarket: matches erc20 <> erc20 order, multiple fills in 1 transaction',async () =>
		{
		const amount = 3
		const price = 10000

		return any_erc20_for_erc20_test({
			sellAmount: amount,
			sellingPrice: price,
			buyingPrice: 1,
			buyAmount: amount,
			erc20MintAmountSeller: amount,
			erc20MintAmountBuyer: amount*price,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1]
			})
		})

	it('StaticMarket: matches erc20 <> erc20 order, multiple fills in multiple transactions',async () =>
		{
		const sellAmount = 3
		const buyAmount = 1
		const price = 10000
		const transactions = 3

		return any_erc20_for_erc20_test({
			sellAmount,
			sellingPrice: price,
			buyingPrice: 1,
			buyAmount,
			erc20MintAmountSeller: sellAmount,
			erc20MintAmountBuyer: buyAmount*price*transactions,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1],
			transactions
			})
		})

	it('StaticMarket: matches erc20 <> erc20 order, allows any partial fill',async () =>
		{
		const sellAmount = 30
		const buyAmount = 4
		const price = 10000

		return any_erc20_for_erc20_test({
			sellAmount,
			sellingPrice: price,
			buyingPrice: 1,
			buyAmount,
			erc20MintAmountSeller: sellAmount,
			erc20MintAmountBuyer: buyAmount*price,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1]
			})
		})

	it('StaticMarket: does not match erc20 <> erc20 order beyond maximum fill',async () =>
		{
		const price = 10000

		await chai.expect(
			any_erc20_for_erc20_test({
				sellAmount: 1,
				sellingPrice: price,
				buyingPrice: 1,
				buyAmount: 1,
				erc20MintAmountSeller: 2,
				erc20MintAmountBuyer: price*2,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1],
				transactions: 2
				})
			).eventually.rejectedWith(/First order has invalid parameters/);
		})

	it('StaticMarket: does not fill erc20 <> erc20 order with different taker price',async () =>
		{
		const price = 10000

		await chai.expect(
			any_erc20_for_erc20_test({
				sellAmount: 1,
				sellingPrice: price,
				buyingPrice: 1,
				buyPriceOffset: 1,
				buyAmount: 1,
				erc20MintAmountSeller: 2,
				erc20MintAmountBuyer: price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/Static call failed/);
		})

	it('StaticMarket: does not fill erc20 <> erc20 order beyond maximum sell amount',async () =>
		{
		const sellAmount = 2
		const buyAmount = 3
		const price = 10000

		await chai.expect(
			any_erc20_for_erc20_test({
				sellAmount,
				sellingPrice: price,
				buyingPrice: 1,
				buyAmount,
				erc20MintAmountSeller: sellAmount,
				erc20MintAmountBuyer: buyAmount*price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/First call failed/);
		})

	it('StaticMarket: does not fill erc20 <> erc20 order if balance is insufficient',async () =>
		{
		const sellAmount = 1
		const buyAmount = 1
		const price = 10000

		await chai.expect(
			any_erc20_for_erc20_test({
				sellAmount,
				sellingPrice: price,
				buyingPrice: 1,
				buyAmount,
				erc20MintAmountSeller: sellAmount,
				erc20MintAmountBuyer: buyAmount*price-1,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/Second call failed/);
		})

	const erc721_for_erc20_test = async (options) => {
		const {
			tokenId,
			buyTokenId,
			sellingPrice,
			buyingPrice,
			erc20MintAmount,
			account_a,
			account_b,
			sender
		} = options
		
    await registry.connect(account_a).registerProxy();
    let proxyA = await registry.proxies(account_a.address);
    chai.expect(true).to.eq(proxyA.length > 0);

    await registry.connect(account_b).registerProxy();
    let proxyB = await registry.proxies(account_b.address);
    chai.expect(true).to.eq(proxyB.length > 0);
		
		await erc721.connect(account_a).setApprovalForAll(proxyA, true)
		await erc20.connect(account_b).approve(proxyB, erc20MintAmount)
		await erc721.mint(account_a.address, tokenId)
		await erc20.mint(account_b.address, erc20MintAmount)

		if (buyTokenId)
			await erc721.mint(account_a.address, buyTokenId)

		const selectorOne = marketStaticInterface.getSighash('ERC721ForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
		const selectorTwo = marketStaticInterface.getSighash('ERC20ForERC721(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
			
		const paramsOne = coder.encode(
			['address[2]', 'uint256[2]'],
			[[erc721.address, erc20.address], [tokenId, sellingPrice]]
			) 
	
		const paramsTwo = coder.encode(
			['address[2]', 'uint256[2]'],
			[[erc20.address, erc721.address], [buyTokenId || tokenId, buyingPrice]]
			)
		const one = {registry: registry.address, maker: account_a.address, staticTarget: staticMarket.address, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: 1, listingTime: '0', expirationTime: '10000000000', salt: '11'}
		const two = {registry: registry.address, maker: account_b.address, staticTarget: staticMarket.address, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice, listingTime: '0', expirationTime: '10000000000', salt: '12'}
		
		const firstData = ERC721Interface.encodeFunctionData("transferFrom", [account_a.address, account_b.address, tokenId])
		const secondData = ERC20Interface.encodeFunctionData("transferFrom", [account_b.address, account_a.address, buyingPrice])
		
		const firstCall = {target: erc721.address, howToCall: 0, data: firstData}
		const secondCall = {target: erc20.address, howToCall: 0, data: secondData}

		let sigOne = await wrappedExchange.sign(one, account_a)
		let sigTwo = await wrappedExchange.sign(two, account_b)
		await wrappedExchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32,{from: sender || account_a})
		
		let account_a_erc20_balance = await erc20.balanceOf(account_a.address)
		let token_owner = await erc721.ownerOf(tokenId)
		chai.expect(account_a_erc20_balance.toNumber()).to.eq(sellingPrice,'Incorrect ERC20 balance')
		chai.expect(token_owner).to.eq(account_b.address)
		}

	it('StaticMarket: matches erc721 <> erc20 order',async () =>
		{
		const price = 15000

		return erc721_for_erc20_test({
			tokenId: 10,
			sellingPrice: price,
			buyingPrice: price,
			erc20MintAmount: price,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1]
			})
		})

	it('StaticMarket: does not fill erc721 <> erc20 order with different prices',async () =>
		{
		const price = 15000

		await chai.expect(
			erc721_for_erc20_test({
				tokenId: 10,
				sellingPrice: price,
				buyingPrice: price-1,
				erc20MintAmount: price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/Static call failed/)
		})

	it('StaticMarket: does not fill erc721 <> erc20 order if the balance is insufficient',async () =>
		{
		const price = 15000

		await chai.expect(
			erc721_for_erc20_test({
				tokenId: 10,
				sellingPrice: price,
				buyingPrice: price,
				erc20MintAmount: price-1,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/Second call failed/)
		})

	it('StaticMarket: does not fill erc721 <> erc20 order if the token IDs are different',async () =>
		{
		const price = 15000

		await chai.expect(
			erc721_for_erc20_test({
				tokenId: 10,
				buyTokenId: 11,
				sellingPrice: price,
				buyingPrice: price,
				erc20MintAmount: price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				})
			).eventually.rejectedWith(/Static call failed/)
		})
	})
