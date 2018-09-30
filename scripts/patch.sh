#!/bin/sh

cd node_modules/openzeppelin-solidity
find . -type f -name "*.sol" -exec sed -i -e 's/\^0.4.24/>=0.4.24/g' {} +;
cd ../..
