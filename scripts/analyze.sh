#!/bin/sh

set -ex

yarn flatten

alias myth="docker run -v $(pwd):/opt mythril/myth"
# alias oyente="docker run -v $(pwd):/opt luongnguyen/oyente /oyente/oyente/oyente.py"

for contract in $(ls temp/); do
  echo "Analyzing $contract with Mythril..."
  myth -x /opt/temp/$contract
  # echo "Analyzing $contract with Oyente..."
  # oyente -s /opt/temp/$contract
done
