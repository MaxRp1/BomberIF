# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build

WORKDIR /app/server

# Instala dependências primeiro para aproveitar o cache de camadas
COPY server/package.json server/yarn.lock ./
RUN yarn install --frozen-lockfile

# Código do servidor + módulos TypeScript compartilhados (alias "#/")
COPY server/ ./
COPY shared/ /app/shared/

# Gera um bundle único (express + socket.io + shared) em server/build/index.js
RUN yarn build

FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app/server
COPY --from=build /app/server/build ./build

EXPOSE 4000
CMD ["node", "build/index.js"]
