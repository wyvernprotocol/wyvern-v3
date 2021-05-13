/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernExchange = artifacts.require('WyvernExchange')
const StaticMarket = artifacts.require('StaticMarket')
const GlobalMaker = artifacts.require('GlobalMaker')
const WyvernRegistry = artifacts.require('WyvernRegistry')
const TestERC20 = artifacts.require('TestERC20')
const TestERC1155 = artifacts.require('TestERC1155')

const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider)

const {wrap,ZERO_BYTES32,CHAIN_ID,assertIsRejected,globalMakerSigMakerOffsets} = require('./aux')

contract('GlobalMaker', (accounts) =>
	{
	let deploy_core_contracts = async () =>
		{
		let [registry] = await Promise.all([WyvernRegistry.new()])
		let [exchange,statici,globalMaker] = await Promise.all(
			[
				WyvernExchange.new(CHAIN_ID,[registry.address],'0x'),
				StaticMarket.new(),
				GlobalMaker.new(registry.address,globalMakerSigMakerOffsets.map(a => a.sig),globalMakerSigMakerOffsets.map(a => a.offset))
			])
		await registry.grantInitialAuthentication(exchange.address)
		return {registry,exchange:wrap(exchange),statici,globalMaker}
		}

	let deploy = async contracts => Promise.all(contracts.map(contract => contract.new()))

	it('matches erc1155 nft-nft swap order',async () =>
		{
		let account_a = accounts[1]
		let account_b = accounts[2]
		let nftId = 4
		let nftAmount = 1
		let erc20Amount = 20
		
		let {exchange, registry, statici, globalMaker} = await deploy_core_contracts()
		let [erc20,erc1155] = await deploy([TestERC20,TestERC1155])
		
		let globalMakerProxy = await registry.proxies(globalMaker.address)
		assert.equal(true, globalMakerProxy.length > 0, 'no proxy address for global maker')
		
		await Promise.all([erc1155.setApprovalForAll(globalMakerProxy,true,{from: account_a}),erc20.approve(globalMakerProxy,erc20Amount,{from: account_b})])
		await Promise.all([erc1155.mint(account_a,nftId,nftAmount),erc20.mint(account_b,erc20Amount)])
		
		const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address)
		const erc20c = new web3.eth.Contract(erc20.abi, erc20.address)

		const selectorOne = web3.eth.abi.encodeFunctionSignature('anyERC1155ForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')
		const selectorTwo = web3.eth.abi.encodeFunctionSignature('anyERC20ForERC1155(bytes,address[7],uint8[2],uint256[6],bytes,bytes)')

		const paramsOne = web3.eth.abi.encodeParameters(
			['address[2]', 'uint256[3]'],
			[[erc1155.address, erc20.address], [nftId, nftAmount, erc20Amount]]
			) 
	
		const paramsTwo = web3.eth.abi.encodeParameters(
			['address[2]', 'uint256[3]'],
			[[erc20.address, erc1155.address], [nftId, erc20Amount, nftAmount]]
			)

		const one = {registry: registry.address, maker: globalMaker.address, staticTarget: statici.address, staticSelector: selectorOne, staticExtradata: paramsOne, maximumFill: nftAmount, listingTime: '0', expirationTime: '10000000000', salt: '7'}
		const two = {registry: registry.address, maker: globalMaker.address, staticTarget: statici.address, staticSelector: selectorTwo, staticExtradata: paramsTwo, maximumFill: erc20Amount, listingTime: '0', expirationTime: '10000000000', salt: '8'}

		const firstData = erc1155c.methods.safeTransferFrom(account_a, account_b, nftId, nftAmount, "0x").encodeABI() + ZERO_BYTES32.substr(2)
		const secondData = erc20c.methods.transferFrom(account_b, account_a, erc20Amount).encodeABI()
				
		const firstCall = {target: erc1155.address, howToCall: 0, data: firstData}
		const secondCall = {target: erc20.address, howToCall: 0, data: secondData}

		const sigOne = await exchange.sign(one, account_a)
		const sigTwo = await exchange.sign(two, account_b)

		await exchange.atomicMatchWith(one, sigOne, firstCall, two, sigTwo, secondCall, ZERO_BYTES32,{from:accounts[6]})
		let [new_balance1,new_balance2] = await Promise.all([erc20.balanceOf(account_a),erc1155.balanceOf(account_b, nftId)])
		assert.isTrue(new_balance1.toNumber() > 0,'Incorrect owner')
		assert.isTrue(new_balance2.toNumber() > 0,'Incorrect owner')
		})
	})
