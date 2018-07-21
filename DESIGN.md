## Overview

Wyvern v3 restructures several core components of the protocol in order to better serve the protocol's goal of enabling users of the distributed ledger upon which Wyvern is deployed to freely trade fulfillments of their utility functions. This document summarizes capability improvements ("new features"), design changes ("existing features working differently"), and migration paths ("how to upgrade") relative to [Wyvern 2.2](https://github.com/projectwyvern/wyvern-ethereum).

### Capability improvements

#### Symmetric bidirectional call matching (*a* for *b*, for any *a* and any *b*)

Wyvern v1 and v2 were "asymmetric" DEX protocols, with two sides of orders: sell-side orders executed a function call, and buy-side orders paid for the execution of the call with some ERC20 token. The call was arbitrary ("send a CryptoKitty", "transfer ownership of a smart contract", "pay 200 DAI and 300 WYV"), but the order schema could not express trade intents with no ERC20 side ("trade the Etherbots smart contract for the Etheremon smart contract", "trade my 3 CryptoKitties for your 2 CryptoKitties", "mint a unique NFT for proof of a SHA2 collision"). Wyvern v3 does not have this restriction. Each order specifies two calls: the call the order maker is offering to perform, and the call the order maker wishes to receive in return. Wyvern v3 orders can express an intent to trade any Ethereum state transition for any other Ethereum state transition, specified independently. 

##### Example instantiations

- ERC20-ERC20 trades
    - Order offers to call the `transfer` (or `transferFrom`) function on a particular token, asserts that the counterparty's call is a `transfer` call to the desired token, and asserts a rate between the two amounts, with a possible maximum (or exact) volume
    - Any two orders for opposite token pairs and equal (or crossing) rates can be matched
- ERC20-NFT trades
    - Order offers to call the `transfer` (or `transferFrom`) function on a particular NFT contract with a particular NFT identifier, asserts that the counterparty's call is a `transfer` call to the desired ERC20 contract, and asserts the desired amount of tokens (possibly time-varying, e.g. an auction)
- NFT-NFT trades
    - Order offers to call the `transfer` function twice, for two specific CryptoKitties and asserts that the counterparty's call is a `transfer` call for any Etherbot with a specific combination of properties
- Smart contract ownership swaps
    - Order offers to transfer ownership of a particular smart contract and asserts that the counterparty's call transfers ownership of another particular smart contract
- Any trade you can imagine
    - Wyvern DAO creates an order offering to transfer ownership of the Wyvern Registry to a new DAO with a new token in exchange for a swap of the existing WYV token contract for the new token at a determined rate

No examples listed above require deploying additional smart contracts. Further smart contract deployment is required only for certain complex conditional orders ("sell my CryptoKitty to Alice, Bob, or Sam"), is completely permissionless, and can be done in a composable manner by making use of `DELEGATECALL` (much like Solidity libraries).

#### Full functional expressivity

In all versions of the Wyvern Protocol, orders do not specify exact calls to execute but rather functions over the space of possible calls. This allows, in the trivial case, an order to transfer tokens to any counterparty, and in the more complex case solves the sparse liquidity problem: when trading nonfungible assets, one may care not about an exact asset but rather about any asset with particular characteristics (for example, "any blue-eyed CryptoKitty"). Although capable, this design raises a problem: it is underspecified. Possibly multiple calls could fulfill the restriction (say, if I have two blue-eyed CryptoKitties to trade), and there is no necessitated procedure for choosing a particular one. Wyvern v1 and Wyvern v2 performed this "call unification" on-chain by allowing buy and sell orders to each specify calldata, and trying to replace parts of one with parts of the other to satisfy both orders. Although simple to implement, this method is of limited capability: in particular, it cannot match certain orders pairs that ought to be matcheable. An order offering to sell any red-eyed CryptoKitty, and another order offering to buy any one of five CryptoKitties might fail to match because the default calldata specified by the sell-side order (for one of the red-eyed CryptoKitties) and the default calldata for the buy-side order (for another, different CryptoKitty) could not be unified by simple array replacement, even though the orders themselves could be matched. Wyvern v3 solves this problem by moving the calldata unification procedure off-chain. Orders specify only a static-callable function to check all particulars of the trade being made; the exact calldata need only be provided when two orders are matched, and can be determined in an application-suitable manner by the order matcher.

An example Javascript matcher implementation will be provided which mirrors the existing algorithm.

### Design changes

#### Core simplification

Making use of the additional expressivity provided by bidirectional call matching, Wyvern v3 "pushes out" almost all auxiliary aspects of the protocol to orders themselves instead of implementing them in the exchange contract. This reduces protocol complexity substantially, allows for more flexibility on the part of users and relayers, and reduces gas costs for simple orders which did not make use of advanced fee logic.

##### Fee logic

The core exchange protocol no longer has any ERC20-specific fee payment logic. Orders themselves now must contain any fee payments to third parties. Relayers, which as usual enforce arbitrary filters on their orderbooks, may wish to only accept orders which pay them a particular fee amount. In the simple case, this can work equivalently to the fee logic used by Wyvern v2.2, but it has far more possibilites: fees can be paid to multiple relayers, paid to the account which executes the match transaction and pays gas (which need not be, but might be, the relayer), paid to multiple users in e.g. a referral system, etc. Such fee splits can be implemented reasonably efficiently by paying into a proxy contract and tracking fee balances, then executing the actual ERC20 `transfer` calls only periodically.

Of particular interest may be the ability for relayers to completely abstract away gas costs and transaction execution for their users, choosing to match orders and pay gas costs themselves and incorporate those costs into their usual fees. The underlying Ethereum gas costs are of course still variable, a risk which can be partially hedged with [GasToken](https://gastoken.io).

Example implementations are provided for the fee models Wyvern v2.2 previously implemented and several new ones which may be of interest.

##### Pricing logic

The core exchange protocol no longer has any ERC20-specific pricing logic. Orders now must check the call made by the counterparty themselves, asserting for example that an appropriate amount of an ERC20 token has been transferred. 

Example implementations are provided for the pricing logic (fixed-price and Dutch auction) Wyvern v2.2 previously implemented.

#### Removal of a privileged token

  1. Unconvinced of fee model
  1. No rent extraction
  1 .Better for Ethereum to accept other tokens as fee tokens
  1. Natural selection will apply to base protocols

Wyvern v3 maintains the "special-case" support for unwrapped Ether first introduced in Wyvern v2.1. Only a buyer matching an order by executing the transaction himself can pay in unwrapped Ether (which is transferred directly to the seller). As Ether transfers are "push-only", this is a fundamental limitation of the EVM.

### Migration

Wyvern v3 has not yet been finalized & deployed, but it is expected to use the "standard" Wyvern upgrade path. The [existing Wyvern Registry](https://etherscan.io/address/wyvernregistry.eth) does not need to be changed, and users will not need to make any additional transactions - relayers will simply need to upgrade their frontends to use the Wyvern v3 exchange contract and order schema. Existing Wyvern v2 orders can continue to be matched - however, Wyvern v2 and Wyvern v3 orders are incompatible (they cannot be matched with each other).
