#!/bin/sh

set -xe

rm -rf build temp

./node_modules/.bin/solidity-coverage
cat coverage/lcov.info | ./node_modules/.bin/coveralls
