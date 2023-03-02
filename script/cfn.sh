#!/usr/bin/env bash

set -e
set -x

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
ROOT_DIR="${DIR}/.."
cd "$ROOT_DIR/cdk"

npm run install
npm run tsc
npm run lint
npm run test
npm run synth
