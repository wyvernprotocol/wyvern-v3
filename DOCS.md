## Table of contents

1. [Overview](#overview)
1. [Order schema](#order-schema)
1. [Composing an order](#composing-an-order)
  1. [Asserting calldata](#asserting-calldata)
    1. [Call](#call)
    1. [Countercall](#countercall)
  1. [Asserting state](#asserting-state)
  1. [Asserting metadata](#asserting-metadata)
  1. [Metadata](#metadata)
1. [Authorizing an order](#authorizing-an-order)
  1. [Signed message](#signed-message)
  1. [Pre-approval](#pre-approval)
  1. [Match-time approval](#match-time-approval)
1. [Matching orders](#matching-orders)
  1. [Constructing matching calldata](#constructing-matching-calldata)
  1. [Asymmetries](#asymmetries)
    1. [Call ordering](#call-ordering)
    1. [Special-cased Ether](#special-cased-ether)
  1. [Miscellaneous](#miscellaneous)

### Overview

Wyvern is a first-order decentralized exchange protocol. Comparable existing protocols such as [Etherdelta](), [0x](), and [Dexy]() are zeroeth-order: each order specifies a desired trade of two discrete assets (generally two tokens in a particular ratio and a maximmum amount). Wyvern orders instead specify predicates over state transitions: an order is a function mapping a call made by the maker, a call made by the counterparty, and order metadata to a boolean (whether or not the order will match). These predicates are arbitrary - any asset or any combination of assets representable on Ethereum can be exchanged with a Wyvern order - and indeed, Wyvern can instantiate all the aforementioned protocols.

advantages: match

disadvantages: not (quite) as developer-friendly

example orders

### Order schema

### Composing an order

#### Asserting calldata

bulk of the logic is in constructing the predicate

##### Call

the call the maker executes

##### Countercall

the call the counterparty executes

#### Asserting state

instead assert that you own some asset

#### Metadata

listing time, expiration time, special-case ether

### Authorizing an order


#### Signed message

most common method, no cost unless executed

#### Pre-approval

send a transaction from the maker address with the hash

#### Match-time approval

approve in effect by matching

### Matching orders

#### Constructing matching calldata

done off-chain

#### Asymmetries

##### Call ordering

first order executes first

##### Special-cased Ether

special-cased ether sent by matcher

#### Miscellaneous

- Orders cannot be self-matched; however, two separate orders from the same maker can be matched with each other.
