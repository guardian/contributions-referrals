#!/usr/bin/env bash

set -e
set -x

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
ROOT_DIR="${DIR}/.."
cd "$ROOT_DIR"

yarn clean
yarn install
yarn tsc
yarn build

cp package.json target
cp riff-raff.yaml target
cp cfn.yaml target

pushd target
  yarn install --production
popd

cd target

zip -FSr "${ROOT_DIR}/contributions-referrals.zip" ./*
