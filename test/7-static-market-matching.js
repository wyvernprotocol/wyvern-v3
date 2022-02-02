/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const StaticMarket = artifacts.require('StaticMarket')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC721 = artifacts.require('TestERC721')
const TestERC1155 = artifacts.require('TestERC1155')

const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const {wrap,ZERO_BYTES32,CHAIN_ID,assertIsRejected} = require('./util')

contract('WyvernExchange', (accounts) =>
	{
	let deploy_core_contracts = async () =>
		{
		let [registry,atomicizer] = await Promise.all([WyvernRegistry.new(), WyvernAtomicizer.new()])
		let [exchange,statici] = await Promise.all([WyvernExchange.new(CHAIN_ID,[registry.address],'0x'),StaticMarket.new()])
		await registry.grantInitialAuthentication(exchange.address)
		return {registry,exchange:wrap(exchange),atomicizer,statici}
		}

	let deploy = async contracts => Promise.all(contracts.map(contract => contract.new()))

	const any_erc1155_for_erc20_test = async (options) =>
		{
		const {tokenId,
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
			transactions} = options

		const txCount = transactions || 1
		
		let {exchange, registry, statici} = await deploy_core_contracts()
		let [erc20,erc1155] = await deploy([TestERC20,TestERC1155])
		
		await registry.registerProxy({from: account_a})
		let proxy1 = await registry.proxies(account_a)
		assert.equal(true, proxy1.length > 0, 'no proxy address for account a')

		await registry.registerProxy({from: account_b})
		let proxy2 = await registry.proxies(account_b)
		assert.equal(true, proxy2.length > 0, 'no proxy address for account b')
		
		await Promise.all([erc1155.setApprovalForAll(proxy1,true,{from: account_a}),erc20.approve(proxy2,erc20MintAmount,{from: account_b})])
		await Promise.all([erc1155.mint(account_a,tokenId,erc1155MintAmount),erc20.mint(account_b,erc20MintAmount)])

		if (buyTokenId)
			await erc1155.mint(account_a,buyTokenId,erc1155MintAmount)

		const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address)
		const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
		const selectorOne = web3.eth.abi.encodeFunctionSignature('anyERC1155ForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
		const selectorTwo = web3.eth.abi.encodeFunctionSignature('anyERC20ForERC1155(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
			
		const paramsOne = web3.eth.abi.encodeParameters(
			['address[2]', 'uint256[3]'],
			[[erc1155.address, erc20.address], [tokenId, sellingNumerator || 1, sellingPrice]]
			) 
	
		const paramsTwo = web3.eth.abi.encodeParameters(
			['address[2]', 'uint256[3]'],
			[[erc20.address, erc1155.address], [buyTokenId || tokenId, buyingPrice, buyingDenominator || 1]]
			)

		const one = {registry: registry.address, maker: account_a, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: (sellingNumerator || 1) * sellAmount, listingTime: '0', expirationTime: '10000000000', salt: '11'}
		const two = {registry: registry.address, maker: account_b, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: buyingPrice*buyAmount, listingTime: '0', expirationTime: '10000000000', salt: '12'}

		const firstData = erc1155c.methods.safeTransferFrom(account_a, account_b, tokenId, sellingNumerator || buyAmount, "0x").encodeABI() + ZERO_BYTES32.substr(2)
		const secondData = erc20c.methods.transferFrom(account_b, account_a, buyAmount*buyingPrice).encodeABI()
		
		const firstCall = {target: erc1155.address, howToCall: 0, data: firstData}
		const secondCall = {target: erc20.address, howToCall: 0, data: secondData}

		let sigOne = await exchange.sign(one, account_a)
		
		for (var i = 0 ; i < txCount ; ++i)
			{
			let sigTwo = await exchange.sign(two, account_b)
			await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32,{from:sender || account_a})
			two.salt++
			}
		
		let [account_a_erc20_balance,account_b_erc1155_balance] = await Promise.all([erc20.balanceOf(account_a),erc1155.balanceOf(account_b, tokenId)])
		assert.equal(account_a_erc20_balance.toNumber(), sellingPrice*buyAmount*txCount,'Incorrect ERC20 balance')
		assert.equal(account_b_erc1155_balance.toNumber(), sellingNumerator || (buyAmount*txCount),'Incorrect ERC1155 balance')
		}

	it('StaticMarket: matches erc1155 <> erc20 order, 1 fill',async () =>
		{
		const price = 10000

		return any_erc1155_for_erc20_test({
			tokenId: 5,
			sellAmount: 1,
			sellingPrice: price,
			buyingPrice: price,
			buyAmount: 1,
			erc1155MintAmount: 1,
			erc20MintAmount: price,
			account_a: accounts[0],
			account_b: accounts[6],
			sender: accounts[1]
			})
		})

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

		return assertIsRejected(
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
				}),
			/First order has invalid parameters/,
			'Order should not match the second time.'
			)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order with different prices',async () =>
		{
		const price = 10000

		return assertIsRejected(
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
				}),
			/Static call failed/,
			'Order should not match.'
			)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order with different ratios',async () =>
		{
		const price = 10000

		return assertIsRejected(
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
			/Static call failed/,
			'Order should not match.'
			)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order beyond maximum sell amount',async () =>
		{
		const nftAmount = 2
		const buyAmount = 3
		const price = 10000

		return assertIsRejected(
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
				}),
			/First call failed/,
			'Order should not fill'
			)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order if balance is insufficient',async () =>
		{
		const nftAmount = 1
		const buyAmount = 1
		const price = 10000

		return assertIsRejected(
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
				}),
			/Second call failed/,
			'Order should not fill'
			)
		})

	it('StaticMarket: does not fill erc1155 <> erc20 order if the token IDs are different',async () =>
		{
		const price = 10000

		return assertIsRejected(
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
				}),
			/Static call failed/,
			'Order should not match the second time.'
			)
		})

	const any_erc20_for_erc20_test = async (options) =>
		{
		const {sellAmount,
			sellingPrice,
			buyingPrice,
			buyPriceOffset,
			buyAmount,
			erc20MintAmountSeller,
			erc20MintAmountBuyer,
			account_a,
			account_b,
			sender,
			transactions} = options

		const txCount = transactions || 1
		const takerPriceOffset = buyPriceOffset || 0
		
		let {exchange, registry, statici} = await deploy_core_contracts()
		let [erc20Seller,erc20Buyer] = await deploy([TestERC20,TestERC20])
		
		await registry.registerProxy({from: account_a})
		let proxy1 = await registry.proxies(account_a)
		assert.equal(true, proxy1.length > 0, 'no proxy address for account a')

		await registry.registerProxy({from: account_b})
		let proxy2 = await registry.proxies(account_b)
		assert.equal(true, proxy2.length > 0, 'no proxy address for account b')
		
		await Promise.all([erc20Seller.approve(proxy1,erc20MintAmountSeller,{from: account_a}),erc20Buyer.approve(proxy2,erc20MintAmountBuyer,{from: account_b})])
		await Promise.all([erc20Seller.mint(account_a,erc20MintAmountSeller),erc20Buyer.mint(account_b,erc20MintAmountBuyer)])

		const erc20cSeller = new web3.eth.Contract(erc20Seller.abi, erc20Seller.address)
		const erc20cBuyer = new web3.eth.Contract(erc20Buyer.abi, erc20Buyer.address)
		const selector = web3.eth.abi.encodeFunctionSignature('anyERC20ForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
			
		const paramsOne = web3.eth.abi.encodeParameters(
			['address[2]', 'uint256[2]'],
			[[erc20Seller.address, erc20Buyer.address], [sellingPrice, buyingPrice]]
			) 
	
		const paramsTwo = web3.eth.abi.encodeParameters(
			['address[2]', 'uint256[2]'],
			[[erc20Buyer.address, erc20Seller.address], [buyingPrice + takerPriceOffset, sellingPrice]]
			)
		const one = {registry: registry.address, maker: account_a, staticTarget: statici.address, staticSelector: selector, staticExtradata: paramsOne, maximumFill: sellAmount, listingTime: '0', expirationTime: '10000000000', salt: '11'}
		const two = {registry: registry.address, maker: account_b, staticTarget: statici.address, staticSelector: selector, staticExtradata: paramsTwo, maximumFill: txCount*sellingPrice*buyAmount, listingTime: '0', expirationTime: '10000000000', salt: '12'}

		const firstData = erc20cSeller.methods.transferFrom(account_a, account_b, buyAmount).encodeABI()
		const secondData = erc20cBuyer.methods.transferFrom(account_b, account_a, buyAmount * sellingPrice).encodeABI()
		
		const firstCall = {target: erc20Seller.address, howToCall: 0, data: firstData}
		const secondCall = {target: erc20Buyer.address, howToCall: 0, data: secondData}

		let sigOne = await exchange.sign(one, account_a)
		
		for (var i = 0 ; i < txCount ; ++i)
			{
			let sigTwo = await exchange.sign(two, account_b)
			await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32,{from: sender || account_a})
			two.salt++
			}
		
		let [account_a_erc20_balance,account_b_erc20_balance] = await Promise.all([erc20Buyer.balanceOf(account_a),erc20Seller.balanceOf(account_b)])
		assert.equal(account_a_erc20_balance.toNumber(), sellingPrice*buyAmount*txCount,'Incorrect ERC20 balance')
		assert.equal(account_b_erc20_balance.toNumber(), buyAmount*txCount,'Incorrect ERC20 balance')
		}

	it('StaticMarket: matches erc20 <> erc20 order, 1 fill',async () =>
		{
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

		return assertIsRejected(
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
				}),
			/First order has invalid parameters/,
			'Order should not match the second time.'
			)
		})

	it('StaticMarket: does not fill erc20 <> erc20 order with different taker price',async () =>
		{
		const price = 10000

		return assertIsRejected(
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
				}),
			/Static call failed/,
			'Order should not match.'
			)
		})

	it('StaticMarket: does not fill erc20 <> erc20 order beyond maximum sell amount',async () =>
		{
		const sellAmount = 2
		const buyAmount = 3
		const price = 10000

		return assertIsRejected(
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
				}),
			/First call failed/,
			'Order should not fill'
			)
		})

	it('StaticMarket: does not fill erc20 <> erc20 order if balance is insufficient',async () =>
		{
		const sellAmount = 1
		const buyAmount = 1
		const price = 10000

		return assertIsRejected(
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
				}),
			/Second call failed/,
			'Order should not fill'
			)
		})

	const erc721_for_erc20_test = async (options) =>
		{
		const {
			tokenId,
			buyTokenId,
			sellingPrice,
			buyingPrice,
			erc20MintAmount,
			account_a,
			account_b,
			sender} = options

		let {exchange, registry, statici} = await deploy_core_contracts()
		let [erc721,erc20] = await deploy([TestERC721,TestERC20])
		
		await registry.registerProxy({from: account_a})
		let proxy1 = await registry.proxies(account_a)
		assert.equal(true, proxy1.length > 0, 'no proxy address for account a')

		await registry.registerProxy({from: account_b})
		let proxy2 = await registry.proxies(account_b)
		assert.equal(true, proxy2.length > 0, 'no proxy address for account b')
		
		await Promise.all([erc721.setApprovalForAll(proxy1,true,{from: account_a}),erc20.approve(proxy2,erc20MintAmount,{from: account_b})])
		await Promise.all([erc721.mint(account_a,tokenId),erc20.mint(account_b,erc20MintAmount)])

		if (buyTokenId)
			await erc721.mint(account_a,buyTokenId)

		const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
		const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)
		const selectorOne = web3.eth.abi.encodeFunctionSignature('ERC721ForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
		const selectorTwo = web3.eth.abi.encodeFunctionSignature('ERC20ForERC721(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
			
		const paramsOne = web3.eth.abi.encodeParameters(
			['address[2]', 'uint256[2]'],
			[[erc721.address, erc20.address], [tokenId, sellingPrice]]
			) 
	
		const paramsTwo = web3.eth.abi.encodeParameters(
			['address[2]', 'uint256[2]'],
			[[erc20.address, erc721.address], [buyTokenId || tokenId, buyingPrice]]
			)
		const one = {registry: registry.address, maker: account_a, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: 1, listingTime: '0', expirationTime: '10000000000', salt: '11'}
		const two = {registry: registry.address, maker: account_b, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: 1, listingTime: '0', expirationTime: '10000000000', salt: '12'}

		const firstData = erc721c.methods.transferFrom(account_a, account_b, tokenId).encodeABI()
		const secondData = erc20c.methods.transferFrom(account_b, account_a, buyingPrice).encodeABI()
		
		const firstCall = {target: erc721.address, howToCall: 0, data: firstData}
		const secondCall = {target: erc20.address, howToCall: 0, data: secondData}

		let sigOne = await exchange.sign(one, account_a)
		let sigTwo = await exchange.sign(two, account_b)
		await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32,{from: sender || account_a})
		
		let [account_a_erc20_balance,token_owner] = await Promise.all([erc20.balanceOf(account_a),erc721.ownerOf(tokenId)])
		assert.equal(account_a_erc20_balance.toNumber(), sellingPrice,'Incorrect ERC20 balance')
		assert.equal(token_owner, account_b,'Incorrect token owner')
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

		return assertIsRejected(
			erc721_for_erc20_test({
				tokenId: 10,
				sellingPrice: price,
				buyingPrice: price-1,
				erc20MintAmount: price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				}),
			/Static call failed/,
			'Order should not have matched'
			)
		})

	it('StaticMarket: does not fill erc721 <> erc20 order if the balance is insufficient',async () =>
		{
		const price = 15000

		return assertIsRejected(
			erc721_for_erc20_test({
				tokenId: 10,
				sellingPrice: price,
				buyingPrice: price,
				erc20MintAmount: price-1,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				}),
			/Second call failed/,
			'Order should not have matched'
			)
		})

	it('StaticMarket: does not fill erc721 <> erc20 order if the token IDs are different',async () =>
		{
		const price = 15000

		return assertIsRejected(
			erc721_for_erc20_test({
				tokenId: 10,
				buyTokenId: 11,
				sellingPrice: price,
				buyingPrice: price,
				erc20MintAmount: price,
				account_a: accounts[0],
				account_b: accounts[6],
				sender: accounts[1]
				}),
			/Static call failed/,
			'Order should not have matched'
			)
		})
	})
