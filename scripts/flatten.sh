#!/bin/sh

set -ex

rm -rf temp
mkdir -p temp

alias flatten="yarn run truffle-flattener"

flatten contracts/WyvernAtomicizer.sol --output temp/WyvernAtomicizer.sol
flatten contracts/WyvernRegistry.sol --output temp/WyvernRegistry.sol
flatten contracts/WyvernExchange.sol --output temp/WyvernExchange.sol
flatten contracts/WyvernStatic.sol --output temp/WyvernStatic.sol
