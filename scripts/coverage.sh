#!/bin/sh

rm -rf build
./node_modules/.bin/solidity-coverage
cat coverage/lcov.info | ./node_modules/.bin/coveralls
