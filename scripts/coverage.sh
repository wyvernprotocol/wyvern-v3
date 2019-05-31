#!/bin/sh

set -xe

rm -rf build temp

echo "Removing 'view' modifier..."

find ./contracts -type f -name "*.sol" -exec sed -i -e 's/view//g' {} +;

echo "Building ethereumjs-testrpc-sc..."

pushd node_modules/solidity-coverage
npm i
pushd node_modules/ethereumjs-testrpc-sc
npm i
npm run-script build
popd
popd

echo "Running solidity-coverage..."

./node_modules/.bin/solidity-coverage

echo "Uploading coverage information..."

cat coverage/lcov.info | ./node_modules/.bin/coveralls
