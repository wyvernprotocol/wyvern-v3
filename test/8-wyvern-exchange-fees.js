/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernExchange = artifacts.require('WyvernExchange')
const WyvernStatic = artifacts.require('WyvernStatic')
const StaticMarket = artifacts.require('StaticMarket')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC721 = artifacts.require('TestERC721')

const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const BigNumber = require('bignumber.js');

const {wrap,ZERO_BYTES32,CHAIN_ID,assertIsRejected} = require('./util')

contract('WyvernExchange', (accounts) => {
	let deploy_core_contracts = async () =>
		{
		let [registry,atomicizer] = await Promise.all([WyvernRegistry.new(), WyvernAtomicizer.new()])
		let [exchange,staticMarket,wyvernStatic] = await Promise.all([WyvernExchange.new(CHAIN_ID,[registry.address],'0x'), StaticMarket.new(), WyvernStatic.new(atomicizer.address)])
		await registry.grantInitialAuthentication(exchange.address)
		return {registry,exchange:wrap(exchange),atomicizer,staticMarket,wyvernStatic}
		}

	let deploy = async contracts => Promise.all(contracts.map(contract => contract.new()))

	it('matches erc721 <> erc20 orders, with splitted erc20 fees', async () => {
		let {registry, exchange, atomicizer, wyvernStatic} = await deploy_core_contracts()
		let [erc721,erc20] = await deploy([TestERC721,TestERC20])
		
		const account_a = accounts[0] // order maker
		const account_b = accounts[6] // order matcher
		const account_c = accounts[1] // fee recipient
		const tokenId = 10
		const price = 800
		/**
		 * Expected behavior:
		 * 	erc721:
		 * 		account_a -> account_b
		 *  erc20:	
		 *    account_b -> account_a: 800
		 * 	  account_b -> account_c: 200
		 */
		const fee = 200

		await registry.registerProxy({from: account_a})
		let proxy1 = await registry.proxies(account_a)
		assert.equal(true, proxy1.length > 0, 'no proxy address for account a')

		await registry.registerProxy({from: account_b})
		let proxy2 = await registry.proxies(account_b)
		assert.equal(true, proxy2.length > 0, 'no proxy address for account b')
		
		await Promise.all([erc721.setApprovalForAll(proxy1,true,{from: account_a}),erc20.approve(proxy2,price+fee,{from: account_b})])
		await Promise.all([erc721.mint(account_a,tokenId),erc20.mint(account_b,price+fee)])

		const abi = [
			{
				'constant': false, 
				'inputs': [
					{'name': 'addrs', 'type': 'address[]'},
					{'name': 'values', 'type': 'uint256[]'},
					{'name': 'calldataLengths', 'type': 'uint256[]'},
					{'name': 'calldatas', 'type': 'bytes'}
				],
				'name': 'atomicize',
				'outputs': [],
				'payable': false,
				'stateMutability': 'nonpayable',
				'type': 'function'
			}
		]
		const atomicizerc = new web3.eth.Contract(abi, atomicizer.address)
		const erc721c = new web3.eth.Contract(erc721.abi, erc721.address)
		const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)

		// order staticCall
		let selectorOne, extradataOne
		{
			selectorOne = web3.eth.abi.encodeFunctionSignature('split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
			// 	`split` extraData part 1 (staticCall of order)
			const selectorA = web3.eth.abi.encodeFunctionSignature('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
			const selectorA1 = web3.eth.abi.encodeFunctionSignature('transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)')
			const edParamsA1 = web3.eth.abi.encodeParameters(['address', 'uint256'], [erc721.address, tokenId])
			const extradataA = web3.eth.abi.encodeParameters(
				['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
				[[wyvernStatic.address], [(edParamsA1.length - 2) / 2], [selectorA1], edParamsA1]
			)

			//	`split` extraData part 2 (staticCall of counter order)
			const selectorB = web3.eth.abi.encodeFunctionSignature('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')

			const selectorB1 = web3.eth.abi.encodeFunctionSignature('transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)')
			const edParamsB1 = web3.eth.abi.encodeParameters(['address', 'uint256'], [erc20.address, price])
			const selectorB2 = web3.eth.abi.encodeFunctionSignature('transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)')
			const edParamsB2 = web3.eth.abi.encodeParameters(['address', 'uint256', 'address'], [erc20.address, fee, account_c])

			const extradataB = web3.eth.abi.encodeParameters(
				["address[]", "uint256[]", "bytes4[]", "bytes"],
				[
					[wyvernStatic.address, wyvernStatic.address],
					[
						(edParamsB1.length - 2) / 2,
						(edParamsB2.length - 2) / 2
					],
					[selectorB1, selectorB2],
					edParamsB1 + edParamsB2.slice("2")
				]
			)

			// `split` extraData combined
			extradataOne = web3.eth.abi.encodeParameters(
				['address[2]', 'bytes4[2]', 'bytes', 'bytes'],
				[[wyvernStatic.address, wyvernStatic.address],
					[selectorA, selectorB],
					extradataA, extradataB]
			)
		}

		// counter order staticCall
		let selectorTwo, extradataTwo
		{
			selectorTwo = web3.eth.abi.encodeFunctionSignature('split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')

			// 	`split` extraData part 1 (staticCall of order)
			const selectorA = web3.eth.abi.encodeFunctionSignature('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')

			const selectorA1 = web3.eth.abi.encodeFunctionSignature('transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)')
			const edParamsA1 = web3.eth.abi.encodeParameters(['address', 'uint256'], [erc20.address, price])
			const selectorA2 = web3.eth.abi.encodeFunctionSignature('transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)')
			const edParamsA2 = web3.eth.abi.encodeParameters(['address', 'uint256', 'address'], [erc20.address, fee, account_c])

			const extradataA = web3.eth.abi.encodeParameters(
				["address[]", "uint256[]", "bytes4[]", "bytes"],
				[
					[wyvernStatic.address, wyvernStatic.address],
					[
						(edParamsA1.length - 2) / 2,
						(edParamsA2.length - 2) / 2
					],
					[selectorA1, selectorA2],
					edParamsA1 + edParamsA2.slice("2")
				]
			)

			//	`split` extraData part 2 (staticCall of counter order)
			const selectorB = web3.eth.abi.encodeFunctionSignature('sequenceExact(bytes,address[7],uint8,uint256[6],bytes)')
			const edSelectorB1 = web3.eth.abi.encodeFunctionSignature('transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)')
			const edParamsB1 = web3.eth.abi.encodeParameters(['address', 'uint256'], [erc721.address, tokenId])
			const extradataB = web3.eth.abi.encodeParameters(
				['address[]', 'uint256[]', 'bytes4[]', 'bytes'],
				[[wyvernStatic.address], [(edParamsB1.length - 2) / 2], [edSelectorB1], edParamsB1]
			)

			// `split` extraData combined
			extradataTwo = web3.eth.abi.encodeParameters(
				['address[2]', 'bytes4[2]', 'bytes', 'bytes'],
				[[wyvernStatic.address, wyvernStatic.address],
					[selectorA, selectorB],
					extradataA, extradataB]
			)
		}

		// firstCall
		const firstERC721Call = erc721c.methods.transferFrom(account_a, account_b, tokenId).encodeABI()
		const firstData = atomicizerc.methods.atomicize(
			[erc721.address],
			[0],
			[(firstERC721Call.length - 2) / 2],
			firstERC721Call
		).encodeABI()
		const firstCall = {target: atomicizer.address, howToCall: 1, data: firstData}

		// secondCall
		const secondERC20CallA = erc20c.methods.transferFrom(account_b, account_a, price).encodeABI()
		const secondERC20CallB = erc20c.methods.transferFrom(account_b, account_c, fee).encodeABI()
		const secondData = atomicizerc.methods.atomicize(
			[erc20.address, erc20.address],
			[0, 0],
			[(secondERC20CallA.length - 2) / 2, (secondERC20CallB.length - 2) / 2],
			secondERC20CallA + secondERC20CallB.slice(2)
		).encodeABI()
		const secondCall = {target: atomicizer.address, howToCall: 1, data: secondData}

		// sign and match order
		const one = {registry: registry.address, maker: account_a, staticTarget: wyvernStatic.address, staticSelector: selectorOne, staticExtradata: extradataOne, maximumFill: 1, listingTime: '0', expirationTime: '10000000000', salt: '11'}
		const two = {registry: registry.address, maker: account_b, staticTarget: wyvernStatic.address, staticSelector: selectorTwo, staticExtradata: extradataTwo, maximumFill: 1, listingTime: '0', expirationTime: '10000000000', salt: '12'}

		let sigOne = await exchange.sign(one, account_a)
		let sigTwo = await exchange.sign(two, account_b)
		await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32,{from: account_b})
		
		let [account_a_erc20_balance, account_c_erc20_balance, token_owner] = await Promise.all([erc20.balanceOf(account_a),erc20.balanceOf(account_c),erc721.ownerOf(tokenId)])
		assert.equal(account_a_erc20_balance.toNumber(), price,'Incorrect ERC20 balance of account_a')
		assert.equal(account_c_erc20_balance.toNumber(), fee,'Incorrect ERC20 balance of account_c')
		assert.equal(token_owner, account_b,'Incorrect token owner')
	})

})
