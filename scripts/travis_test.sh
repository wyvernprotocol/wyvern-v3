#!/usr/bin/env bash

set -x

pkill -f testrpc

set -e
sleep 2
yarn testrpc &
sleep 1
yarn test
