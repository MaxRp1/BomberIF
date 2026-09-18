cd build

git init

git remote add origin https://github.com/MaxRp1/BomberIF.git

git checkout -b server

git add .

git commit -m "Deploy"

git push origin server --force
