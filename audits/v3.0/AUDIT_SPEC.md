# Wyvern Protocol v3.0 "Ancalagon" Audit Specification

## Table of Contents

1. [Overview](#overview)
    1. [Version 3 Note](#version-3-note)
1. [Contracts](#contracts)
    1. [WyvernExchange](#wyvernexchange)
        1. [Exchange](#exchange)
        1. [ExchangeCore](#exchangecore)
            1. [ReentrancyGuarded](#reentrancyguarded)
            1. [StaticCaller](#staticcaller)
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
    1. [WyvernStatic](#wyvernstatic)
1. [Deployments](#deployments)
    1. [Rinkeby](#rinkeby)
    1. [Metropolis](#metropolis)

## Overview

This is version 3 of the Wyvern decentralized exchange protocol, designed to maximize the ease of positive-utility-sum multiparty transactions on a distributed ledger.

You may find the [usage documentation](../../docs/USAGE.md) conducive to understanding the intended functionality of the protocol.

Only the core protocol contracts are in scope of audit, since auxiliary library contracts for static callbacks are not relevant to the correctness of the protocol and are the responsibility of the user.

### Version 3 Note

Version 3 of the Wyvern Protocol comprises substantial changes from [version 2.2](https://github.com/projectwyvern/wyvern-ethereum).

Version 2 of the protocol is operating live on the Ethereum mainnet — you may have heard of the most popular relayer, [OpenSea](https://opensea.io) — and has been used to trade assets ranging from digital kittens to bundles of virtual playing cards to smart contracts.

If you previously audited version 2.2, [the v3 design spec](../../docs/DESIGN.md) provides an overview of the changeset and development rationale.

## Contracts

Contracts not in this list (`WyvernStatic` and its dependencies) do not need to be audited, although you may find a quick read instructive to analysis of the core protocol.

### WyvernExchange

[contracts/WyvernExchange.sol](../../contracts/WyvernExchange.sol)

#### Exchange

[contracts/lib/Exchange.sol](../../contracts/lib/Exchange.sol)

#### ExchangeCore

[contracts/exchange/ExchangeCore.sol](../../contracts/exchange/ExchangeCore.sol)

##### ReentrancyGuarded

[contracts/lib/ReentrancyGuarded.sol](../../contracts/lib/ReentrancyGuarded.sol)

##### StaticCaller

[contracts/lib/StaticCaller.sol](../../contracts/lib/StaticCaller.sol)

### WyvernRegistry

[contracts/WyvernRegistry.sol](../../contracts/WyvernRegistry.sol)

#### ProxyRegistryInterface

[contracts/registry/ProxyRegistryInterface.sol](../../contracts/registry/ProxyRegistryInterface.sol)

#### ProxyRegistry

[contracts/registry/ProxyRegistry.sol](../../contracts/registry/ProxyRegistry.sol)

#### AuthenticatedProxy

[contracts/registry/AuthenticatedProxy.sol](../../contracts/registry/AuthenticatedProxy.sol)

#### OwnableDelegateProxy

[contracts/registry/OwnableDelegateProxy.sol](../../contracts/registry/OwnableDelegateProxy.sol)

##### Proxy

[contracts/registry/proxy/Proxy.sol](../../contracts/registry/proxy/Proxy.sol)

##### OwnedUpgradeabilityProxy

[contracts/registry/proxy/OwnedUpgradabilityProxy.sol](../../contracts/registry/proxy/OwnedUpgradabilityProxy.sol)

##### OwnedUpgradeabilityStorage

[contracts/registry/proxy/OwnedUpgradabilityStorage.sol](../../contracts/registry/proxy/OwnedUpgradabilityStorage.sol)

#### TokenRecipient

[contracts/registry/TokenRecipient.sol](../../contracts/registry/TokenRecipient.sol)

### WyvernAtomicizer

[contracts/WyvernAtomicizer.sol](../../contracts/WyvernAtomicizer.sol)

## Deployments

### Rinkeby

Wyvern v3 has been deployed to Ethereum Rinkeby (testnet). You can find all contract addresses in [config.json](../../config.json).

### Metropolis

Wyvern v3 has not yet been deployed on Ethereum Metropolis (mainnet).
