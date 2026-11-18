import { Router } from 'express'
import { Server } from 'socket.io'

const router = Router()

export default (io:Server) => {
  // Endpoint de diagnóstico, habilitado apenas ao iniciar o servidor
  // com yarn dev. Identifica o backend para evitar misturar versões.
  if (process.env.dev) {
    router.get('/debug/virus', (_request, response) => {
      return response.json({
        feature: 'lab-linear-virus',
        version: 'diagnostic-v3-2026-11-18',
        stage: 0,
        buff: 3,
        virusMs: 10000
      })
    })
  }

  router.get('/players/count', (request, response) => {
    return response.send(io.engine.clientsCount.toString())
  })
  return router
}