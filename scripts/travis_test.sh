#!/usr/bin/env bash

set -e

pkill -f testrpc
sleep 2
yarn testrpc &
sleep 1
yarn test
