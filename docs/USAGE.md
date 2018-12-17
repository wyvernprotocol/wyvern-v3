## Table of Contents

1. [Overview](#overview)
1. [Order schema](#order-schema)
1. [Composing an order](#composing-an-order)
    1. [Asserting calldata](#asserting-calldata)
        1. [Call](#call)
        1. [Countercall](#countercall)
    1. [Asserting state](#asserting-state)
    1. [Asserting metadata](#asserting-metadata)
    1. [Metadata](#metadata)
    1. [Generalized partial fill](#generalized-partial-fill)
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
        1. [Self-matching](#self-matching)

### Overview

Wyvern is a first-order decentralized exchange protocol. Comparable existing protocols such as [Etherdelta](https://github.com/etherdelta/smart_contract), [0x](https://github.com/0xProject/0x-monorepo), and [Dexy](https://github.com/DexyProject/protocol) are zeroeth-order: each order specifies a desired trade of two discrete assets (generally two tokens in a particular ratio and a maximmum amount). Wyvern orders instead specify predicates over state transitions: an order is a function mapping a call made by the maker, a call made by the counterparty, and order metadata to a boolean (whether or not the order will match). These predicates are arbitrary - any asset or any combination of assets representable on Ethereum can be exchanged with a Wyvern order - and indeed, Wyvern can instantiate all the aforementioned protocols.

Advantages
  - Extremely flexible: can express any orders simpler protocols can express, and many they cannot
  - Near-optimally gas-efficient: most gas consumption is in the actual calls and in the calldata predicates
  - Security-conducive: constituent protocol components are isolated, core protocol is minimal

Disadvantages
  - Not (quite) as developer-friendly; a bit easier to misuse
  - Not as well-supported by user-level tooling (e.g. Metamask displaying signed messages)

### Order schema

```c
struct Order {
    address registry;
    address maker;
    address staticTarget;
    bytes staticExtradata;
    uint maximumFill;
    uint listingTime;
    uint expirationTime;
    uint salt;
}
```

| Name            | Type    | Purpose                                                        |
| --------------- | ------- | ---------------------------------------------------------------|
| registry        | address | Version the order to a particular registry contract            |
| maker           | address | Order maker, who will execute the call                         |
| staticTarget    | address | Target address for predicate function                          |
| staticExtradata | bytes   | Extra data for predicate function                              |
| maximumFill     | uint    | Maximum fill, after which the order cannot be matched          |
| listingTime     | uint    | Order listing time, before which the order cannot be matched   |
| expirationTime  | uint    | Order expiration time, after which the order cannot be matched |
| salt            | uint    | Order salt for hash deduplication                              |

All fields are signed over.

### Constructing an order

#### Asserting calldata

The bulk of a logic in an order is in constructing the predicate over the call and countercall.

##### Call

The first call is executed by the maker of the order.

##### Countercall

The second call is executed by the counterparty.

#### Asserting state

Static calls are executed *after* the calls (the whole transaction is reverted if the static call fails), so instead of asserting properties of the calldata, you can assert that particular state has changed - e.g. that an account now owns some asset.

#### Metadata

Metadata contains order listing time, order expiration time, counterorder listing time, Ether passed in the call (if any), and current order fill value.

#### Generalized Partial Fill

Orders sign over a maximum fill, and static calls return a uint, which specifies the updated fill value if the order is matched.

### Authorizing an order

Orders must always be authorized by the `maker` address.

#### Signed message

The most common method of authorizing an order is to sign the order hash off-chain.

#### Pre-approval

Alternatively, an order can be authorized by sending a transaction.

#### Match-time approval

Finally, an order can be constructed on the fly (likely to match an existing previously signed or approved order) and authorized at match time simply by sending the match transaction from the order's `maker` address.

### Matching orders

#### Constructing matching calldata

Matching calldata can be constructed in any fashion off-chain. The protocol does not care how the final calldata is obtained, only that it fulfills the orders' predicate functions.

#### Asymmetries

To the extent possible, the protocol is designed to be symmetric, such that orders need not be on any particular "side" and restrict themselves to matching with orders on the other "side".

##### Call ordering

The first asymmetry is ordering. One call must be executed first, and executing that call might change the result of the second call. The first call passed into `atomicMatch` is executed first.

##### Special-cased Ether

The second asymmetry is special-cased Ether. Due to Ethereum design limitations, Ether is a wired-in asset (unlike ERC20 tokens) which can only be sent from an account by a transaction from said account. To facilitate ease-of-use, Wyvern supports special-case Ether to the maximum extent possible: the matcher of an order may elect to pass value along with the match transaction, which is then transferred to the counterparty and passed as a parameter to the predicate function (which can assert e.g. that a particular amount was sent).

#### Miscellaneous

##### Self-matching

Orders cannot be self-matched; however, two separate orders from the same maker can be matched with each other.
