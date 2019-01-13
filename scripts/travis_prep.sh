#!/usr/bin/env bash

set -e

truffle version
yarn list
yarn lint
