#!/bin/sh

set -x

rm -rf build temp

echo "Removing 'view' modifier..."

cp -r contracts _contracts
find ./contracts -type f -name "*.sol" -exec sed -i -e 's/view//g' {} +;

echo "Running solidity-coverage..."

./node_modules/.bin/solidity-coverage

echo "Uploading coverage information..."

cat coverage/lcov.info | ./node_modules/.bin/coveralls

echo "Restoring contracts..."
rm -rf contracts
mv _contracts contracts
