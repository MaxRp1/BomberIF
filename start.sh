#!/bin/bash

PROJECT="$HOME/BomberIF"

echo "🚀 Iniciando BomberIF..."

# Backend
cd "$PROJECT/server"
echo "🔵 Iniciando backend..."
yarn dev > /tmp/bomberif-server.log 2>&1 &
SERVER_PID=$!

# Frontend
cd "$PROJECT/client"
echo "🟢 Iniciando frontend..."
yarn dev > /tmp/bomberif-client.log 2>&1 &
CLIENT_PID=$!

echo ""
echo "Backend PID: $SERVER_PID"
echo "Frontend PID: $CLIENT_PID"
echo ""
echo "Aguardando os servidores iniciarem..."

sleep 5

echo "🌐 Abrindo BomberIF..."

xdg-open "http://localhost:3000/BomberIF" >/dev/null 2>&1 &

echo ""
echo "BomberIF iniciado!"
echo "Pressione Ctrl+C para encerrar."

cleanup() {
    echo ""
    echo "🛑 Encerrando BomberIF..."

    kill $SERVER_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null

    echo "Servidores encerrados."
}

trap cleanup SIGINT SIGTERM

wait
