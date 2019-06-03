# Wyvern Protocol v3.1 "Ancalagon" Audit Specification

## Table of Contents

1. [Overview](#overview)
    1. [Version 3.1 Note](#version-3.1-note)
1. [Contracts](#contracts)
    1. [WyvernExchange](#wyvernexchange)
        1. [Exchange](#exchange)
        1. [ExchangeCore](#exchangecore)
            1. [ReentrancyGuarded](#reentrancyguarded)
            1. [StaticCaller](#staticcaller)
            1. [EIP712](#eip712)
            1. [EIP1271](#eip1271)
    1. [WyvernRegistry](#wyvernregistry)
        1. [ProxyRegistryInterface](#proxyregistryinterface)
        1. [ProxyRegistry](#proxyregistry)
        1. [AuthenticatedProxy](#authenticatedproxy)
        1. [OwnableDelegateProxy](#ownabledelegateproxy)
            1. [Proxy](#proxy)
            1. [OwnedUpgradabilityProxy](#ownedupgradabilityproxy)
            1. [OwnedUpgradabilityStorage](#ownedupgradabilitystorage)
        1. [TokenRecipient](#tokenrecipient)
    1. [WyvernAtomicizer](#wyvernatomicizer)
1. [Deployments](#deployments)
    1. [Rinkeby](#rinkeby)
    1. [Metropolis](#metropolis)

## Overview

This is version 3.1 of the Wyvern decentralized exchange protocol, designed to maximize the ease of positive-utility-sum multiparty transactions on a distributed ledger.

You may find the [usage documentation](https://wyvernprotocol.com/docs) conducive to understanding the intended functionality of the protocol.

Only the core protocol contracts are in scope of audit, since auxiliary library contracts for static callbacks are not relevant to the correctness of the protocol and are the responsibility of the user.

### Version 3.1 Note

Version 3.1 of the Wyvern Protocol comprises substantial changes from [version 2.2](https://github.com/projectwyvern/wyvern-ethereum).

Version 2 of the protocol is operating live on the Ethereum mainnet — you may have heard of the most popular relayer, [OpenSea](https://opensea.io) — and has been used to trade assets ranging from digital kittens to bundles of virtual playing cards to smart contracts.

If you previously audited version 2.2, [the v3 design spec](https://wyvernprotocol.com/docs/upgrading-from-wyvern-v22) provides an overview of the changeset and development rationale.

## Contracts

Contracts not in this list (**WyvernStatic** and its dependencies) do not need to be audited, although you may find a quick read instructive to analysis of the core protocol.

### WyvernExchange

[contracts/WyvernExchange.sol](../../contracts/WyvernExchange.sol)

Top-level exchange contract. Inherits **Exchange**.

#### Exchange

[contracts/exchange/Exchange.sol](../../contracts/exchange/Exchange.sol)

ABI-wrapper / helper function contract. Inherits **ExchangeCore**.

#### ExchangeCore

[contracts/exchange/ExchangeCore.sol](../../contracts/exchange/ExchangeCore.sol)

Core order validation, authentication, and settlement logic. Inherits **ReentrancyGuarded**, **StaticCaller**, and **EIP712**.

##### ReentrancyGuarded

[contracts/lib/ReentrancyGuarded.sol](../../contracts/lib/ReentrancyGuarded.sol)

Simple state variable and modifier for generic reentrancy-prevention.

##### StaticCaller

[contracts/lib/StaticCaller.sol](../../contracts/lib/StaticCaller.sol)

Helper functions for making static calls to other contracts.

##### EIP712

[contracts/lib/EIP712.sol](../../contracts/lib/EIP712.sol)

State variables and helper functions for implementing [EIP 712](https://github.com/ethereum/EIPs/pull/712).

##### EIP1271

[contracts/lib/EIP1271.sol](../../contracts/lib/EIP1271.sol)

State variables and helper functions for implementing [EIP 1271](https://github.com/ethereum/EIPs/issues/1271).

### WyvernRegistry

[contracts/WyvernRegistry.sol](../../contracts/WyvernRegistry.sol)

Top-level registry contract. Inherits **ProxyRegistry**.

#### ProxyRegistryInterface

[contracts/registry/ProxyRegistryInterface.sol](../../contracts/registry/ProxyRegistryInterface.sol)

Interface contract to **ProxyRegistry**, used by **ExchangeCore**.

#### ProxyRegistry

[contracts/registry/ProxyRegistry.sol](../../contracts/registry/ProxyRegistry.sol)

Core registry logic for user-owned **AuthenticatedProxy** contracts. Inherits **Ownable**.

#### AuthenticatedProxy

[contracts/registry/AuthenticatedProxy.sol](../../contracts/registry/AuthenticatedProxy.sol)

User-owned proxy contract interfacing with a particular registry instance. Inherits **TokenRecipient**, **OwnedUpgradabilityStorage**.

#### OwnableDelegateProxy

[contracts/registry/OwnableDelegateProxy.sol](../../contracts/registry/OwnableDelegateProxy.sol)

Ownable delegate proxy contract with basic constructor logic for initial implementation. Inherits **OwnedUpgradeabilityProxy**.

##### Proxy

[contracts/registry/proxy/Proxy.sol](../../contracts/registry/proxy/Proxy.sol)

Delegatecall proxy contract.

##### OwnedUpgradeabilityProxy

[contracts/registry/proxy/OwnedUpgradeabilityProxy.sol](../../contracts/registry/proxy/OwnedUpgradeabilityProxy.sol)

Upgradeable proxy authorization control. Inherits **Proxy**, **OwnedUpgradeabilityStorage**.

##### OwnedUpgradeabilityStorage

[contracts/registry/proxy/OwnedUpgradeabilityStorage.sol](../../contracts/registry/proxy/OwnedUpgradeabilityStorage.sol)

Contract to track the owner of an upgradeable proxy.

#### TokenRecipient

[contracts/registry/TokenRecipient.sol](../../contracts/registry/TokenRecipient.sol)

Helper functions and events to enable a contract to receive tokens and Ether.

### WyvernAtomicizer

[contracts/WyvernAtomicizer.sol](../../contracts/WyvernAtomicizer.sol)

Library contract to sequence sub-calls atomically.

## Deployments

### Rinkeby

Wyvern v3.1 has been deployed to Ethereum Rinkeby (testnet). You can find all contract addresses in [config.json](../../config.json).

### Metropolis

Wyvern v3.1 has not yet been deployed on Ethereum Metropolis (mainnet).
