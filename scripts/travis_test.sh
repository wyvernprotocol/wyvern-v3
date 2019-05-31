#!/usr/bin/env bash

set -xe

pkill -f testrpc
set -e
sleep 2
yarn testrpc &
sleep 1
yarn test
