#!/bin/bash

set -e

echo "Gerando nova build..."
rm -rf build
yarn build

echo "Publicando no GitHub Pages..."
cd build

git init

git remote add origin https://github.com/MaxRp1/BomberIF.git

git checkout -b client

git add .

git commit -m "Deploy"

git push origin client --force

echo "Deploy concluído."
