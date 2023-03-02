#!/usr/bin/env bash

set -e
set -x

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
ROOT_DIR="${DIR}/.."
cd "$ROOT_DIR"

npm run clean
npm run install
npm run tsc
npm run build

cp package.json target
cp riff-raff.yaml target
cp cfn.json target

pushd target
  npm install --production
popd

cd target

zip -FSr "${ROOT_DIR}/contributions-referrals.zip" ./*
