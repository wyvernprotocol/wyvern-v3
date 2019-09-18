#!/bin/sh

set -x

yarn flatten

find ./temp -type f -name "*.sol" -exec sed -i -e 's/pragma solidity 0.5.11/pragma solidity 0.5.8/g' {} +;

for contract in $(ls temp/); do
  echo "Analyzing $contract with Slither..."
  echo "slither /opt/temp/$contract" | docker run -i -v $(pwd):/opt trailofbits/eth-security-toolbox
done
