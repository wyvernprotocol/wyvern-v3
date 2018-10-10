#!/bin/sh

cd node_modules/openzeppelin-solidity
find . -type f -name "*.sol" -exec sed -i -e 's/\^0.4.24/>=0.4.24/g' {} +;
find . -type f -name "*.sol" -exec sed -i -e 's/bytes data/bytes memory data/g' {} +;
find . -type f -name "*.sol" -exec sed -i -e 's/bytes _data/bytes memory _data/g' {} +;
find . -type f -name "*.sol" -exec sed -i -e 's/account != 0/account != address(0)/g' {} +;
cd ../..
