#!/bin/sh

rm -rf build/contracts
yarn run truffle compile --offline
rm -f yarn-error.log
