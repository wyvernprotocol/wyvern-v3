Wyvern Protocol v3.0 "Ancalagon" Audit Specification
----------------------------------------------------

### Table of Contents

1. [Overview](#overview)
    1. [Version 3 Note](#version-3-note)
1. [Contracts](#contracts)
    1. [WyvernExchange](#wyvernexchange)
        1. [ExchangeCore](#exchangecore)
            1. [ReentrancyGuarded](#reentrancyguarded)
            1. [StaticCaller](#staticcaller)
        1. [Exchange](#exchange)
    1. [WyvernRegistry](#wyvernregistry)
        1. [ProxyRegistryInterface](#proxyregistryinterface)
        1. [ProxyRegistry](#proxyregistry)
        1. [AuthenticatedProxy](#authenticatedproxy)
        1. [OwnableDelegateProxy](#ownabledelegateproxy)
            1. [OwnedUpgradabilityProxy](#ownedupgradabilityproxy)
            1. [OwnedUpgradabilityStorage](#ownedupgradabilitystorage)
            1. [Proxy](#proxy)
        1. [TokenRecipient](#tokenrecipient)
    1. [WyvernAtomicizer](#wyvernatomicizer)
    1. [WyvernStatic](#wyvernstatic)
1. [Deployments](#deployments)
    1. [Rinkeby](#rinkeby)
    1. [Metropolis](#metropolis)

### Overview

#### Version 3 Note

This is version 3 of the Wyvern Protocol, which comprises substantial changes from [version 2.2](https://github.com/projectwyvern/wyvern-ethereum).

Version 2 of the protocol is operating live on the Ethereum mainnet — you may have heard of the most popular relayer, [OpenSea](https://opensea.io) — and has been used to trade assets ranging from digital kittens to bundles of virtual playing cards to smart contracts.

If you previously audited version 2.2, [the v3 design spec](../DESIGN.md) provides an overview of the changeset and development rationale.

### Contracts

#### WyvernExchange

##### ExchangeCore

###### ReentrancyGuarded

###### StaticCaller

##### Exchange

#### WyvernRegistry

##### ProxyRegistryInterface

##### ProxyRegistry

##### AuthenticatedProxy

##### OwnableDelegateProxy

###### OwnedUpgradeabilityProxy

###### OwnedUpgradeabilityStorage

###### Proxy

##### TokenRecipient

#### WyvernAtomicizer

#### WyvernStatic

### Deployments

#### Rinkeby

Wyvern v3 has been deployed to Ethereum Rinkeby (testnet). You can find all contract addresses in [config.json](../config.json).

#### Metropolis

Wyvern v3 has not yet been deployed on Ethereum Metropolis (mainnet).
