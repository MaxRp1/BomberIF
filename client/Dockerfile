# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim

WORKDIR /app/client

# Instala dependências primeiro para aproveitar o cache de camadas
COPY client/package.json client/yarn.lock ./
RUN yarn install --frozen-lockfile

# Código do cliente + módulos TypeScript compartilhados (alias "#/")
COPY client/ ./
COPY shared/ /app/shared/

ENV HOST=0.0.0.0 \
    PORT=3000 \
    BROWSER=none

EXPOSE 3000
CMD ["yarn", "dev"]
